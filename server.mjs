import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import compression from 'compression';
import { AssessmentStore, createAssessmentHandler } from './server/assessment.mjs';
import { ContentStore } from './server/content-store.mjs';
import { InboxStore } from './server/inbox.mjs';
import { createFormRoutes } from './server/forms.mjs';
import { AdminContent } from './server/admin-content.mjs';
import { createAdminRoutes } from './server/admin-routes.mjs';
import { MediaLibrary } from './server/media-library.mjs';

const legacyRoot = path.resolve('dist');
const webRoot = path.resolve('build/client');
const astroEntry = path.resolve('build/server/entry.mjs');
const legacyPrefixes = ['/assessment/', '/assets/'];
const legacyFiles = new Set(['/assessment', '/robots.txt']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8'};

let astroHandler;
async function loadAstro() {
  if (astroHandler !== undefined) return astroHandler;
  try { await stat(astroEntry); } catch { astroHandler = null; return null; }
  ({ handler: astroHandler } = await import(pathToFileURL(astroEntry).href));
  return astroHandler;
}

async function findFile(root, pathname) {
  const file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return { file, info };
    if (!info.isDirectory()) return null;
    const index = path.join(file, 'index.html');
    const indexInfo = await stat(index);
    return indexInfo.isFile() ? { file: index, info: indexInfo } : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function cacheFor(pathname) {
  if (pathname.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  if (/^\/(assets|seed|fonts|brand)\//.test(pathname)) return 'public, max-age=86400';
  return 'no-cache';
}

function sendFile(req, res, { file, info }, cacheControl, send) {
  const headers = {'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':cacheControl,'Accept-Ranges':'bytes','Content-Length':info.size};
  let start=0,end=info.size-1,status=200;
  // A single byte range is enough for browser video playback and seeking.
  if(req.headers.range&&req.method==='GET'){
   const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   const invalid=()=>send(416,'Range not satisfiable',{'Content-Range':`bytes */${info.size}`,'Accept-Ranges':'bytes'});
   if(!match||(!match[1]&&!match[2])||info.size===0)return invalid();
   if(!match[1]){const length=Number(match[2]);if(!Number.isSafeInteger(length)||length<=0)return invalid();start=Math.max(0,info.size-length);}
   else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=info.size||end<start)return invalid();
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;headers['Content-Length']=end-start+1;
  }
  res.writeHead(status,headers);
  if(req.method==='HEAD'||info.size===0)return res.end();
  const stream=createReadStream(file,{start,end});
  stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}

export function createSiteServer(options = {}) {
  const store = options.store ?? new AssessmentStore();
  const content = options.content ?? new ContentStore(store.db);
  content.applySeed();
  const inbox = options.inbox ?? new InboxStore(store.db);
  const uploadsDir = path.resolve(options.uploadsDir ?? path.join(process.env.DATA_DIR || 'data', 'uploads'));
  const media = new MediaLibrary(store.db, uploadsDir);
  const admin = new AdminContent(store.db);
  const api = createAssessmentHandler({ ...options, store, routes: { forms: createFormRoutes({ content, inbox }), admin: createAdminRoutes({ admin, media, inbox }), ...options.routes } });
  const compress = compression();
  return http.createServer(async (req, res) => {
    const send = (status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }); res.end(req.method === 'HEAD' ? undefined : body); };
    // The API must start reading the request body in this same tick, so it is routed before anything else.
    if (req.url.startsWith('/api/')) return api(req, res, new URL(req.url, 'http://localhost'));
    // gzip text responses (compression calls next synchronously); byte ranges for video seeking stay uncompressed.
    if (!req.headers.range) compress(req, res, () => {});
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health') return send(200, 'ok');
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return send(400, 'Invalid URL'); }
      if (pathname.includes('\0')) return send(400, 'Invalid URL');
      if (pathname.split('/').some(part => part.startsWith('.')) || /^\/(server|client)(\/|$)/.test(pathname)) return send(404, 'Page not found');
      // Staff uploads: unique names, so they never change and can be cached for a year.
      if (pathname.startsWith('/media/')) {
        const found = await findFile(uploadsDir, pathname.slice('/media'.length));
        return found ? sendFile(req, res, found, 'public, max-age=31536000, immutable', send) : send(404, 'Page not found');
      }
      if (pathname === '/privacy.html') { res.writeHead(301, { Location: '/privacy', 'Cache-Control': 'public, max-age=86400' }); return res.end(); }
      const legacy = legacyFiles.has(pathname) || legacyPrefixes.some(prefix => pathname.startsWith(prefix));
      const found = await findFile(legacy ? legacyRoot : webRoot, pathname);
      if (found) return sendFile(req, res, found, cacheFor(pathname), send);
      if (legacy) return send(404, 'Page not found');
      const astro = await loadAstro();
      if (!astro) return send(503, 'The website has not been built. Run npm run build.');
      // No `next` callback: Astro renders src/pages/404.astro for unknown routes.
      return astro(req, res, undefined, { store: content });
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return send(404, 'Page not found');
      send(500, 'Unable to serve this page');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const port = Number(process.env.PORT) || 3000;
  createSiteServer().listen(port, '0.0.0.0', () => console.log(`Smartup ready at http://localhost:${port}`));
}
