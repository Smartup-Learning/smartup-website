import { normalizePhone } from './content-store.mjs';
import { isWebUrl, isEmail } from './validators.mjs';

const options = (...items) => items.map(item => (Array.isArray(item) ? { value: item[0], label: item[1] } : { value: item, label: item }));
const published = { name: 'published', label: 'Show on the website', type: 'checkbox', default: true };
const sample = { name: 'is_sample', label: 'Sample — to be replaced (the website shows this label)', type: 'checkbox' };
const photos = { name: 'media', label: 'Photos', type: 'list', max: 12, item: [
  { name: 'src', label: 'Photo', type: 'image', required: true },
  { name: 'alt', label: 'Describe the photo', type: 'text', required: true, max: 200 },
] };
const needsAlt = (image, alt) => values => (values[image] && !values[alt] ? { [alt]: 'Describe the photo for people who cannot see it.' } : {});

/** Every section staff can edit: its table, list columns and form fields. Field names are column names. */
export const SECTIONS = {
  timeline: {
    label: 'Our Story timeline', table: 'timeline_entries', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'year_label',
    fields: [
      { name: 'year_label', label: 'Year', type: 'text', required: true, max: 10, hint: 'A year such as 2026, or Next' },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'story', label: 'Story', type: 'textarea', max: 1000 },
      { name: 'stat_value', label: 'Number', type: 'text', max: 20, hint: 'e.g. 1,600+' },
      { name: 'stat_label', label: 'What the number counts', type: 'text', max: 60, hint: 'e.g. students' },
      { ...photos, max: 6 },
      { name: 'source_url', label: 'Source link', type: 'url' },
      { name: 'featured', label: 'Show on the homepage', type: 'checkbox' },
      published,
    ],
  },
  stats: {
    label: 'Proof numbers', table: 'stats', order: 'sort, rowid', sortable: true, title: 'label', subtitle: 'value',
    fields: [
      { name: 'value', label: 'Number', type: 'text', required: true, max: 20, hint: 'e.g. 30,000+' },
      { name: 'label', label: 'Label', type: 'text', required: true, max: 60 },
      { name: 'source', label: 'Source or cohort', type: 'text', max: 120, hint: 'e.g. SSLC 2026' },
      published,
    ],
  },
  growth: {
    label: 'Growth chart', table: 'growth_points', order: 'year', title: 'year', subtitle: 'students_label',
    fields: [
      { name: 'year', label: 'Year', type: 'int', required: true, min: 2000, max: 2100 },
      { name: 'students', label: 'Students (number for the bar)', type: 'int', required: true, min: 0, max: 1000000 },
      { name: 'students_label', label: 'Students (as shown)', type: 'text', required: true, max: 20, hint: 'e.g. 1,600+' },
      { name: 'centres', label: 'Centres', type: 'int', required: true, min: 0, max: 100 },
    ],
  },
  leaders: {
    label: 'Founders', table: 'leaders', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'role',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'role', label: 'Role', type: 'text', required: true, max: 80 },
      { name: 'summary', label: 'One-line summary', type: 'textarea', max: 300 },
      { name: 'bio', label: 'Biography', type: 'textarea', max: 3000 },
      { name: 'photo', label: 'Photo', type: 'image' },
      { name: 'photo_alt', label: 'Describe the photo', type: 'text', max: 200 },
      published,
    ],
    check: needsAlt('photo', 'photo_alt'),
  },
  faculty: {
    label: 'Faculty', table: 'faculty', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'role',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'role', label: 'Subject or role', type: 'text', max: 80 },
      { name: 'team', label: 'Filter group', type: 'select', required: true, options: options(['mathematics', 'Mathematics'], ['physics', 'Physics'], ['chemistry', 'Chemistry'], ['biology', 'Biology'], ['commerce', 'Commerce'], ['humanities', 'Humanities'], ['team', 'Academic team']) },
      { name: 'qualification', label: 'Qualification', type: 'text', max: 120 },
      { name: 'experience_years', label: 'Years of teaching experience', type: 'int', min: 0, max: 60, hint: 'Leave 0 to hide' },
      { name: 'expertise', label: 'Expertise', type: 'text', max: 160, hint: 'e.g. Board exam problem solving' },
      { name: 'intro', label: 'Short introduction', type: 'textarea', max: 400 },
      { name: 'note', label: 'Note on the card', type: 'text', max: 160 },
      { name: 'photo', label: 'Photo', type: 'image' },
      published,
    ],
  },
  results: {
    label: 'Results', table: 'results', order: 'sort, rowid', sortable: true, title: 'headline', subtitle: 'year',
    fields: [
      { name: 'year', label: 'Year', type: 'text', required: true, max: 9, pattern: '^\\d{4}', patternMessage: 'Start with the year, e.g. 2026.' },
      { name: 'board', label: 'Board', type: 'select', required: true, options: options(['State', 'State Board'], 'CBSE') },
      { name: 'exam', label: 'Exam', type: 'select', required: true, options: options('SSLC', 'Class 10', 'Plus One', 'Plus Two') },
      { name: 'kind', label: 'Card type', type: 'select', required: true, options: options(['student', 'Student result'], ['summary', 'Summary (purple card)']) },
      { name: 'headline', label: 'Headline', type: 'text', required: true, max: 120, hint: 'e.g. Haleema Jihan — 9 A+' },
      { name: 'detail', label: 'Detail', type: 'textarea', max: 300 },
      { name: 'poster', label: 'Poster', type: 'image' },
      { name: 'poster_alt', label: 'Describe the poster', type: 'text', max: 200 },
      { name: 'featured', label: 'Show on the homepage', type: 'checkbox' },
      published,
    ],
    check: needsAlt('poster', 'poster_alt'),
  },
  testimonials: {
    label: 'Testimonials', table: 'testimonials', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'section',
    fields: [
      { name: 'section', label: 'Page', type: 'select', required: true, options: options(['feedback', 'Testimonials (students and parents)'], ['alumni', 'Alumni']) },
      { name: 'kind', label: 'Type', type: 'select', required: true, options: options(['written', 'Written review or screenshot'], ['video', 'Video file']) },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'person', label: 'Who said it', type: 'text', max: 120, hint: 'e.g. Parent of a Class 10 student' },
      { name: 'quote', label: 'Quote', type: 'textarea', max: 1000 },
      { name: 'image', label: 'Screenshot', type: 'image', hint: 'A screenshot of genuine feedback, if any' },
      { name: 'video', label: 'Video file', type: 'path', prefix: '/seed/video/', hint: 'Set by the developer. Add new videos on YouTube instead.' },
      { name: 'poster', label: 'Video poster', type: 'path', prefix: '/seed/video/' },
      sample,
      published,
    ],
    check: values => (values.kind === 'video' && !values.video ? { video: 'A video testimonial needs a video file. Use YouTube videos for new clips.' }
      : values.kind === 'written' && !values.quote && !values.image ? { quote: 'Add the quote, a screenshot, or both.' } : {}),
  },
  alumni: {
    label: 'Alumni stories', table: 'alumni', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'now_role',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 80 },
      { name: 'batch', label: 'Batch', type: 'text', max: 40, hint: 'e.g. SSLC 2019' },
      { name: 'now_role', label: 'Where they are now', type: 'text', max: 120, hint: 'e.g. MBBS student, Government Medical College' },
      { name: 'story', label: 'Their story', type: 'textarea', max: 1200 },
      { name: 'achievements', label: 'Achievements', type: 'textarea', max: 600 },
      { name: 'photo', label: 'Photo', type: 'image' },
      { name: 'photo_alt', label: 'Describe the photo', type: 'text', max: 200 },
      sample,
      published,
    ],
    check: needsAlt('photo', 'photo_alt'),
  },
  videos: {
    label: 'YouTube videos', table: 'videos', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'category',
    fields: [
      { name: 'youtube_id', label: 'YouTube link or video ID', type: 'youtube', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'category', label: 'Group', type: 'select', required: true, options: options(['classes', 'Live classes'], ['exam-prep', 'Exam preparation'], ['short-lessons', 'Short lessons'], ['toppers', 'Toppers Talk'], ['chairman', 'From the Chairman'], ['events', 'Events'], ['parents', 'Parent feedback (Testimonials page)']) },
      { name: 'format', label: 'Shape', type: 'select', required: true, options: options(['landscape', 'Landscape (16:9)'], ['portrait', 'Portrait (Shorts)']) },
      { name: 'cover', label: 'Cover image', type: 'image', hint: 'Optional. YouTube’s own picture for Shorts is small and blurry; a portrait cover looks sharper.' },
      published,
    ],
  },
  events: {
    label: 'Life @ Smartup', table: 'events', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'category',
    fields: [
      { name: 'category', label: 'Activity', type: 'select', required: true, options: options('Talent Eve', 'Shoot the Drugs', 'Coffee With Chairman', 'Workshops & academics', 'Celebrations', 'Trips & camps') },
      { name: 'title', label: 'Title', type: 'text', required: true, max: 120 },
      { name: 'date_label', label: 'When', type: 'text', max: 40, hint: 'e.g. March 2026' },
      { name: 'summary', label: 'Summary', type: 'textarea', max: 600 },
      photos,
      { name: 'youtube_id', label: 'YouTube video', type: 'youtube' },
      published,
    ],
  },
  posts: {
    label: 'Blog', table: 'posts', order: 'published_at DESC, rowid DESC', title: 'title', subtitle: 'published_at',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, max: 140 },
      { name: 'slug', label: 'Web address', type: 'slug', required: true, max: 80, hint: 'Lowercase words joined by hyphens, e.g. board-exam-tips. The post appears at /blog/ followed by this.' },
      { name: 'category', label: 'Category', type: 'select', required: true, options: options('CBSE updates', 'Board exams', 'Exam preparation', 'Study tips', 'Parent guidance', 'Career guidance', 'Education trends', 'Subject tips', 'Scholarships') },
      { name: 'excerpt', label: 'Summary for the blog list', type: 'textarea', required: true, max: 300 },
      { name: 'body', label: 'Article', type: 'markdown', required: true, max: 50000, hint: '## for a heading, - for a list, **bold**, *italic*, [link text](https://…)' },
      { name: 'author', label: 'Author', type: 'text', required: true, max: 80, default: 'Smartup Academic Team' },
      { name: 'published_at', label: 'Date', type: 'date', required: true },
      sample,
      published,
    ],
  },
  faqs: {
    label: 'FAQ', table: 'faqs', order: 'sort, rowid', sortable: true, title: 'question', subtitle: 'category',
    fields: [
      { name: 'category', label: 'Topic', type: 'text', required: true, max: 60, hint: 'e.g. Admissions. Questions with the same topic are grouped.' },
      { name: 'question', label: 'Question', type: 'text', required: true, max: 200 },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true, max: 2000 },
      published,
    ],
  },
  jobs: {
    label: 'Job openings', table: 'jobs', order: 'sort, rowid', sortable: true, title: 'title', subtitle: 'type',
    fields: [
      { name: 'title', label: 'Role', type: 'text', required: true, max: 120 },
      { name: 'type', label: 'Type', type: 'select', required: true, options: options('Full time', 'Part time', 'Teaching assistant', 'Other') },
      { name: 'location', label: 'Location', type: 'text', max: 120 },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000 },
      published,
    ],
  },
  centres: {
    label: 'Centres', table: 'centres', order: 'sort, rowid', sortable: true, title: 'name', subtitle: 'phone',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, max: 60 },
      { name: 'phone', label: 'Phone', type: 'phone', required: true },
      { name: 'map_url', label: 'Google Maps link', type: 'url', required: true },
      { name: 'hours', label: 'Hours', type: 'text', required: true, max: 40 },
      published,
    ],
  },
};

