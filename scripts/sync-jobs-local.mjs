import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const secretsDirectory = join(repoRoot, 'secrets');
let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || join(secretsDirectory, 'service-account.json');

if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
  try {
    await readFile(keyPath, 'utf8');
  } catch {
    const candidates = (await readdir(secretsDirectory)).filter((name) => /service-account.*\.json$/i.test(name));
    if (candidates.length === 1) keyPath = join(secretsDirectory, candidates[0]);
  }
}

try {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = await readFile(keyPath, 'utf8');
} catch {
  throw new Error('No unique service-account key was found in the secrets directory.');
}

await import('./sync-jobs.mjs');
