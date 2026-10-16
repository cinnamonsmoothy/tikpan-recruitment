# Deployment

The public website is deployed to GitHub Pages by `.github/workflows/deploy-pages.yml`.
The workflow builds `dist-pages` from public website files only, so local credentials,
backend source, development scripts, and generated vacancy snapshots are never included
in the Pages artifact.

The Google service-account key is not needed by GitHub Pages or its deployment workflow.
The live jobs API holds that credential as a protected runtime secret and exposes only
vacancies whose `job listed` checkbox is checked. Local key files remain ignored through
the repository's `.gitignore` rules.
