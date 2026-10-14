import { mkdir, access, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';
import { variantFiles, validateSources, cropBox } from '../src/lib/media.mjs';
import { measureSeedMedia } from './media-sizes.mjs';

const sources = JSON.parse(readFileSync('data-seed/media-sources.json', 'utf8'));
validateSources(sources);
const force = process.argv.includes('--force');
const exists = file => access(file).then(() => true, () => false);
const imgDir = 'public/seed/img', videoDir = 'public/seed/video';
await mkdir(imgDir, { recursive: true });
await mkdir(videoDir, { recursive: true });
let bytes = 0;

const inputFor = s => {
  const ext = s.from === 'local' ? path.extname(s.path).toLowerCase() : s.ext;
  return path.join('content-source', s.name + (ext === '.heic' ? '.jpg' : ext));
};

for (const s of sources) {
  const input = inputFor(s);
  if (s.kind === 'image') {
    for (const { width, file } of variantFiles(s.name)) {
      const out = path.join(imgDir, file);
      if (force || !(await exists(out))) {
        // failOn: 'none' accepts slightly truncated phone JPEGs; rotate first so crops match what people see.
        const upright = await sharp(input, { failOn: 'none' }).rotate().toBuffer();
        const { data, info } = await sharp(upright).rotate(s.rotate ?? 0).toBuffer({ resolveWithObject: true });
        const base = s.crop ? sharp(data).extract(cropBox(info.width, info.height, s.crop)) : sharp(data);
        await base.resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
      }
      bytes += (await stat(out)).size;
    }
  } else {
    const out = path.join(videoDir, `${s.name}.mp4`);
    const posterJpg = path.join('content-source', `${s.name}-poster.jpg`);
    const poster = path.join(videoDir, `${s.name}-poster.webp`);
    if (force || !(await exists(out))) {
      // Portrait clips: 480px wide, H.264 for every browser, faststart so playback begins before the download ends.
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', 'scale=480:-2', '-c:v', 'libx264', '-crf', '29', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out]);
    }
    if (force || !(await exists(poster))) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', input, '-frames:v', '1', '-vf', 'scale=360:-2', posterJpg]);
      // Browsers fetch posters before any tap, so keep the set small (tested: 120 KB total).
      await sharp(posterJpg).webp({ quality: 50 }).toFile(poster);
    }
    bytes += (await stat(out)).size + (await stat(poster)).size;
  }
  console.log('built', s.name);
}
console.log(`public/seed holds ${(bytes / 1048576).toFixed(1)} MB`);
await measureSeedMedia();
