-- migrations/v1.sql

CREATE TABLE IF NOT EXISTS folders (
  id           TEXT PRIMARY KEY,
  hmac         TEXT NOT NULL,
  name         TEXT NOT NULL,
  expiration   TEXT NOT NULL,
  created_at   TEXT NOT NULL
);