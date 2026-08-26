export const tenantSchemaStatements = [
	`CREATE TABLE IF NOT EXISTS hobbies (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		color TEXT NOT NULL DEFAULT '#2563eb',
		created_at TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS activities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hobby_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		notes TEXT,
		occurred_on TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS milestones (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		hobby_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		image_url TEXT,
		description TEXT NOT NULL,
		achieved_on TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY (hobby_id) REFERENCES hobbies(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS milestone_images (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		milestone_id INTEGER NOT NULL,
		image_url TEXT NOT NULL,
		created_at TEXT NOT NULL,
		FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
	)`
] as const;
