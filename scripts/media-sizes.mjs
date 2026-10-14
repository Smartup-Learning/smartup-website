// Records the width and height of every built seed image and video poster in data-seed/media-sizes.json,
// so pages can draw each picture at its real shape without opening the file.
import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export async function measureSeedMedia({ publicDir = 'public', out = 'data-seed/media-sizes.json' } = {}) {
  const sizes = {};
  const groups = [['seed/img', /^(.+)-1600\.webp$/, name => `/seed/img/${name}`], ['seed/video', /^(.+-poster)\.webp$/, name => `/seed/video/${name}`]];
  for (const [dir, pattern, key] of groups) {
    for (const file of readdirSync(path.join(publicDir, dir)).sort()) {
      const match = pattern.exec(file);
      if (!match) continue;
      const { width, height } = await sharp(path.join(publicDir, dir, file)).metadata();
      sizes[key(match[1])] = [width, height];
    }
  }
  writeFileSync(out, JSON.stringify(sizes, null, 0).replace(/\],"/g, '],\n"').replace(/^\{/, '{\n').replace(/\}$/, '\n}\n'));
  return sizes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const sizes = await measureSeedMedia();
  console.log(`recorded ${Object.keys(sizes).length} sizes in data-seed/media-sizes.json`);
}
