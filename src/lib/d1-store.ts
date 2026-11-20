import seedData from '../../data-seed/content.json' with { type: 'json' };
import mediaSizesData from '../../data-seed/media-sizes.json' with { type: 'json' };
import mediaSourcesData from '../../data-seed/media-sources.json' with { type: 'json' };
import { normalizePhone } from '../../server/content-store.mjs';

function parseList(text: unknown): any[] {
  if (Array.isArray(text)) return text;
  if (typeof text !== 'string') return [];
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function phoneOrNull(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try { return normalizePhone(raw); } catch { return null; }
}

const seedSizes = mediaSizesData as Record<string, [number, number]>;
const youtubeCovers = new Map(
  (mediaSourcesData as any[])
    .filter(s => s.from === 'youtube')
    .map(s => [s.id, `/seed/img/${s.name}`])
);

export interface ContentSnapshot {
  settings: Record<string, any>;
  stats: any[];
  timeline: any[];
  growth: any[];
  leaders: any[];
  results: any[];
  faculty: any[];
  events: any[];
  videos: any[];
  posts: any[];
  faqs: any[];
  testimonials: { feedback: any[]; alumni: any[] };
  jobs: any[];
  alumni: any[];
  centres: any[];
  programmes: any[];
  media: Map<string, { width: number; height: number }>;
}

let cachedSnapshot: ContentSnapshot | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

export function invalidateContentCache() {
  cachedSnapshot = null;
  lastFetchTime = 0;
}

export async function initD1SeedIfNeeded(db: D1Database) {
  try {
    const check = await db.prepare("SELECT 1 FROM seed_log WHERE section = 'seed_complete' LIMIT 1").first();
    if (check) return;
  } catch {
    // If table doesn't exist yet, we'll run setup
  }

  // Populate from seedData
  const statements: D1PreparedStatement[] = [];

  // Seed log
  statements.push(db.prepare("INSERT OR IGNORE INTO seed_log(section, applied_at) VALUES('seed_complete', ?)").bind(new Date().toISOString()));

  // Settings
  if (seedData.settings) {
    for (const [key, value] of Object.entries(seedData.settings)) {
      statements.push(db.prepare("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)").bind(key, JSON.stringify(value)));
    }
  }

  // Stats
  if (Array.isArray(seedData.stats)) {
    seedData.stats.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO stats(value, label, source, sort, published) VALUES(?, ?, ?, ?, 1)").bind(r.value, r.label, r.source ?? '', i));
    });
  }

  // Timeline
  if (Array.isArray(seedData.timeline)) {
    seedData.timeline.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO timeline_entries(year_label, title, story, stat_value, stat_label, media, source_url, featured, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.yearLabel, r.title, r.story ?? '', r.statValue ?? '', r.statLabel ?? '', JSON.stringify(r.media ?? []), r.sourceUrl ?? '', r.featured ? 1 : 0, i
      ));
    });
  }

  // Growth
  if (Array.isArray(seedData.growth)) {
    seedData.growth.forEach((r: any) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO growth_points(year, students, students_label, centres) VALUES(?, ?, ?, ?)").bind(
        r.year, r.students, r.studentsLabel, r.centres
      ));
    });
  }

  // Leaders
  if (Array.isArray(seedData.leaders)) {
    seedData.leaders.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO leaders(name, role, summary, bio, photo, photo_alt, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.name, r.role, r.summary ?? '', r.bio ?? '', r.photo ?? '', r.photoAlt ?? '', i
      ));
    });
  }

  // Results
  if (Array.isArray(seedData.results)) {
    seedData.results.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO results(year, board, exam, headline, detail, poster, poster_alt, featured, kind, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.year, r.board, r.exam, r.headline, r.detail ?? '', r.poster ?? '', r.posterAlt ?? '', r.featured ? 1 : 0, r.kind ?? 'student', i
      ));
    });
  }

  // Testimonials
  if (Array.isArray(seedData.testimonials)) {
    seedData.testimonials.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO testimonials(kind, section, title, person, quote, video, poster, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.kind, r.section, r.title, r.person ?? '', r.quote ?? '', r.video ?? '', r.poster ?? '', i
      ));
    });
  }

  // Jobs
  if (Array.isArray(seedData.jobs)) {
    seedData.jobs.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO jobs(title, type, location, sort, published) VALUES(?, ?, ?, ?, 1)").bind(
        r.title, r.type, r.location ?? '', i
      ));
    });
  }

  // Centres
  if (Array.isArray(seedData.centres)) {
    seedData.centres.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO centres(name, phone, map_url, hours, address, sort, published) VALUES(?, ?, ?, ?, ?, ?, 1)").bind(
        r.name, normalizePhone(r.phone), r.mapUrl, r.hours, r.address ?? '', i
      ));
    });
  }

  // Programmes
  if (Array.isArray(seedData.programmes)) {
    seedData.programmes.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO programmes(board, name, tagline, group_size, key_points, features, fee, mentor_ratio, parent_meetings, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.board, r.name, r.tagline ?? '', r.groupSize ?? '', JSON.stringify(r.keyPoints ?? []), JSON.stringify(r.features ?? []), r.fee ?? '', r.mentorRatio ?? '', r.parentMeetings ?? '', i
      ));
    });
  }

  // Faculty
  if (Array.isArray(seedData.faculty)) {
    seedData.faculty.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO faculty(name, role, team, qualification, note, photo, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.name, r.role ?? '', r.team ?? 'team', r.qualification ?? '', r.note ?? '', r.photo ?? '', i
      ));
    });
  }

  // Events
  if (Array.isArray(seedData.events)) {
    seedData.events.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO events(category, title, date_label, summary, media, youtube_id, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.category, r.title, r.dateLabel ?? '', r.summary ?? '', JSON.stringify(r.media ?? []), r.youtubeId ?? '', i
      ));
    });
  }

  // Videos
  if (Array.isArray(seedData.videos)) {
    seedData.videos.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO videos(youtube_id, title, category, format, sort, published) VALUES(?, ?, ?, ?, ?, 1)").bind(
        r.youtubeId, r.title, r.category, r.format ?? 'landscape', i
      ));
    });
  }

  // Posts
  if (Array.isArray(seedData.posts)) {
    seedData.posts.forEach((r: any) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO posts(slug, title, category, excerpt, body, author, published_at, is_sample, published) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.slug, r.title, r.category, r.excerpt ?? '', r.body, r.author ?? 'Smartup Academic Team', r.publishedAt, r.isSample ? 1 : 0
      ));
    });
  }

  // FAQs
  if (Array.isArray(seedData.faqs)) {
    seedData.faqs.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO faqs(category, question, answer, sort, published) VALUES(?, ?, ?, ?, 1)").bind(
        r.category, r.question, r.answer, i
      ));
    });
  }

  // Alumni
  if (Array.isArray(seedData.alumni)) {
    seedData.alumni.forEach((r: any, i: number) => {
      statements.push(db.prepare("INSERT OR IGNORE INTO alumni(name, batch, now_role, story, achievements, photo, photo_alt, is_sample, sort, published) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(
        r.name, r.batch ?? '', r.nowRole ?? '', r.story ?? '', r.achievements ?? '', r.photo ?? '', r.photoAlt ?? '', r.isSample ? 1 : 0, i
      ));
    });
  }

  // Execute in batches of up to 100 statements
  const BATCH_SIZE = 100;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    await db.batch(chunk);
  }
}

