import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'dist-pages');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const directory of ['about', 'assets', 'sectors']) {
  await cp(join(projectRoot, directory), join(outputRoot, directory), { recursive: true });
}

await mkdir(join(outputRoot, 'vacancies'), { recursive: true });
for (const filename of ['index.html', 'job.html', 'jobs-runtime-config.js']) {
  await cp(
    join(projectRoot, 'vacancies', filename),
    join(outputRoot, 'vacancies', filename),
  );
}

for (const filename of ['index.html', 'tikpan-logo.PNG']) {
  await cp(join(projectRoot, filename), join(outputRoot, filename));
}

await writeFile(join(outputRoot, '.nojekyll'), '', 'utf8');
console.log(`GitHub Pages site built at ${outputRoot}`);
