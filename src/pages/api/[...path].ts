import type { APIRoute } from 'astro';
import { env as cfEnv } from 'cloudflare:workers';
import { assessment } from '../../../sites/worker.mjs';
import { BOARDS, MODES, gradeOptions, validateDemo, validateCareers, validateAsk, isBot } from '../../../server/forms.mjs';
import { publicSchema, SETTINGS, SECTIONS, validateRow } from '../../../server/admin-schema.mjs';
import { INBOXES } from '../../../server/inbox.mjs';
import { invalidateContentCache } from '../../lib/d1-store';
import { getImageDimensions } from '../../lib/image-size';

const respond = (status: number, data: any, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const hash = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));

function adminToken(request: Request) {
  return (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith('smartup_admin='))?.slice(14);
}

async function isAuthorized(request: Request, db: D1Database) {
  const secret = adminToken(request);
  if (!secret) return false;
  const tokenHash = await hash(secret);
  const session = await db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires>?').bind(tokenHash, Date.now()).first();
  return Boolean(session);
}

export const ALL: APIRoute = async (context) => {
  const request = context.request;
  const env = cfEnv || (context.locals.runtime?.env as any) || ({} as any);
  const db = env.DB as D1Database | undefined;
  const mediaBucket = env.MEDIA as R2Bucket | undefined;
  const store = context.locals.store;

  const url = new URL(request.url);
  const route = url.pathname.replace(/\/$/, '');
  const method = request.method;

  if (!db) {
    return respond(503, { error: 'Database is temporarily unavailable.' });
  }

  // 1. Delegate Smartup Quest & Admin Login / Questions / Results to the existing Cloudflare D1 handler
  if (
    route.startsWith('/api/assessment') ||
    route === '/api/admin/login' ||
    route === '/api/admin/logout' ||
    route === '/api/admin/questions' ||
    route.startsWith('/api/admin/results')
  ) {
    return assessment(request, env);
  }

  // 2. Public Form Submissions (/api/forms/:kind)
  if (route.startsWith('/api/forms/')) {
    const kind = route.slice('/api/forms/'.length);
    if (!['demo', 'careers', 'ask'].includes(kind)) return respond(404, { error: 'Not found.' });
    if (method !== 'POST') return respond(405, { error: 'Method not allowed.' });

    const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const isUrlEncoded = contentType === 'application/x-www-form-urlencoded';
    let input: any;

    if (isUrlEncoded) {
      const text = await request.text();
      input = Object.fromEntries(new URLSearchParams(text));
    } else {
      try {
        input = await request.json();
      } catch {
        return respond(400, { error: 'Send a valid JSON object.' });
      }
    }

    const redirect = (loc: string) =>
      new Response(null, {
        status: 303,
        headers: { Location: loc, 'Cache-Control': 'no-store' },
      });

    const pagesMap: Record<string, { page: string; anchor: string }> = {
      demo: { page: '/demo', anchor: 'book' },
      careers: { page: '/careers', anchor: 'apply' },
      ask: { page: '/ask', anchor: 'ask-form' },
    };
    const { page, anchor } = pagesMap[kind];
    const back = (code: string) => redirect(`${page}?error=${code}#${anchor}`);

    if (isBot(input)) {
      return isUrlEncoded ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
    }

    const now = new Date().toISOString();

    if (kind === 'demo') {
      const centres = store.centres().map((c: any) => c.name);
      const grades = gradeOptions(store.settings().classRange);
      const programmes = store.programmes().map((p: any) => p.name);
      const { values, errors } = validateDemo(input, { centres, grades, programmes });
      if (Object.keys(errors).length) return isUrlEncoded ? back('invalid') : respond(400, { error: 'Check the highlighted details.', fields: errors });

      await db.prepare(
        'INSERT INTO demo_bookings(created_at, name, phone, grade, board, programme, mode, centre, preferred_time) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(now, values.name, values.phone, values.grade, values.board, values.programme || '', values.mode, values.centre, values.preferred_time).run();

      return isUrlEncoded ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
    }

    if (kind === 'careers') {
      const roles = store.jobs().map((j: any) => j.title);
      const { values, errors } = validateCareers(input, { roles });
      if (Object.keys(errors).length) return isUrlEncoded ? back('invalid') : respond(400, { error: 'Check the highlighted details.', fields: errors });

      await db.prepare(
        'INSERT INTO job_applications(created_at, name, phone, email, role, experience, message, cv_url) VALUES(?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(now, values.name, values.phone, values.email, values.role, values.experience, values.message, values.cv_url).run();

      return isUrlEncoded ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
    }

    if (kind === 'ask') {
      const { values, errors } = validateAsk(input);
      if (Object.keys(errors).length) return isUrlEncoded ? back('invalid') : respond(400, { error: 'Check the highlighted details.', fields: errors });

      await db.prepare(
        'INSERT INTO ask_questions(created_at, name, phone, email, question) VALUES(?, ?, ?, ?, ?)'
      ).bind(now, values.name, values.phone, values.email || '', values.question).run();

      return isUrlEncoded ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
    }
  }

  // 3. Admin Area Endpoints (Schema, Content, Inbox, Media)
  if (route.startsWith('/api/admin/')) {
    if (!(await isAuthorized(request, db))) {
      return respond(401, { error: 'Please sign in to continue.' });
    }

    const parts = route.slice('/api/admin/'.length).split('/');
    const area = parts[0];
    const key = parts[1];
    const id = parts[2];

    // Schema
    if (area === 'schema' && method === 'GET') {
      const inboxes = Object.fromEntries(
        Object.entries(INBOXES).map(([k, box]) => [k, { label: box.label, fields: box.fields }])
      );
      return respond(200, { sections: publicSchema(), settings: SETTINGS, inboxes });
    }

    // Content CRUD
    if (area === 'content' && key) {
      const section = SECTIONS[key];
      if (!section) return respond(404, { error: 'Unknown section.' });

      if (method === 'GET' && !id) {
        const columns = section.fields.map((f: any) => f.name).join(', ');
        const rows = await db.prepare(`SELECT rowid AS id, ${columns} FROM ${section.table} ORDER BY ${section.order}`).all();
        return respond(200, { items: rows.results || [] });
      }

      if (method === 'POST' && !id) {
        const input = await request.json();
        const values = validateRow(section, input);
        if (section.sortable) {
          const maxSort = (await db.prepare(`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM ${section.table}`).first()) as any;
          values.sort = maxSort?.n ?? 0;
        }
        const names = Object.keys(values);
        const placeholders = names.map(() => '?').join(', ');
        const res = await db.prepare(`INSERT INTO ${section.table}(${names.join(', ')}) VALUES(${placeholders})`).bind(...names.map(n => values[n])).run();
        invalidateContentCache();
        return respond(201, { id: res.meta.last_row_id });
      }

      if (method === 'PUT' && id === 'order') {
        const { ids } = await request.json();
        if (Array.isArray(ids)) {
          const stmts = ids.map((rowId: number, index: number) =>
            db.prepare(`UPDATE ${section.table} SET sort = ? WHERE rowid = ?`).bind(index, rowId)
          );
          await db.batch(stmts);
          invalidateContentCache();
        }
        return respond(200, { ok: true });
      }

      if (id && /^\d+$/.test(id)) {
        const rowId = Number(id);
        if (method === 'PUT') {
          const input = await request.json();
          const values = validateRow(section, input);
          const names = Object.keys(values);
          const setters = names.map(n => `${n} = ?`).join(', ');
          await db.prepare(`UPDATE ${section.table} SET ${setters} WHERE rowid = ?`).bind(...names.map(n => values[n]), rowId).run();
          invalidateContentCache();
          return respond(200, { ok: true });
        }
        if (method === 'DELETE') {
          await db.prepare(`DELETE FROM ${section.table} WHERE rowid = ?`).bind(rowId).run();
          invalidateContentCache();
          return respond(200, { ok: true });
        }
      }
    }

    // Inbox
    if (area === 'inbox') {
      if (!key && method === 'GET') {
        const [demoCount, careersCount, askCount] = await Promise.all([
          db.prepare("SELECT COUNT(*) AS c FROM demo_bookings WHERE status = 'new'").first(),
          db.prepare("SELECT COUNT(*) AS c FROM job_applications WHERE status = 'new'").first(),
          db.prepare("SELECT COUNT(*) AS c FROM ask_questions WHERE status = 'new'").first(),
        ]);
        return respond(200, {
          counts: {
            demo: (demoCount as any)?.c || 0,
            careers: (careersCount as any)?.c || 0,
            ask: (askCount as any)?.c || 0,
          },
        });
      }

      if (key && INBOXES[key]) {
        const table = INBOXES[key].table;

        if (method === 'GET' && !id) {
          const rows = await db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC, id DESC`).all();
          return respond(200, { items: rows.results || [] });
        }

        if (id && /^\d+$/.test(id)) {
          const rowId = Number(id);
          if (method === 'PUT') {
            const input = await request.json();
            const { status, notes } = input;
            await db.prepare(`UPDATE ${table} SET status = ?, notes = ? WHERE id = ?`).bind(status, notes || '', rowId).run();
            return respond(200, { ok: true });
          }
          if (method === 'DELETE') {
            await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(rowId).run();
            return respond(200, { ok: true });
          }
        }
      }
    }

    // Media Uploads via R2
    if (area === 'media') {
      if (method === 'GET' && !key) {
        const rows = await db.prepare('SELECT id, name, alt, width, height, created_at AS createdAt FROM media ORDER BY id DESC').all();
        const items = (rows.results || []).map((r: any) => ({ ...r, base: `/media/${r.name}` }));
        return respond(200, { items });
      }

      if (method === 'POST' && !key) {
        if (!mediaBucket) return respond(503, { error: 'Media storage (R2) is not configured.' });
        const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
          return respond(415, { error: 'Upload a JPEG, PNG or WebP image.' });
        }

        const altText = (url.searchParams.get('alt') || '').trim();
        if (!altText || altText.length > 200) {
          return respond(400, { error: 'Describe the photo in a few words (up to 200 characters).' });
        }

        const buffer = new Uint8Array(await request.arrayBuffer());
        const { width, height } = getImageDimensions(buffer);
        const name = `u-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

        // Put to R2
        await mediaBucket.put(name, buffer, {
          httpMetadata: { contentType },
        });

        // Insert into D1
        const res = await db.prepare(
          'INSERT INTO media(name, alt, width, height, created_at) VALUES(?, ?, ?, ?, ?)'
        ).bind(name, altText, width, height, new Date().toISOString()).run();

        invalidateContentCache();
        return respond(201, {
          id: res.meta.last_row_id,
          name,
          alt: altText,
          width,
          height,
          base: `/media/${name}`,
        });
      }

      if (key && /^\d+$/.test(key) && method === 'DELETE') {
        const mediaId = Number(key);
        const item = (await db.prepare('SELECT id, name FROM media WHERE id = ?').bind(mediaId).first()) as any;
        if (!item) return respond(404, { error: 'This photo no longer exists.' });

        if (mediaBucket) {
          await mediaBucket.delete(item.name);
        }
        await db.prepare('DELETE FROM media WHERE id = ?').bind(mediaId).run();
        invalidateContentCache();
        return respond(200, { ok: true });
      }
    }
  }

  return respond(404, { error: 'Not found.' });
};
