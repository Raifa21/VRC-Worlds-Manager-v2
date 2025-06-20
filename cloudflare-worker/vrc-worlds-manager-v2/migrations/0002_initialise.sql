-- Migration number: 0002 	 2025-06-20T08:01:23.353Z

CREATE TABLE IF NOT EXISTS folders (
  id           TEXT PRIMARY KEY,
  hmac         TEXT NOT NULL,
  name         TEXT NOT NULL,
  expiration   TEXT NOT NULL,
  created_at   TEXT NOT NULL
);