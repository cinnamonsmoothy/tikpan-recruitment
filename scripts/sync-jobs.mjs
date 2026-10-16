import { createSign } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(repoRoot, 'jobs-board', 'config.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const isSample = args.has('--sample');
const isDryRun = args.has('--dry-run');
const detailRoot = join(repoRoot, 'vacancies', 'jobs');
const listingPath = join(repoRoot, 'vacancies', 'jobs.json');
const localDataPath = join(repoRoot, 'vacancies', 'jobs-data.js');
const manifestPath = join(repoRoot, 'jobs-board', '.generated-jobs.json');

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normaliseHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function splitList(value) {
  return String(value || '').split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean);
}

function textParagraphs(value) {
  return splitList(value).map((item) => `<p>${escapeHtml(item)}</p>`).join('\n');
}

function makeSummary(value) {
  const firstParagraph = splitList(value)[0] || '';
  return firstParagraph.length > 180 ? `${firstParagraph.slice(0, 177).trimEnd()}…` : firstParagraph;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function normaliseDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  let year;
  let month;
  let day;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [, year, month, day] = match;
  } else {
    match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (match) {
      [, day, month, year] = match;
    } else {
      const numeric = Number(text);
      const parsed = Number.isFinite(numeric) && numeric > 20000 && numeric < 80000
        ? new Date(Date.UTC(1899, 11, 30 + numeric))
        : new Date(text);
      return Number.isNaN(parsed.valueOf()) ? '' : parsed.toISOString().slice(0, 10);
    }
  }
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === iso ? iso : '';
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

async function getServiceAccountToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    encodeBase64Url(JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    }))
  ].join('.');
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, 'base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error(`Google OAuth failed (${response.status}): ${await response.text()}`);
  return (await response.json()).access_token;
}

function readCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
      ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8')
      : '');
  return raw ? JSON.parse(raw) : null;
}

async function fetchSheetRows() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || config.spreadsheetId;
  if (!spreadsheetId) throw new Error('Set spreadsheetId in jobs-board/config.json or provide GOOGLE_SHEETS_ID.');
  const range = process.env.GOOGLE_SHEETS_RANGE || config.sheetRange;
  const credentials = readCredentials();
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!credentials && !apiKey) {
    throw new Error('Set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (recommended) or GOOGLE_SHEETS_API_KEY.');
  }
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`);
  if (apiKey && !credentials) url.searchParams.set('key', apiKey);
  const headers = { Accept: 'application/json' };
  if (credentials) headers.Authorization = `Bearer ${await getServiceAccountToken(credentials)}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Google Sheets API failed (${response.status}): ${await response.text()}`);
  const values = (await response.json()).values || [];
  if (values.length < 2) return [];
  const headersRow = values[0].map(normaliseHeader);
  return values.slice(1).map((row) => Object.fromEntries(headersRow.map((header, index) => [header, row[index] ?? ''])));
}

async function loadRows() {
  if (isSample) {
    return JSON.parse(await readFile(join(repoRoot, 'jobs-board', 'fixtures', 'jobs.sample.json'), 'utf8'));
  }
  return fetchSheetRows();
}

function normaliseJob(raw, index) {
  const job = Object.fromEntries(Object.entries(raw).map(([key, value]) => [normaliseHeader(key), String(value ?? '').trim()]));
  job.title = job.title || `Vacancy ${index + 1}`;
  job.sector = job.sector || 'General';
  job.location = job.location || 'Location TBC';
  job.job_details = job.job_details || 'Contact us for more information about this vacancy.';
  job.slug = slugify(`${job.title}-${job.location}`);
  job.job_listed = ['true', 'yes', '1', 'checked'].includes(job.job_listed.toLowerCase());
  job.summary = makeSummary(job.job_details);
  job.posted_date_display = job.posted_date;
  job.closing_date_display = job.closing_date;
  job.posted_date = normaliseDate(job.posted_date);
  job.closing_date = normaliseDate(job.closing_date);
  return job;
}

function validateJobs(rows) {
  const jobs = rows.map(normaliseJob).filter((job) => job.job_listed);
  const active = jobs;
  const slugs = new Set();
  for (const job of active) {
    const baseSlug = slugPattern.test(job.slug) ? job.slug : `vacancy-${slugs.size + 1}`;
    job.slug = baseSlug;
    let suffix = 2;
    while (slugs.has(job.slug)) job.slug = `${baseSlug}-${suffix++}`;
    slugs.add(job.slug);
  }
  return active.sort((a, b) => b.posted_date.localeCompare(a.posted_date));
}

function applicationHref(job) {
  const email = job.email || config.defaultApplicationEmail;
  if (email && email !== 'YOUR_EMAIL_HERE') {
    return `mailto:${email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`;
  }
  if (job.phone) return `tel:${job.phone.replace(/[^+\d]/g, '')}`;
  return '../../../index.html#contact';
}

function publicJob(job) {
  return {
    id: job.slug,
    slug: job.slug,
    title: job.title,
    sector: job.sector,
    location: job.location,
    workplace: job.workplace,
    employmentType: job.employment_type,
    hours: job.hours,
    salaryDisplay: job.salary,
    summary: job.summary,
    details: job.job_details,
    email: job.email,
    phone: job.phone,
    postedDate: job.posted_date || job.posted_date_display,
    closingDate: job.closing_date || job.closing_date_display,
    detailUrl: `jobs/${job.slug}/index.html`
  };
}

function structuredJob(job) {
  const siteUrl = (process.env.SITE_URL || config.siteUrl || '').replace(/\/$/, '');
  const data = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.job_details,
    datePosted: job.posted_date,
    validThrough: job.closing_date || undefined,
    employmentType: job.employment_type ? job.employment_type.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_') : undefined,
    hiringOrganization: { '@type': 'Organization', name: config.hiringOrganizationName },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location, addressCountry: config.defaultCountry } },
    url: siteUrl ? `${siteUrl}/vacancies/jobs/${job.slug}/` : undefined
  };
  return JSON.stringify(data, (_, value) => value === undefined ? undefined : value).replaceAll('<', '\\u003c');
}

function detailPage(job) {
  const meta = [job.location, job.employment_type, job.workplace, job.salary].filter(Boolean)
    .map((value) => `<span>${escapeHtml(value)}</span>`).join('');
  const facts = [
    ['Sector', job.sector], ['Location', job.location], ['Workplace', job.workplace],
    ['Job type', job.employment_type], ['Hours', job.hours], ['Salary', job.salary],
    ['Posted', job.posted_date ? formatDate(job.posted_date) : job.posted_date_display],
    ['Closing date', job.closing_date ? formatDate(job.closing_date) : job.closing_date_display],
    ['Email', job.email], ['Phone', job.phone]
  ].filter(([, value]) => value).map(([label, value]) =>
    `<div class="job-fact"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('\n');
  const siteUrl = (process.env.SITE_URL || config.siteUrl || '').replace(/\/$/, '');
  const canonical = siteUrl ? `<link rel="canonical" href="${escapeHtml(`${siteUrl}/vacancies/jobs/${job.slug}/`)}">` : '';
  const description = job.summary || `${job.title} vacancy from ${config.brandName}.`;
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(job.title)} | ${escapeHtml(config.brandName)}</title>${canonical}
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../../assets/css/pages.css?v=19"><link rel="stylesheet" href="../../../assets/css/jobs.css?v=1">
  <link rel="stylesheet" href="../../../assets/css/site-layout-v24.css" data-site-layout><link rel="stylesheet" href="../../../assets/css/site-header.css?v=21" data-site-header-styles>
  <script src="../../../assets/js/site-header.js?v=22" defer></script>
  <script type="application/ld+json">${structuredJob(job)}</script>
