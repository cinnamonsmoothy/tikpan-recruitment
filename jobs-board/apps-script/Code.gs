var JOBS_SHEET_NAME = 'Jobs';

function normaliseHeader_(value) {
  return String(value || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function slugify_(value) {
  return String(value || '').toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isListed_(value) {
  return ['true', 'yes', '1', 'checked'].indexOf(String(value || '').trim().toLowerCase()) !== -1;
}

function makeSummary_(value) {
  var parts = String(value || '').split(/\r?\n|\|/);
  var first = '';
  for (var index = 0; index < parts.length; index += 1) {
    if (parts[index].trim()) {
      first = parts[index].trim();
      break;
    }
  }
  return first.length > 180 ? first.slice(0, 177).trim() + '\u2026' : first;
}

function publicJobs_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('This script must be attached to the jobs spreadsheet.');
  var sheet = spreadsheet.getSheetByName(JOBS_SHEET_NAME);
  if (!sheet) throw new Error('Missing sheet tab: ' + JOBS_SHEET_NAME);

  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  var headers = values[0].map(normaliseHeader_);
  var usedSlugs = {};
  var jobs = [];

  values.slice(1).forEach(function (row, rowIndex) {
    var item = {};
    headers.forEach(function (header, columnIndex) {
      if (header) item[header] = String(row[columnIndex] || '').trim();
    });
    if (!isListed_(item.job_listed)) return;

    var title = item.title || 'Vacancy ' + (rowIndex + 1);
    var location = item.location || 'Location TBC';
    var details = item.job_details || 'Contact us for more information about this vacancy.';
    var baseSlug = slugify_(title + '-' + location) || 'vacancy-' + (rowIndex + 1);
    usedSlugs[baseSlug] = (usedSlugs[baseSlug] || 0) + 1;
    var slug = usedSlugs[baseSlug] === 1 ? baseSlug : baseSlug + '-' + usedSlugs[baseSlug];

    jobs.push({
      id: slug,
      slug: slug,
      title: title,
      sector: item.sector || 'General',
      location: location,
      workplace: item.workplace || '',
      employmentType: item.employment_type || '',
      hours: item.hours || '',
      salaryDisplay: item.salary || '',
      postedDate: item.posted_date || '',
      closingDate: item.closing_date || '',
      summary: makeSummary_(details),
      details: details,
      email: item.email || '',
      phone: item.phone || '',
      detailUrl: 'job.html?job=' + encodeURIComponent(slug)
    });
  });

  return jobs;
}

function doGet(request) {
  var callback = String((request && request.parameter && request.parameter.callback) || 'receiveJobs');
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) callback = 'receiveJobs';

  var response;
  try {
    response = {
      ok: true,
      generatedAt: new Date().toISOString(),
      jobs: publicJobs_()
    };
  } catch (error) {
    response = { ok: false, error: 'Vacancies are temporarily unavailable.' };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(response) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