export async function fetchContentSnapshot(db: D1Database): Promise<ContentSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  await initD1SeedIfNeeded(db);

  try {
    const [
      settingsRows,
      statsRows,
      timelineRows,
      growthRows,
      leadersRows,
      resultsRows,
      facultyRows,
      eventsRows,
      videosRows,
      postsRows,
      faqsRows,
      testimonialsRows,
      jobsRows,
      alumniRows,
      centresRows,
      programmesRows,
      mediaRows,
    ] = await db.batch([
      db.prepare("SELECT key, value FROM settings"),
      db.prepare("SELECT value, label, source FROM stats WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT id, year_label AS yearLabel, title, story, stat_value AS statValue, stat_label AS statLabel, media, source_url AS sourceUrl, featured FROM timeline_entries WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT year, students, students_label AS studentsLabel, centres FROM growth_points ORDER BY year"),
      db.prepare("SELECT name, role, summary, bio, photo, photo_alt AS photoAlt FROM leaders WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT year, board, exam, headline, detail, poster, poster_alt AS posterAlt, kind, featured FROM results WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT name, role, team, qualification, note, photo, experience_years AS experienceYears, expertise, intro FROM faculty WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT id, category, title, date_label AS dateLabel, summary, media, youtube_id AS youtubeId FROM events WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT youtube_id AS youtubeId, title, category, format, cover FROM videos WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT slug, title, category, excerpt, author, published_at AS publishedAt, is_sample AS isSample, body FROM posts WHERE published = 1 ORDER BY published_at DESC, id DESC"),
      db.prepare("SELECT category, question, answer FROM faqs WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT kind, section, title, person, quote, video, poster, image, is_sample AS isSample FROM testimonials WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT title, type, location, description FROM jobs WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT name, batch, now_role AS nowRole, story, achievements, photo, photo_alt AS photoAlt, is_sample AS isSample FROM alumni WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT name, phone, map_url AS mapUrl, hours, address FROM centres WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT id, board, name, tagline, group_size AS groupSize, key_points AS keyPoints, features, fee, mentor_ratio AS mentorRatio, parent_meetings AS parentMeetings FROM programmes WHERE published = 1 ORDER BY sort, id"),
      db.prepare("SELECT name, width, height FROM media"),
    ]);

    const storedSettings = Object.fromEntries(
      (settingsRows.results || []).map((r: any) => [r.key, JSON.parse(r.value)])
    );
    const mergedSettings = { ...(seedData.settings || {}), ...storedSettings };
    const contactPhones = (Array.isArray(mergedSettings.contactPhones) ? mergedSettings.contactPhones : [])
      .map((p: any) => ({ label: String(p?.label ?? '').trim() || 'Office', phone: phoneOrNull(p?.phone) }))
      .filter((p: any) => p.phone);
    const settings = {
      ...mergedSettings,
      phone: phoneOrNull(mergedSettings.phone),
      whatsapp: phoneOrNull(mergedSettings.whatsapp),
      contactPhones,
    };

    const mediaMap = new Map<string, { width: number; height: number }>();
    for (const m of (mediaRows.results || []) as any[]) {
      mediaMap.set(m.name, { width: m.width, height: m.height });
    }

    const testFeedback: any[] = [];
    const testAlumni: any[] = [];
    for (const t of (testimonialsRows.results || []) as any[]) {
      const item = { ...t, isSample: t.isSample === 1 };
      if (t.section === 'feedback') testFeedback.push(item);
      else if (t.section === 'alumni') testAlumni.push(item);
    }

    cachedSnapshot = {
      settings,
      stats: statsRows.results || [],
      timeline: (timelineRows.results || []).map((r: any) => ({
        ...r,
        media: parseList(r.media),
        featured: r.featured === 1,
      })),
      growth: growthRows.results || [],
      leaders: leadersRows.results || [],
      results: (resultsRows.results || []).map((r: any) => ({
        ...r,
        featured: r.featured === 1,
      })),
      faculty: facultyRows.results || [],
      events: (eventsRows.results || []).map((r: any) => ({
        ...r,
        media: parseList(r.media),
      })),
      videos: videosRows.results || [],
      posts: (postsRows.results || []).map((r: any) => ({
        ...r,
        isSample: r.isSample === 1,
      })),
      faqs: faqsRows.results || [],
      testimonials: { feedback: testFeedback, alumni: testAlumni },
      jobs: jobsRows.results || [],
      alumni: (alumniRows.results || []).map((r: any) => ({
        ...r,
        isSample: r.isSample === 1,
      })),
      centres: centresRows.results || [],
      programmes: (programmesRows.results || []).map((p: any) => ({
        ...p,
        keyPoints: parseList(p.keyPoints),
        features: parseList(p.features),
      })),
      media: mediaMap,
    };

    lastFetchTime = now;
    return cachedSnapshot;
  } catch (error) {
    // If D1 fails or tables missing, fallback to seedData
    console.error('Error fetching from D1, falling back to seed data:', error);
    return getFallbackSnapshot();
  }
}

