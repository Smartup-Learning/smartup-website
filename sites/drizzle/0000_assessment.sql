CREATE TABLE question_banks (id INTEGER PRIMARY KEY CHECK (id=1), content TEXT NOT NULL, revision TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE runs (id TEXT PRIMARY KEY, access_hash TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, grade INTEGER NOT NULL, subject TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL, state TEXT NOT NULL, result TEXT, consent_version TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE INDEX runs_created ON runs(created_at DESC,id DESC);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE request_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX limits_expiry ON request_limits(expires);