/** Site-wide settings, each stored as JSON under its name in the settings table. */
export const SETTINGS = [
  { name: 'heroHeadline', label: 'Homepage headline', type: 'text', required: true, max: 60 },
  { name: 'heroHighlight', label: 'Highlighted word (underlined in yellow)', type: 'text', required: true, max: 30 },
  { name: 'heroDescription', label: 'Line under the headline', type: 'text', required: true, max: 120 },
  { name: 'heroImage', label: 'Homepage photo', type: 'image', hint: 'Shown in a circle beside the headline. One or two people, close up, works best.' },
  { name: 'heroImageAlt', label: 'Describe the homepage photo', type: 'text', max: 200 },
  { name: 'aboutTitle', label: 'About section title', type: 'text', required: true, max: 80 },
  { name: 'aboutText', label: 'About section text', type: 'textarea', required: true, max: 800 },
  { name: 'phone', label: 'Main phone number', type: 'phone', required: true },
  { name: 'phones', label: 'Other phone numbers (one per line)', type: 'lines', of: 'phone', max: 5 },
  { name: 'whatsapp', label: 'WhatsApp number', type: 'phone', nullable: true, hint: 'Leave empty to hide every WhatsApp button and show the phone number instead.' },
  { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
  { name: 'hours', label: 'Centre hours', type: 'text', required: true, max: 40 },
  { name: 'googleReviewsUrl', label: 'Google Reviews link', type: 'url', nullable: true },
  { name: 'appLinks', label: 'App store links', type: 'group', fields: [
    { name: 'ios', label: 'App Store link', type: 'url', required: true },
    { name: 'android', label: 'Google Play link', type: 'url', required: true },
  ] },
  { name: 'social', label: 'Social media links', type: 'list', max: 12, item: [
    { name: 'network', label: 'Network', type: 'select', required: true, options: options(['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']) },
    { name: 'label', label: 'Label', type: 'text', required: true, max: 80 },
    { name: 'url', label: 'Link', type: 'url', required: true },
  ] },
  { name: 'communityLinks', label: 'Student groups (WhatsApp, Telegram)', type: 'list', max: 10, item: [
    { name: 'label', label: 'Name', type: 'text', required: true, max: 80 },
    { name: 'url', label: 'Invite link', type: 'url', required: true },
  ] },
  { name: 'positioning', label: 'Positioning line', type: 'text', max: 160 },
  { name: 'mission', label: 'Mission', type: 'textarea', max: 600 },
  { name: 'companyVision', label: 'Company vision', type: 'textarea', max: 600 },
  { name: 'vision', label: 'Vision for the future (Our Story)', type: 'group', fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
    { name: 'tagline', label: 'Tagline', type: 'text', required: true, max: 120 },
    { name: 'text', label: 'Paragraphs (one per line)', type: 'lines', of: 'text', itemMax: 800, max: 6 },
    { name: 'priorities', label: 'Priorities', type: 'list', max: 8, item: [
      { name: 'title', label: 'Title', type: 'text', required: true, max: 80 },
      { name: 'text', label: 'Text', type: 'textarea', required: true, max: 400 },
    ] },
    { name: 'vision2030', label: 'Vision 2030', type: 'textarea', max: 600 },
  ] },
  { name: 'legalName', label: 'Registered company name', type: 'text', max: 120 },
  { name: 'registeredOffice', label: 'Registered office', type: 'group', fields: [
    { name: 'address', label: 'Address', type: 'textarea', required: true, max: 300 },
    { name: 'mapUrl', label: 'Map link', type: 'url', required: true },
  ] },
];