function getFallbackSnapshot(): ContentSnapshot {
  const mergedSettings = seedData.settings || {};
  const contactPhones = (Array.isArray(mergedSettings.contactPhones) ? mergedSettings.contactPhones : [])
    .map((p: any) => ({ label: String(p?.label ?? '').trim() || 'Office', phone: phoneOrNull(p?.phone) }))
    .filter((p: any) => p.phone);

  const testFeedback: any[] = [];
  const testAlumni: any[] = [];
  for (const t of (seedData.testimonials || []) as any[]) {
    const item = { ...t, isSample: Boolean(t.isSample) };
    if (t.section === 'feedback') testFeedback.push(item);
    else if (t.section === 'alumni') testAlumni.push(item);
  }

  return {
    settings: {
      ...mergedSettings,
      phone: phoneOrNull(mergedSettings.phone),
      whatsapp: phoneOrNull(mergedSettings.whatsapp),
      contactPhones,
    },
    stats: (seedData.stats as any[]) || [],
    timeline: ((seedData.timeline as any[]) || []).map((r: any, i: number) => ({ id: i + 1, ...r, featured: Boolean(r.featured) })),
    growth: (seedData.growth as any[]) || [],
    leaders: (seedData.leaders as any[]) || [],
    results: ((seedData.results as any[]) || []).map((r: any) => ({ ...r, featured: Boolean(r.featured) })),
    faculty: (seedData.faculty as any[]) || [],
    events: (seedData.events as any[]) || [],
    videos: (seedData.videos as any[]) || [],
    posts: ((seedData.posts as any[]) || []).map((p: any) => ({ ...p, isSample: Boolean(p.isSample) })),
    faqs: (seedData.faqs as any[]) || [],
    testimonials: { feedback: testFeedback, alumni: testAlumni },
    jobs: (seedData.jobs as any[]) || [],
    alumni: ((seedData.alumni as any[]) || []).map((a: any) => ({ ...a, isSample: Boolean(a.isSample) })),
    centres: (seedData.centres as any[]) || [],
    programmes: (seedData.programmes as any[]) || [],
    media: new Map(),
  };
}

