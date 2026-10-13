import { publicSchema, SETTINGS } from './admin-schema.mjs';
import { readBuffer } from './read-body.mjs';
import { MAX_UPLOAD, MEDIA_TYPES } from './media-library.mjs';

/** Staff API under /api/admin/. The Quest handler has already checked the session. */
export function createAdminRoutes({ admin, media, inbox }) {
  return async ({ req, res, url, route, respond, body }) => {
    const [area, key, id, action] = route.split('/').slice(3);
    const numeric = value => (/^\d+$/.test(value ?? '') ? Number(value) : null);
    try {
      if (area === 'schema' && req.method === 'GET') return respond(200, { sections: publicSchema(), settings: SETTINGS });
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
