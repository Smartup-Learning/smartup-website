import { normalizePhone } from './content-store.mjs';
import { line, block, isWebUrl, isEmail } from './validators.mjs';
import { readBuffer } from './read-body.mjs';

export const BOARDS = ['CBSE', 'State Board', 'Other'];
// Programme boards as stored by the admin, and as parents choose them on the demo form.
export const BOARD_NAMES = { cbse: 'CBSE', state: 'State Board' };
export const MODES = ['Online', 'At a centre'];

const DEFAULT_RANGE = { from: 8, to: 12 };
const validRange = range => (Number.isInteger(range?.from) && Number.isInteger(range?.to) && range.from >= 1 && range.to <= 12 && range.from <= range.to ? range : DEFAULT_RANGE);
const classLabel = n => (n === 11 ? 'Plus One (Class 11)' : n === 12 ? 'Plus Two (Class 12)' : `Class ${n}`);

/** The demo form's class choices for the classes Smartup teaches (Settings). */
export function gradeOptions(range) {
  const { from, to } = validRange(range);
  return Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: classLabel(from + i) }));
}

/** "8 to +2", the way the site describes the classes it teaches. */
export function classesText(range) {
  const { from, to } = validRange(range);
  const last = to === 12 ? '+2' : to === 11 ? '+1' : String(to);
  return from === to ? `class ${last}` : `classes ${from} to ${last}`;
}

function check(errors, key, ok, message) {
  if (!ok && !errors[key]) errors[key] = message;
}

function person(input, errors) {
  const name = line(input.name);
  check(errors, 'name', name.length >= 2 && name.length <= 80, 'Enter a name (2 to 80 characters).');
  let phone = '';
  try { phone = normalizePhone(line(input.phone)); } catch { errors.phone = 'Enter a 10-digit Indian mobile number.'; }
  return { name, phone };
}

export function validateDemo(input, { centres, grades, programmes }) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const grade = line(input.grade);
  const board = line(input.board);
  const programme = line(input.programme);
  const mode = line(input.mode);
  const preferred_time = line(input.preferred_time);
  let centre = line(input.centre);
  check(errors, 'grade', grades.some(g => g.value === grade), `Choose a class from ${grades[0]?.value} to ${grades.at(-1)?.value}.`);
  check(errors, 'board', BOARDS.includes(board), 'Choose a board.');
  check(errors, 'programme', !programme || programmes.includes(programme), 'Choose a programme from the list, or leave it empty.');
  check(errors, 'mode', MODES.includes(mode), 'Choose online or at a centre.');
  if (mode === 'At a centre') check(errors, 'centre', centres.includes(centre), 'Choose a centre.');
  else centre = '';
  check(errors, 'preferred_time', preferred_time.length <= 60, 'Keep this under 60 characters.');
  return { values: { name, phone, grade, board, programme, mode, centre, preferred_time }, errors };
}

export function validateCareers(input, { roles }) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const email = line(input.email);
  const role = line(input.role);
  const experience = line(input.experience);
  const message = block(input.message);
  const cv_url = line(input.cv_url);
  check(errors, 'email', email.length <= 120 && isEmail(email), 'Enter a valid email address.');
  check(errors, 'role', [...roles, 'Other'].includes(role), 'Choose a role.');
  check(errors, 'experience', experience.length <= 200, 'Keep this under 200 characters.');
  check(errors, 'message', message.length <= 1500, 'Keep your message under 1,500 characters.');
  check(errors, 'cv_url', cv_url === '' || (cv_url.length <= 300 && isWebUrl(cv_url)), 'Use a full link starting with https://');
  return { values: { name, phone, email, role, experience, message, cv_url }, errors };
}

export function validateAsk(input) {
  const errors = {};
  const { name, phone } = person(input, errors);
  const email = line(input.email);
  const question = block(input.question);
  check(errors, 'email', email === '' || (email.length <= 120 && isEmail(email)), 'Enter a valid email address, or leave it empty.');
  check(errors, 'question', question.length >= 10 && question.length <= 1500, 'Write your question in 10 to 1,500 characters.');
  return { values: { name, phone, email, question }, errors };
}

/** People never see the "website" field; only bots fill it in. */
export const isBot = input => line(input.website) !== '';

export const FORM_LIMIT = 20 * 1024;

const FORMS = {
  demo: { page: '/demo', anchor: 'book', validate: (input, content) => validateDemo(input, { centres: content.centres().map(c => c.name), grades: gradeOptions(content.settings().classRange), programmes: content.programmes().map(p => p.name) }) },
  careers: { page: '/careers', anchor: 'apply', validate: (input, content) => validateCareers(input, { roles: content.jobs().map(j => j.title) }) },
  ask: { page: '/ask', anchor: 'ask-form', validate: input => validateAsk(input) },
};

/** POST /api/forms/:kind — JSON from the page script, or a plain HTML post when JavaScript is off. */
export function createFormRoutes({ content, inbox }) {
  return async ({ req, res, route, respond, ip, limited }) => {
    const kind = route.slice('/api/forms/'.length);
    if (!Object.hasOwn(FORMS, kind)) return respond(404, { error: 'Not found.' });
    if (req.method !== 'POST') return respond(405, { error: 'Method not allowed.' });
    const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    const native = type === 'application/x-www-form-urlencoded';
    if (!native && type !== 'application/json') return respond(415, { error: 'Send the form as JSON.' });
    const { page, anchor, validate } = FORMS[kind];
    // Redirects carry only the form name and an error code, never what the visitor typed.
    const redirect = location => { res.writeHead(303, { Location: location, 'Cache-Control': 'no-store' }); res.end(); };
    const back = code => redirect(`${page}?error=${code}#${anchor}`);
    const raw = (await readBuffer(req, FORM_LIMIT)).toString('utf8');
    let input;
    if (native) input = Object.fromEntries(new URLSearchParams(raw));
    else {
      try { input = JSON.parse(raw); } catch { input = null; }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return respond(400, { error: 'Send a valid JSON object.' });
    }
    // Bots get a fake success before the limit is counted, so they cannot use up the limit real visitors share.
    if (isBot(input)) return native ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
    if (limited(`form:${kind}:${ip}`, 20, 600000)) return native ? back('busy') : respond(429, { error: 'Too many messages from this connection. Please try again later, or call us.' });
    const { values, errors } = validate(input, content);
    if (Object.keys(errors).length) return native ? back('invalid') : respond(400, { error: 'Check the highlighted details.', fields: errors });
    inbox.add(kind, values);
    return native ? redirect(`/thanks?form=${kind}`) : respond(201, { ok: true });
  };
}
