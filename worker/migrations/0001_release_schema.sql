PRAGMA foreign_keys = ON;

CREATE TABLE quota_usage (
  user_hash TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used BETWEEN 0 AND 10),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_hash, day_utc)
);

CREATE TABLE quota_reservations (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits IN (1, 5)),
  kind TEXT NOT NULL CHECK (kind IN ('standard', 'pdf')),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'refunded')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX quota_reservations_user_day
  ON quota_reservations (user_hash, day_utc);
CREATE INDEX quota_reservations_expiry
  ON quota_reservations (status, expires_at);

CREATE TABLE pdf_jobs (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  anthropic_file_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('created', 'uploaded', 'completed', 'failed', 'deleted')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES quota_reservations(id)
);

CREATE INDEX pdf_jobs_user_expiry ON pdf_jobs (user_hash, expires_at);

CREATE TABLE report_usage (
  user_hash TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  reports_submitted INTEGER NOT NULL DEFAULT 0 CHECK (reports_submitted BETWEEN 0 AND 10),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_hash, day_utc)
);

CREATE TABLE ai_reports (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  category TEXT NOT NULL,
  comment TEXT NOT NULL,
  output TEXT NOT NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX ai_reports_expiry ON ai_reports (expires_at);

CREATE TABLE daily_metrics (
  day_utc TEXT NOT NULL,
  feature TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day_utc, feature)
);
