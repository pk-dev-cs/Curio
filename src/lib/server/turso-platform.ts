type TursoDatabaseResponse = {
	database: {
		Hostname: string;
		Name: string;
	};
};

export class TursoPlatformError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}

export function createTursoPlatformClient(org: string, token: string) {
	const baseUrl = `https://api.turso.tech/v1/organizations/${encodeURIComponent(org)}/databases`;
	const headers = { Authorization: `Bearer ${token}` };

	async function request(url: string, init?: RequestInit): Promise<TursoDatabaseResponse> {
		const response = await fetch(url, {
			...init,
			headers: {
				...headers,
				...(init?.body ? { 'Content-Type': 'application/json' } : {})
			}
		});
		if (!response.ok) {
			throw new TursoPlatformError(`Turso Platform API returned ${response.status}.`, response.status);
		}
		return response.json() as Promise<TursoDatabaseResponse>;
	}

	return {
		async get(name: string) {
			return (await request(`${baseUrl}/${encodeURIComponent(name)}`)).database;
		},
		async create(name: string, options: { group: string }) {
			return (
				await request(baseUrl, {
					method: 'POST',
					body: JSON.stringify({
						name,
						group: options.group
					})
				})
			).database;
		}
	};
}
