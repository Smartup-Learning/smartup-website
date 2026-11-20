-- 0001_initial_schema.sql: Full D1 schema for Smartup Website

-- 1. Core Content & Settings
CREATE TABLE IF NOT EXISTS seed_log (
  section TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS timeline_entries (
  id INTEGER PRIMARY KEY,
  year_label TEXT NOT NULL,
  title TEXT NOT NULL,
  story TEXT NOT NULL DEFAULT '',
  stat_value TEXT NOT NULL DEFAULT '',
  stat_label TEXT NOT NULL DEFAULT '',
  media TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS growth_points (
  year INTEGER PRIMARY KEY,
  students INTEGER NOT NULL,
  students_label TEXT NOT NULL,
  centres INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leaders (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  photo_alt TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY,
  year TEXT NOT NULL,
  board TEXT NOT NULL,
  exam TEXT NOT NULL,
  headline TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  poster TEXT NOT NULL DEFAULT '',
  poster_alt TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'student',
  featured INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('video','written')),
  section TEXT NOT NULL CHECK(section IN ('feedback','alumni')),
  title TEXT NOT NULL,
  person TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL DEFAULT '',
  video TEXT NOT NULL DEFAULT '',
  poster TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  is_sample INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS centres (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  map_url TEXT NOT NULL,
  hours TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faculty (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT 'team',
  qualification TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  experience_years TEXT NOT NULL DEFAULT '',
  expertise TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  date_label TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  media TEXT NOT NULL DEFAULT '[]',
  youtube_id TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'landscape' CHECK(format IN ('landscape','portrait')),
  cover TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Smartup Academic Team',
  published_at TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS programmes (
  id INTEGER PRIMARY KEY,
  board TEXT NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  group_size TEXT NOT NULL DEFAULT '',
  key_points TEXT NOT NULL DEFAULT '[]',
  features TEXT NOT NULL DEFAULT '[]',
  fee TEXT NOT NULL DEFAULT '',
  mentor_ratio TEXT NOT NULL DEFAULT '',
  parent_meetings TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS alumni (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  batch TEXT NOT NULL DEFAULT '',
  now_role TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  achievements TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  photo_alt TEXT NOT NULL DEFAULT '',
  is_sample INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1
);

-- 2. Media Library
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  alt TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. Inboxes & Form Submissions
CREATE TABLE IF NOT EXISTS demo_bookings (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  grade TEXT NOT NULL,
  board TEXT NOT NULL,
  programme TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL,
  centre TEXT NOT NULL DEFAULT '',
  preferred_time TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','closed')),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  experience TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  cv_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','closed')),
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ask_questions (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  faq_id INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','closed')),
  notes TEXT NOT NULL DEFAULT ''
);

-- 4. Smartup Quest & Diagnostic Quiz
CREATE TABLE IF NOT EXISTS question_banks (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content TEXT NOT NULL,
  revision TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  access_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  state TEXT NOT NULL,
  result TEXT,
  consent_version TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  browser_hash TEXT NOT NULL DEFAULT '',
  attempt_slot INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS runs_created ON runs(created_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS runs_one_attempt ON runs(phone, subject) WHERE attempt_slot = 1;

CREATE TABLE IF NOT EXISTS phone_profiles (
  phone TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_browser ON phone_profiles(browser_hash);

-- 5. Admin Sessions & Rate Limits
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS request_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS limits_expiry ON request_limits(expires);
