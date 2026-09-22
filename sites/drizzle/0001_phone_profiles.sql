ALTER TABLE runs ADD COLUMN browser_hash TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE runs ADD COLUMN attempt_slot INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint
UPDATE runs SET attempt_slot=0;
--> statement-breakpoint
UPDATE runs SET attempt_slot=1 WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY phone,subject ORDER BY (status='finished') DESC,created_at ASC,id ASC) AS position FROM runs) WHERE position=1);
--> statement-breakpoint
CREATE UNIQUE INDEX runs_one_attempt ON runs(phone,subject) WHERE attempt_slot=1;
--> statement-breakpoint
CREATE TABLE phone_profiles(phone TEXT PRIMARY KEY,browser_hash TEXT NOT NULL,name TEXT NOT NULL,grade INTEGER NOT NULL,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX profiles_browser ON phone_profiles(browser_hash);
