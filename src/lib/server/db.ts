import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

const dbPath = resolve('data/hobby-backlog.db');

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

sqlite.exec(`
	CREATE TABLE IF NOT EXISTS hobbies (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		color TEXT NOT NULL DEFAULT '#2563eb',
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS activities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hobby_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		notes TEXT,
		occurred_on TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS milestones (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hobby_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		image_url TEXT,
		description TEXT NOT NULL,
		achieved_on TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
	);
`);

export const db = drizzle(sqlite, { schema });
