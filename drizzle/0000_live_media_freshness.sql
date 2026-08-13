CREATE TABLE IF NOT EXISTS freshness_runs (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETE', 'FAILED')),
  schema_version TEXT NOT NULL,
  refresh_version TEXT NOT NULL,
  expected_count INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  failure_summary TEXT
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS media_freshness_snapshots (
  run_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  PRIMARY KEY (run_id, prospect_id),
  FOREIGN KEY (run_id) REFERENCES freshness_runs(id) ON DELETE CASCADE
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_freshness_runs_status_completed
ON freshness_runs(status, completed_at DESC);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_media_freshness_run
ON media_freshness_snapshots(run_id);
--> statement-breakpoint

PRAGMA optimize;
