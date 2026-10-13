import { publicSchema, SETTINGS } from './admin-schema.mjs';
import { readBuffer } from './read-body.mjs';
import { MAX_UPLOAD, MEDIA_TYPES } from './media-library.mjs';
import { INBOXES } from './inbox.mjs';

/** Staff API under /api/admin/. The Quest handler has already checked the session. */
export function createAdminRoutes({ admin, media, inbox }) {
  return async ({ req, res, url, route, respond, body }) => {
    const [area, key, id, action] = route.split('/').slice(3);
    const numeric = value => (/^\d+$/.test(value ?? '') ? Number(value) : null);
    try {
      if (area === 'schema' && req.method === 'GET') {
        const inboxes = Object.fromEntries(Object.entries(INBOXES).map(([kind, box]) => [kind, { label: box.label, fields: box.fields }]));
        return respond(200, { sections: publicSchema(), settings: SETTINGS, inboxes });
      }
      if (area === 'content' && key) {
        if (req.method === 'GET' && id === undefined) return respond(200, { items: admin.list(key) });
        if (req.method === 'POST' && id === undefined) return respond(201, { id: admin.create(key, await body(req)) });
        if (req.method === 'PUT' && id === 'order') { admin.reorder(key, (await body(req)).ids); return respond(200, { ok: true }); }
        const itemId = numeric(id);
        if (itemId !== null && action === undefined) {
          if (req.method === 'PUT') { admin.update(key, itemId, await body(req)); return respond(200, { ok: true }); }
          if (req.method === 'DELETE') { admin.remove(key, itemId); return respond(200, { ok: true }); }
        }
      }
      if (area === 'media' && media) {
        if (req.method === 'GET' && key === undefined) return respond(200, { items: media.list() });
        if (req.method === 'POST' && key === undefined) {
          const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
          if (!MEDIA_TYPES.includes(type)) return respond(415, { error: 'Upload a JPEG, PNG or WebP image.' });
          const buffer = await readBuffer(req, MAX_UPLOAD);
          return respond(201, await media.add(buffer, type, url.searchParams.get('alt')));
        }
        const itemId = numeric(key);
        if (req.method === 'DELETE' && itemId !== null && id === undefined) {
          const item = media.get(itemId);
          if (!item) return respond(404, { error: 'This photo no longer exists.' });
          const used = admin.references(item.base);
          if (used.length) return respond(409, { error: `This photo is used in: ${used.join(', ')}. Remove it there first.` });
          await media.remove(itemId);
          return respond(200, { ok: true });
        }
      }
      if (area === 'inbox' && inbox) {
        if (key === undefined && req.method === 'GET') return respond(200, { counts: inbox.counts() });
        if (!Object.hasOwn(INBOXES, key)) return respond(404, { error: 'Not found.' });
        if (req.method === 'GET' && id === undefined) return respond(200, { items: inbox.list(key) });
        if (req.method === 'GET' && id === 'export') {
          const date = new Date().toISOString().slice(0, 10);
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="smartup-${key}-${date}.csv"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(inbox.csv(key));
        }
        const itemId = numeric(id);
        const gone = () => respond(404, { error: 'This entry no longer exists.' });
        if (itemId !== null && action === undefined && req.method === 'PUT') return inbox.update(key, itemId, await body(req)) ? respond(200, { ok: true }) : gone();
        if (itemId !== null && action === undefined && req.method === 'DELETE') return inbox.remove(key, itemId) ? respond(200, { ok: true }) : gone();
        if (itemId !== null && key === 'ask' && action === 'publish' && req.method === 'POST') {
          const faqId = inbox.publishAnswer(itemId, await body(req));
          return faqId ? respond(201, { faqId }) : gone();
        }
      }
      if (area === 'settings' && key === undefined) {
        if (req.method === 'GET') return respond(200, { settings: admin.settings() });
        if (req.method === 'PUT') { admin.saveSettings(await body(req)); return respond(200, { ok: true }); }
      }
      return respond(404, { error: 'Not found.' });
    } catch (error) {
      if (!error.status) throw error;
      return respond(error.status, { error: error.message, ...(error.fields ? { fields: error.fields } : {}) });
    }
  };
}
