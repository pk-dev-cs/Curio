import { createClient as createLibsqlClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import * as schema from './schema';
import { tenantSchemaStatements } from './tenant-schema';
import { createTursoPlatformClient, TursoPlatformError } from './turso-platform';

type UserDb = ReturnType<typeof drizzle<typeof schema>>;

const clients = new Map<string, Promise<UserDb>>();

export function databaseNameForUser(userId: string) {
	const digest = createHash('sha256').update(userId).digest('hex').slice(0, 32);
	return `curio-${digest}`;
}

function requiredEnv(name: string) {
	const value = env[name];
	if (!value) throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}.`);
	return value;
}

async function connectUserDb(userId: string): Promise<UserDb> {
	const org = requiredEnv('TURSO_ORG');
	const apiToken = requiredEnv('TURSO_API_TOKEN');
	const group = requiredEnv('TURSO_GROUP');
	const groupAuthToken = requiredEnv('TURSO_GROUP_AUTH_TOKEN');
	const databaseName = databaseNameForUser(userId);
	const turso = createTursoPlatformClient(org, apiToken);

	let database;
	try {
		database = await turso.get(databaseName);
	} catch (error) {
		if (!(error instanceof TursoPlatformError) || error.status !== 404) throw error;

		try {
			database = await turso.create(databaseName, { group });
		} catch (createError) {
			if (!(createError instanceof TursoPlatformError) || createError.status !== 409) {
				throw createError;
			}
			database = await turso.get(databaseName);
		}
	}

	const client = createLibsqlClient({
		url: `libsql://${database.Hostname}`,
		authToken: groupAuthToken
	});
	await client.batch([...tenantSchemaStatements], 'write');

	return drizzle(client, { schema });
}

export function getUserDb(userId: string) {
	const databaseName = databaseNameForUser(userId);
	let client = clients.get(databaseName);
	if (!client) {
		client = connectUserDb(userId);
		clients.set(databaseName, client);
		client.catch(() => clients.delete(databaseName));
	}
	return client;
}
