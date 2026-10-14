export const WIDTHS = [480, 960, 1600];

export const variantFiles = name => WIDTHS.map(width => ({ width, file: `${name}-${width}.webp` }));

export const srcset = base => WIDTHS.map(w => `${base}-${w}.webp ${w}w`).join(', ');

export const driveUrl = id => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;

// YouTube's full-size thumbnail in the video's own shape; for Shorts it is portrait.
export const youtubeThumbUrl = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/oardefault.jpg`;

export function cropBox(width, height, crop) {
  return { left: Math.round(crop.x * width), top: Math.round(crop.y * height), width: Math.round(crop.w * width), height: Math.round(crop.h * height) };
}

export function validateSources(list) {
  const seen = new Set();
  for (const s of list) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name ?? '')) throw new Error(`${s.name}: name must be kebab-case`);
    if (seen.has(s.name)) throw new Error(`${s.name}: duplicate name`);
    seen.add(s.name);
    if (!['image', 'video'].includes(s.kind)) throw new Error(`${s.name}: kind must be image or video`);
    if (s.from === 'drive' && !s.id) throw new Error(`${s.name}: drive source needs an id`);
    if (s.from === 'local' && !s.path) throw new Error(`${s.name}: local source needs a path`);
    if (s.from === 'youtube' && !/^[\w-]{11}$/.test(s.id ?? '')) throw new Error(`${s.name}: a YouTube source needs an 11-character video ID`);
    if (!['drive', 'local', 'youtube'].includes(s.from)) throw new Error(`${s.name}: from must be drive, local or youtube`);
    // For photos whose pixels are stored sideways without an orientation tag.
    if (s.rotate !== undefined && ![90, 180, 270].includes(s.rotate)) throw new Error(`${s.name}: rotate must be 90, 180 or 270`);
    if (s.crop) {
      const { x, y, w, h } = s.crop;
      const ok = [x, y, w, h].every(v => typeof v === 'number' && v >= 0 && v <= 1) && w > 0 && h > 0 && x + w <= 1 && y + h <= 1;
      if (!ok) throw new Error(`${s.name}: crop must be fractions inside the image`);
    }
  }
}

export function referencedMedia(content) {
  const text = JSON.stringify(content);
  const images = [...new Set([...text.matchAll(/"\/seed\/img\/([a-z0-9-]+)"/g)].map(m => m[1]))];
  const videos = [...new Set([...text.matchAll(/"\/seed\/video\/([a-z0-9-]+)\.mp4"/g)].map(m => m[1]))];
  return { images, videos };
}
