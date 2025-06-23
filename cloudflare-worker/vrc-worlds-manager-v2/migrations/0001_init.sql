-- Migration number: 1 	 2025-06-17T12:29:58.807Z

CREATE TABLE IF NOT EXISTS folders (
  id           TEXT PRIMARY KEY,
  hmac         TEXT NOT NULL,
  name         TEXT NOT NULL,
  expiration   TEXT NOT NULL,
  created_at   TEXT NOT NULL
);