export class D1Store {
  private snapshot: ContentSnapshot;
  public db?: D1Database;

  constructor(snapshot: ContentSnapshot, db?: D1Database) {
    this.snapshot = snapshot;
    this.db = db;
  }

  settings() { return this.snapshot.settings; }
  stats() { return this.snapshot.stats; }
  timeline({ featured = false } = {}) {
    return featured ? this.snapshot.timeline.filter(t => t.featured) : this.snapshot.timeline;
  }
  growth() { return this.snapshot.growth; }
  leaders() { return this.snapshot.leaders; }
  results({ featured = false } = {}) {
    return featured ? this.snapshot.results.filter(r => r.featured) : this.snapshot.results;
  }
  faculty() { return this.snapshot.faculty; }
  events() { return this.snapshot.events; }
  videos(category?: string) {
    return category ? this.snapshot.videos.filter(v => v.category === category) : this.snapshot.videos;
  }
  posts() { return this.snapshot.posts; }
  post(slug: string) {
    return this.snapshot.posts.find(p => p.slug === slug) ?? null;
  }
  faqs() { return this.snapshot.faqs; }
  testimonials(section: 'feedback' | 'alumni') {
    return this.snapshot.testimonials[section] || [];
  }
  jobs() { return this.snapshot.jobs; }
  alumni() { return this.snapshot.alumni; }
  centres() { return this.snapshot.centres; }
  programmes() { return this.snapshot.programmes; }

  youtubeCover(id: string) {
    const cover = youtubeCovers.get(id);
    return cover && this.mediaSize(cover) ? cover : '';
  }

  mediaSize(src: string | null | undefined) {
    const base = String(src ?? '').replace(/(-(480|960|1600))?\.webp$/, '');
    if (base.startsWith('/seed/')) {
      const size = seedSizes[base];
      return size ? { width: size[0], height: size[1] } : null;
    }
    const upload = /^\/media\/([\w-]+)$/.exec(base);
    if (!upload) return null;
    return this.snapshot.media.get(upload[1]) ?? null;
  }
}

export async function createD1Store(db?: D1Database): Promise<D1Store> {
  if (!db) {
    return new D1Store(getFallbackSnapshot());
  }
  const snapshot = await fetchContentSnapshot(db);
  return new D1Store(snapshot, db);
}
