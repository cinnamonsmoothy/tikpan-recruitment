import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = join(projectRoot, 'assets', 'images', 'site');
const sourceFiles = [];
const skippedDirectories = new Set(['.git', 'dist-pages', 'jobs-api-site', 'node_modules', 'secrets']);
const urlPattern = /https:\/\/images\.unsplash\.com\/photo-([a-zA-Z0-9-]+)\?[^'"\)\s]+/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (['.html', '.css'].includes(extname(entry.name).toLowerCase())) sourceFiles.push(target);
  }
}

await walk(projectRoot);
const images = new Map();
for (const sourceFile of sourceFiles) {
  const source = await readFile(sourceFile, 'utf8');
  for (const match of source.matchAll(urlPattern)) {
    const requestedWidth = Number(match[0].match(/(?:&|&amp;)w=(\d+)/)?.[1] || 1600);
    const width = Math.min(1800, Math.max(900, requestedWidth));
    images.set(match[1], Math.max(images.get(match[1]) || 0, width));
  }
}

await mkdir(assetRoot, { recursive: true });
const queue = Array.from(images.entries());
async function worker() {
  while (queue.length) {
    const [id, width] = queue.shift();
    const url = `https://images.unsplash.com/photo-${id}?fit=crop&w=${width}&q=80&fm=webp`;
    const response = await fetch(url, { headers: { Accept: 'image/webp' } });
    if (!response.ok) throw new Error(`Could not download ${id}: HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error(`Unexpected content type for ${id}: ${contentType}`);
    await writeFile(join(assetRoot, `${id}.webp`), Buffer.from(await response.arrayBuffer()));
  }
}

await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));

for (const sourceFile of sourceFiles) {
  const source = await readFile(sourceFile, 'utf8');
  const output = source.replace(urlPattern, function (_, id) {
    return relative(dirname(sourceFile), join(assetRoot, `${id}.webp`)).replaceAll('\\', '/');
  });
  if (output !== source) await writeFile(sourceFile, output);
}

console.log(`Localised ${images.size} Unsplash images in ${relative(projectRoot, assetRoot)}.`);
