import { createClient as createLibsqlClient } from '@libsql/client';

const required = (name) => {
	const value = process.env[name];
	if (!value) throw new Error(`Missing environment variable ${name}`);
	return value;
};

const org = required('TURSO_ORG');
const token = required('TURSO_API_TOKEN');
const group = required('TURSO_GROUP');
const groupAuthToken = required('TURSO_GROUP_AUTH_TOKEN');
const schemaDatabase = required('TURSO_SCHEMA_DATABASE');
const baseUrl = `https://api.turso.tech/v1/organizations/${encodeURIComponent(org)}/databases`;
const platformRequest = async (url, init) => {
	const response = await fetch(url, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			...(init?.body ? { 'Content-Type': 'application/json' } : {})
		}
	});
	if (!response.ok) {
		const error = new Error(`Turso Platform API returned ${response.status}.`);
		error.status = response.status;
		throw error;
	}
	return response.json();
};

let database;
try {
	database = (await platformRequest(`${baseUrl}/${encodeURIComponent(schemaDatabase)}`)).database;
} catch (error) {
	if (error.status !== 404) throw error;
	database = (
		await platformRequest(baseUrl, {
			method: 'POST',
			body: JSON.stringify({ name: schemaDatabase, group, is_schema: true })
		})
	).database;
}

const db = createLibsqlClient({
	url: `libsql://${database.Hostname}`,
	authToken: groupAuthToken
});

await db.batch(
	[
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
		)`
	],
	'write'
);

console.log(`Turso schema database '${schemaDatabase}' is ready.`);