</head><body>
  <header data-site-header data-root="../../../"></header>
  <main>
    <section class="page-hero job-detail-hero"><div class="container"><div class="label">${escapeHtml(job.sector)}</div><h1>${escapeHtml(job.title)}</h1><div class="job-detail-meta">${meta}</div></div></section>
    <section class="section"><div class="container"><a class="job-back" href="../../index.html">← All vacancies</a><div class="job-detail-layout">
      <article class="job-detail-content"><h2>About the role</h2>${textParagraphs(job.job_details)}</article>
      <aside class="job-summary-card"><h2>Role overview</h2>${facts}<a class="button job-apply" href="${escapeHtml(applicationHref(job))}">Apply for this role <span aria-hidden="true">↗</span></a></aside>
    </div></div></section>
  </main>
  <footer class="footer" data-site-footer data-root="../../../"></footer><script src="../../../assets/js/site-footer.js?v=19"></script>
</body></html>`;
}

async function safelyClearGeneratedPages() {
  let previous = [];
  try { previous = JSON.parse(await readFile(manifestPath, 'utf8')).slugs || []; } catch {}
  for (const slug of previous) {
    if (!slugPattern.test(slug)) continue;
    const target = resolve(detailRoot, slug);
    const withinDetails = relative(detailRoot, target) === slug && !isAbsolute(relative(detailRoot, target)) && !relative(detailRoot, target).startsWith(`..${sep}`);
    if (withinDetails) await rm(target, { recursive: true, force: true });
  }
}

const jobs = validateJobs(await loadRows());
if (isDryRun) {
  for (const job of jobs) {
    const html = detailPage(job);
    if (!html.includes('application/ld+json') || !html.includes('JobPosting') || !html.includes(job.title)) {
      throw new Error(`Detail-page rendering failed for ${job.slug}.`);
    }
  }
  console.log(`Validated ${jobs.length} listed job${jobs.length === 1 ? '' : 's'} successfully.`);
  process.exit(0);
}

await mkdir(detailRoot, { recursive: true });
await safelyClearGeneratedPages();
for (const job of jobs) {
  const directory = join(detailRoot, job.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), detailPage(job), 'utf8');
}
const listingData = { generatedAt: new Date().toISOString(), jobs: jobs.map(publicJob) };
await writeFile(listingPath, `${JSON.stringify(listingData, null, 2)}\n`, 'utf8');
await writeFile(localDataPath, `window.JOBS_BOARD_DATA = ${JSON.stringify(listingData).replaceAll('<', '\\u003c')};\n`, 'utf8');
await writeFile(manifestPath, `${JSON.stringify({ slugs: jobs.map((job) => job.slug) }, null, 2)}\n`, 'utf8');
console.log(`Generated ${jobs.length} vacancy page${jobs.length === 1 ? '' : 's'}.`);
