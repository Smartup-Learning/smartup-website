export const WIDTHS = [480, 960, 1600];

export const variantFiles = name => WIDTHS.map(width => ({ width, file: `${name}-${width}.webp` }));

export const srcset = base => WIDTHS.map(w => `${base}-${w}.webp ${w}w`).join(', ');

export const driveUrl = id => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;

export function validateSources(list) {
  const seen = new Set();
  for (const s of list) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name ?? '')) throw new Error(`${s.name}: name must be kebab-case`);
    if (seen.has(s.name)) throw new Error(`${s.name}: duplicate name`);
    seen.add(s.name);
    if (!['image', 'video'].includes(s.kind)) throw new Error(`${s.name}: kind must be image or video`);
    if (s.from === 'drive' && !s.id) throw new Error(`${s.name}: drive source needs an id`);
    if (s.from === 'local' && !s.path) throw new Error(`${s.name}: local source needs a path`);
    if (!['drive', 'local'].includes(s.from)) throw new Error(`${s.name}: from must be drive or local`);
  }
}

export function referencedMedia(content) {
  const text = JSON.stringify(content);
  const images = [...new Set([...text.matchAll(/"\/seed\/img\/([a-z0-9-]+)"/g)].map(m => m[1]))];
  const videos = [...new Set([...text.matchAll(/"\/seed\/video\/([a-z0-9-]+)\.mp4"/g)].map(m => m[1]))];
  return { images, videos };
}
