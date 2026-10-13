import { mkdir, copyFile, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { driveUrl, validateSources } from '../src/lib/media.mjs';

const sources = JSON.parse(readFileSync('data-seed/media-sources.json', 'utf8'));
validateSources(sources);
const outDir = 'content-source';
await mkdir(outDir, { recursive: true });
const exists = file => access(file).then(() => true, () => false);

for (const s of sources) {
  const ext = s.from === 'local' ? path.extname(s.path).toLowerCase() : s.ext;
  const target = path.join(outDir, s.name + ext);
  if (!(await exists(target))) {
    if (s.from === 'local') {
      if (!(await exists(s.path))) throw new Error(`${s.name}: missing local file ${s.path}. v1 kept client originals in tmp/research-content; restore it before building media.`);
      await copyFile(s.path, target);
    } else {
      const res = await fetch(driveUrl(s.id));
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || type.startsWith('text/html')) throw new Error(`${s.name}: Drive returned ${res.status} ${type}. Check the file is still shared.`);
      await writeFile(target, Buffer.from(await res.arrayBuffer()));
    }
    console.log('fetched', s.name);
  }
  // sharp's prebuilt binary cannot decode HEIC, so convert with macOS sips once.
  if (ext === '.heic' && !(await exists(target.replace(/\.heic$/, '.jpg')))) {
    execFileSync('sips', ['-s', 'format', 'jpeg', target, '--out', target.replace(/\.heic$/, '.jpg')], { stdio: 'ignore' });
  }
}
console.log(`Sources ready in ${outDir}/`);
