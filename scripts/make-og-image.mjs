import sharp from 'sharp';

// One-off: the 1200×630 social preview, a Talent Eve photo with the logo on a white panel.
const photo = 'public/seed/img/life-talent-eve-stage-1600.webp';
const logo = await sharp('public/brand/logo.svg', { density: 400 }).resize({ width: 420 }).png().toBuffer();
const panel = await sharp({ create: { width: 500, height: 150, channels: 4, background: '#ffffff' } }).composite([{ input: logo, gravity: 'centre' }]).png().toBuffer();
await sharp(photo).resize(1200, 630, { fit: 'cover', position: 'attention' }).composite([{ input: panel, left: 48, top: 432 }]).jpeg({ quality: 82, mozjpeg: true }).toFile('public/brand/og.jpg');
console.log('public/brand/og.jpg written');
