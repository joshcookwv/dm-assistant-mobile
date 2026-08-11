PRAGMA defer_foreign_keys = TRUE;

CREATE TABLE pdf_jobs_lifecycle (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  anthropic_file_id TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'created', 'uploading', 'uploaded', 'extracting',
      'completed', 'failed', 'deleted'
    )
  ),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES quota_reservations(id)
);

INSERT INTO pdf_jobs_lifecycle
  (id, user_hash, reservation_id, anthropic_file_id, status, created_at, expires_at)
SELECT id, user_hash, reservation_id, anthropic_file_id, status, created_at, expires_at
FROM pdf_jobs;

DROP TABLE pdf_jobs;
ALTER TABLE pdf_jobs_lifecycle RENAME TO pdf_jobs;
CREATE INDEX pdf_jobs_user_expiry ON pdf_jobs (user_hash, expires_at);
