# Secure reusable Google Sheets jobs board

The Google Sheet stays private. A read-only Google Apps Script web app runs as the Sheet owner and returns only rows whose `job listed` checkbox is checked. The website never receives the Google service-account key and cannot read unchecked rows, edit the Sheet, or access other Drive files.

The public feed contains only the vacancy fields that are deliberately shown on the public website: title, sector, location, workplace, employment type, hours, salary, dates, job details, application email and application phone.

## Sheet format

Keep these headers in row 1:

```text
title, sector, location, workplace, employment_type, hours, salary, posted_date, closing_date, job details, email, phone, job listed
```

- Use one vacancy per row.
- Make `job listed` a checkbox. Checked means public; unchecked means private.
- Put the complete role content in `job details`, using line breaks or `|` between paragraphs.
- Missing or unusually formatted optional fields do not prevent a checked job from appearing.
- The title and location generate the dedicated job URL automatically.

## One-time setup for this Sheet

1. Open the private Google Sheet.
2. Select **Extensions > Apps Script**.
3. Replace the editor contents with `jobs-board/apps-script/Code.gs` from this project and save it.
4. Select **Deploy > New deployment**.
5. Select **Web app** as the deployment type.
6. Set **Execute as** to **Me**.
7. Set **Who has access** to **Anyone**. This makes only the filtered web-app response callable; it does not share the Sheet.
8. Select **Deploy**, approve the requested read-only Sheet access, and copy the web-app URL ending in `/exec`.
9. Paste that URL into `vacancies/jobs-runtime-config.js` as `apiUrl`.

The vacancies page checks the feed every 10 seconds while open. Sheet edits do not require a website rebuild or redeployment.

## Per-client setup

1. Give the client a copy of the master Sheet with the bound Apps Script.
2. The client deploys its script once from its own Google account using the settings above.
3. Put its `/exec` URL in that client's `vacancies/jobs-runtime-config.js`.
4. Deploy the website.

Each client owns their private Sheet and the Apps Script authorization. No client needs Google Cloud, a service account or a JSON key.

## Files

- `jobs-board/apps-script/Code.gs`: secure server-side Sheet reader.
- `vacancies/jobs-runtime-config.js`: the only per-client website setting.
- `assets/js/jobs-source.js`: loads the private feed with JSONP, including from `file://` pages.
- `assets/js/jobs-list.js`: renders and filters vacancy cards.
- `vacancies/job.html?job=generated-slug`: reusable dedicated vacancy page.
- `assets/js/job-detail.js`: renders the selected live vacancy.

The scripts in `scripts/` are optional static-export tooling and are not used by the live vacancies page.
