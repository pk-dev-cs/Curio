import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { activities, hobbies } from '$lib/server/schema';

const today = () =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: process.env.TZ || 'Europe/Warsaw'
	}).format(new Date());
const now = () => new Date().toISOString();

export const load: PageServerLoad = async () => {
	const hobbyRows = await db.select().from(hobbies).orderBy(hobbies.name);

	const activityRows = await db
		.select({
			id: activities.id,
			title: activities.title,
			notes: activities.notes,
			occurredOn: activities.occurredOn,
			createdAt: activities.createdAt,
			hobbyId: hobbies.id,
			hobbyName: hobbies.name,
			hobbyColor: hobbies.color
		})
		.from(activities)
		.innerJoin(hobbies, eq(activities.hobbyId, hobbies.id))
		.orderBy(desc(activities.occurredOn), desc(activities.createdAt));

	const stats = await db
		.select({
			hobbyId: hobbies.id,
			hobbyName: hobbies.name,
			hobbyColor: hobbies.color,
			count: sql<number>`count(${activities.id})`
		})
		.from(hobbies)
		.leftJoin(activities, eq(activities.hobbyId, hobbies.id))
		.groupBy(hobbies.id)
		.orderBy(hobbies.name);

	return {
		hobbies: hobbyRows,
		activities: activityRows,
		stats,
		today: today()
	};
};

export const actions: Actions = {
	createHobby: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const color = String(form.get('color') ?? '#2563eb').trim() || '#2563eb';

		if (name.length < 2) {
			return fail(400, { hobbyError: 'Nazwa hobby musi mieć co najmniej 2 znaki.' });
		}

		try {
			await db.insert(hobbies).values({ name, color, createdAt: now() });
		} catch {
			return fail(400, { hobbyError: 'Takie hobby już istnieje.' });
		}

		return { success: true };
	},

	createActivity: async ({ request }) => {
		const form = await request.formData();
		const hobbyId = Number(form.get('hobbyId'));
		const title = String(form.get('title') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const occurredOn = String(form.get('occurredOn') ?? '').trim();

		if (!Number.isInteger(hobbyId) || hobbyId <= 0) {
			return fail(400, { activityError: 'Wybierz hobby dla aktywności.' });
		}

		if (title.length < 2) {
			return fail(400, { activityError: 'Tytuł aktywności musi mieć co najmniej 2 znaki.' });
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
			return fail(400, { activityError: 'Podaj poprawną datę aktywności.' });
		}

		await db.insert(activities).values({
			hobbyId,
			title,
			notes: notes || null,
			occurredOn,
			createdAt: now()
		});

		return { success: true };
	}
};