const IMAGE = /^\/(seed\/img|media)\/[a-z0-9]+(-[a-z0-9]+)*$/;
const YOUTUBE_ID = /^[\w-]{11}$/;
const empty = value => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/** A YouTube ID from an ID, a watch/short/embed link or a youtu.be link; null otherwise. */
export function youtubeId(value) {
  const text = String(value).trim();
  if (YOUTUBE_ID.test(text)) return text;
  try {
    const url = new URL(text);
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    const id = host === 'youtu.be' ? url.pathname.slice(1)
      : host === 'youtube.com' ? (url.searchParams.get('v') ?? /^\/(?:shorts|embed|live)\/([\w-]{11})/.exec(url.pathname)?.[1] ?? '')
      : '';
    return YOUTUBE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

function cleanGroup(fields, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Fill in this section.');
  const out = {};
  for (const sub of fields) {
    try { out[sub.name] = cleanValue(sub, raw[sub.name]); } catch (error) { throw new Error(`${sub.label}: ${error.message}`); }
  }
  return out;
}

/** Returns the cleaned value for one field, or throws an Error whose message is shown to staff. */
export function cleanValue(field, raw) {
  const fail = message => { throw new Error(message); };
  if (field.type === 'checkbox') return raw === true || raw === 1 || raw === '1' || raw === 'on' ? 1 : 0;
  if (field.type === 'group') return cleanGroup(field.fields, raw);
  if (field.type === 'list') {
    const items = raw ?? [];
    if (!Array.isArray(items)) fail('Use a list here.');
    if (items.length > (field.max ?? 20)) fail(`Add at most ${field.max ?? 20} items.`);
    return items.map((item, i) => { try { return cleanGroup(field.item, item); } catch (error) { throw new Error(`Item ${i + 1}: ${error.message}`); } });
  }
  if (field.type === 'lines') {
    const items = (Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split('\n') : []).map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
    if (field.required && !items.length) fail('Add at least one line.');
    if (items.length > (field.max ?? 20)) fail(`Add at most ${field.max ?? 20} lines.`);
    return items.map((item, i) => {
      try { return cleanValue({ type: field.of ?? 'text', label: '', required: true, max: field.itemMax ?? 200 }, item); } catch (error) { throw new Error(`Line ${i + 1}: ${error.message}`); }
    });
  }
  if (empty(raw)) {
    if (field.required) fail('This is required.');
    return field.type === 'int' ? 0 : '';
  }
  if (field.type === 'int') {
    const n = Number(raw);
    if (!Number.isInteger(n)) fail('Use a whole number.');
    if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) fail(`Use a number from ${field.min} to ${field.max}.`);
    return n;
  }
  if (typeof raw !== 'string') fail('Use text here.');
  const multi = field.type === 'textarea' || field.type === 'markdown';
  const text = multi ? raw.replace(/\r\n?/g, '\n').trim() : raw.replace(/\s+/g, ' ').trim();
  const max = field.max ?? (multi ? 5000 : 200);
  if (text.length > max) fail(`Keep this under ${max} characters.`);
  switch (field.type) {
    case 'text':
      if (field.pattern && !new RegExp(field.pattern).test(text)) fail(field.patternMessage ?? 'Check the format.');
      return text;
    case 'textarea':
    case 'markdown':
      return text;
    case 'select':
      if (!field.options.some(o => o.value === text)) fail('Choose one of the options.');
      return text;
    case 'url':
      if (!isWebUrl(text)) fail('Use a full web address starting with https://');
      return text;
    case 'email':
      if (!isEmail(text)) fail('Use a valid email address.');
      return text;
    case 'phone':
      try { return normalizePhone(text); } catch { return fail('Use a 10-digit Indian mobile number.'); }
    case 'youtube':
      return youtubeId(text) ?? fail('Paste a YouTube link or an 11-character video ID.');
    case 'slug':
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(text)) fail('Use lowercase letters, numbers and hyphens, e.g. board-exam-tips.');
      return text;
    case 'date': {
      const date = new Date(`${text}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) fail('Use a date like 2026-10-13.');
      return text;
    }
    case 'image':
      if (!IMAGE.test(text)) fail('Choose an image from the media library.');
      return text;
    case 'path':
      if (!text.startsWith(field.prefix) || text.includes('..') || !/^[\w/.-]+$/.test(text)) fail(`Use a file path starting with ${field.prefix}`);
      return text;
    default:
      return fail(`Unknown field type ${field.type}.`);
  }
}

export function validateRow(section, input) {
  const values = {};
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { values, errors: { _: 'Send the form fields.' } };
  for (const field of section.fields) {
    try { values[field.name] = cleanValue(field, input[field.name]); } catch (error) { errors[field.name] = error.message; }
  }
  if (!Object.keys(errors).length && section.check) Object.assign(errors, section.check(values));
  return { values, errors };
}

export function validateSettings(input) {
  const values = {};
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { values, errors: { _: 'Send the settings.' } };
  for (const field of SETTINGS) {
    try { values[field.name] = field.nullable && empty(input[field.name]) ? null : cleanValue(field, input[field.name]); } catch (error) { errors[field.name] = error.message; }
  }
  return { values, errors };
}

/** The schema as the admin page sees it: labels and fields only; tables and checks stay on the server. */
export function publicSchema() {
  return Object.fromEntries(Object.entries(SECTIONS).map(([key, s]) => [key, { label: s.label, title: s.title, subtitle: s.subtitle, sortable: Boolean(s.sortable), fields: s.fields }]));
}
