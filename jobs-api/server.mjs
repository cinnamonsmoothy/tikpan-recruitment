import { createSign } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(fileURLToPath(import.meta.url));
const clients = JSON.parse(await readFile(join(apiRoot, 'clients.json'), 'utf8'));
const port = Number(process.env.PORT || 8080);
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function normaliseHeader(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isListed(value) {
  return ['true', 'yes', '1', 'checked'].includes(String(value || '').trim().toLowerCase());
}

function makeSummary(value) {
  const first = String(value || '').split(/\r?\n|\|/).map((part) => part.trim()).find(Boolean) || '';
  return first.length > 180 ? `${first.slice(0, 177).trim()}\u2026` : first;
}

function publicJobs(values) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = values[0].map(normaliseHeader);
  const usedSlugs = new Map();

  return values.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
    .filter((item) => isListed(item.job_listed))
    .map((item, index) => {
      const title = String(item.title || '').trim() || `Vacancy ${index + 1}`;
      const location = String(item.location || '').trim() || 'Location TBC';
      const details = String(item.job_details || '').trim() || 'Contact us for more information about this vacancy.';
      const baseSlug = slugify(`${title}-${location}`) || `vacancy-${index + 1}`;
      const occurrence = (usedSlugs.get(baseSlug) || 0) + 1;
      usedSlugs.set(baseSlug, occurrence);
      const slug = occurrence === 1 ? baseSlug : `${baseSlug}-${occurrence}`;

      return {
        id: slug,
        slug,
        title,
        sector: String(item.sector || '').trim() || 'General',
        location,
        workplace: String(item.workplace || '').trim(),
        employmentType: String(item.employment_type || '').trim(),
        hours: String(item.hours || '').trim(),
        salaryDisplay: String(item.salary || '').trim(),
        postedDate: String(item.posted_date || '').trim(),
        closingDate: String(item.closing_date || '').trim(),
        summary: makeSummary(details),
        details,
        email: String(item.email || '').trim(),
        phone: String(item.phone || '').trim(),
        detailUrl: `job.html?job=${encodeURIComponent(slug)}`
      };
    });
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function serviceAccountToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    base64url(JSON.stringify({
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
  if (!response.ok) throw new Error(`OAuth request failed with ${response.status}`);
  const data = await response.json();
  cachedTokenExpiresAt = Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000;
  return data.access_token;
}

async function metadataToken() {
  const response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' }
  });
  if (!response.ok) throw new Error(`Metadata token request failed with ${response.status}`);
  const data = await response.json();
  cachedTokenExpiresAt = Date.now() + Math.max(60, Number(data.expires_in || 3600) - 60) * 1000;
  return data.access_token;
}

async function accessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (inline || keyPath) {
    const credentials = JSON.parse(inline || await readFile(keyPath, 'utf8'));
    cachedToken = await serviceAccountToken(credentials);
  } else {
    cachedToken = await metadataToken();
  }
  return cachedToken;
}

async function fetchJobs(client) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(client.spreadsheetId)}/values/${encodeURIComponent(client.range)}`);
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${await accessToken()}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Sheets request failed with ${response.status}`);
  return publicJobs((await response.json()).values || []);
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function send(res, status, payload, callback) {
  const json = safeJson(payload);
  const body = callback ? `${callback}(${json});` : json;
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Type': callback ? 'application/javascript; charset=utf-8' : 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/health') {
    send(res, 200, { ok: true });
    return;
  }

  const match = url.pathname.match(/^\/jobs\/([a-z0-9-]+)$/);
  const callbackValue = url.searchParams.get('callback') || '';
  const callback = /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callbackValue) ? callbackValue : '';
  if (!match || !clients[match[1]]) {
    send(res, 404, { ok: false, error: 'Jobs feed not found.' }, callback);
    return;
  }

  try {
    const jobs = await fetchJobs(clients[match[1]]);
    send(res, 200, { ok: true, generatedAt: new Date().toISOString(), jobs }, callback);
  } catch (error) {
    console.error('Jobs feed failed:', error.message);
    send(res, 503, { ok: false, error: 'Vacancies are temporarily unavailable.' }, callback);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Jobs API listening on port ${port}`);
});
