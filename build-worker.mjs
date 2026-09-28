import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const sourceRoot = resolve(root, 'site');
const distRoot = resolve(root, 'dist');
const workerSource = await readFile(resolve(root, 'worker/index.js'), 'utf8');
let html = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const [styles, calendarStyles, app] = await Promise.all([
  readFile(resolve(sourceRoot, 'styles.css'), 'utf8'),
  readFile(resolve(sourceRoot, 'calendar.css'), 'utf8'),
  readFile(resolve(sourceRoot, 'app.js'), 'utf8'),
]);
html = html.replace('<link rel="stylesheet" href="styles.css" />', `<style>${styles}</style>`)
  .replace('<link rel="stylesheet" href="calendar.css" />', `<style>${calendarStyles}</style>`)
  .replace('<script src="app.js"></script>', `<script>${app}</script>`);
const output = workerSource.replace("const page = '__INLINE_PAGE__';", `const page = ${JSON.stringify(html)};`);
await rm(distRoot, { recursive: true, force: true });
await mkdir(resolve(distRoot, 'server'), { recursive: true });
await mkdir(resolve(distRoot, '.openai'), { recursive: true });
await writeFile(resolve(distRoot, 'server/index.js'), output);
await writeFile(resolve(distRoot, '.openai/hosting.json'), await readFile(resolve(root, '.openai/hosting.json')));
await mkdir(resolve(distRoot, 'drizzle'), { recursive: true });
await writeFile(resolve(distRoot, 'drizzle/0000_calendar.sql'), await readFile(resolve(root, 'drizzle/0000_calendar.sql')));
console.log(`Built ${resolve(distRoot, 'server/index.js')}`);
