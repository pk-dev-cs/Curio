import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { getUserDb } from '$lib/server/db';
import { activities, hobbies, milestoneImages, milestones } from '$lib/server/schema';
import { deleteMilestoneImage } from '$lib/server/object-storage';

const today = () =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: process.env.TZ || 'Europe/Warsaw'
	}).format(new Date());
const now = () => new Date().toISOString();

function requireUser(userId: string | null): string {
	if (!userId) redirect(303, '/sign-in');
	return userId;
}

export const load: PageServerLoad = async ({ locals }) => {
	const db = await getUserDb(requireUser(locals.userId));
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
	createHobby: async ({ request, locals }) => {
		const db = await getUserDb(requireUser(locals.userId));
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

	createActivity: async ({ request, locals }) => {
		const db = await getUserDb(requireUser(locals.userId));
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

		const hobby = await db.select({ id: hobbies.id }).from(hobbies).where(eq(hobbies.id, hobbyId)).limit(1);
		if (hobby.length === 0) {
			return fail(400, { activityError: 'Wybrane hobby już nie istnieje.' });
		}

		await db.insert(activities).values({
			hobbyId,
			title,
			notes: notes || null,
			occurredOn,
			createdAt: now()
		});

		return { success: true };
	},

	updateHobby: async ({ request, locals }) => {
		const db = await getUserDb(requireUser(locals.userId));
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '').trim();
		const color = String(form.get('color') ?? '#2563eb').trim() || '#2563eb';

		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { hobbyUpdateError: 'Nie znaleziono hobby do edycji.' });
		}
		if (name.length < 2) {
			return fail(400, { hobbyUpdateError: 'Nazwa hobby musi mieć co najmniej 2 znaki.', editHobbyId: id });
		}

		try {
			const updated = await db.update(hobbies).set({ name, color }).where(eq(hobbies.id, id)).returning({ id: hobbies.id });
			if (updated.length === 0) {
				return fail(404, { hobbyUpdateError: 'Nie znaleziono hobby do edycji.', editHobbyId: id });
			}
		} catch {
			return fail(400, { hobbyUpdateError: 'Takie hobby już istnieje.', editHobbyId: id });
		}

		return { success: true };
	},

	deleteHobby: async ({ request, locals }) => {
		const userId = requireUser(locals.userId);
		const db = await getUserDb(userId);
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { hobbyDeleteError: 'Nie znaleziono hobby do usunięcia.' });
		}

		const relatedMilestones = await db
			.select({ id: milestones.id, imageUrl: milestones.imageUrl })
			.from(milestones)
			.where(eq(milestones.hobbyId, id));
		const relatedMilestoneImages = await db
			.select({ imageUrl: milestoneImages.imageUrl })
			.from(milestoneImages)
			.innerJoin(milestones, eq(milestoneImages.milestoneId, milestones.id))
			.where(eq(milestones.hobbyId, id));

		try {
			await Promise.all(
				[...relatedMilestones, ...relatedMilestoneImages].map((image) => deleteMilestoneImage(image.imageUrl, userId))
			);
		} catch {
			return fail(500, { hobbyDeleteError: 'Nie udało się usunąć zdjęć powiązanych z hobby.', deleteHobbyId: id });
		}

		const deleted = await db.delete(hobbies).where(eq(hobbies.id, id)).returning({ id: hobbies.id });
		if (deleted.length === 0) {
			return fail(404, { hobbyDeleteError: 'Nie znaleziono hobby do usunięcia.', deleteHobbyId: id });
		}

		return { success: true };
	},

	updateActivity: async ({ request, locals }) => {
		const db = await getUserDb(requireUser(locals.userId));
		const form = await request.formData();
		const id = Number(form.get('id'));
		const hobbyId = Number(form.get('hobbyId'));
		const title = String(form.get('title') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		const occurredOn = String(form.get('occurredOn') ?? '').trim();

		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { activityUpdateError: 'Nie znaleziono aktywności do edycji.' });
		}
		if (!Number.isInteger(hobbyId) || hobbyId <= 0) {
			return fail(400, { activityUpdateError: 'Wybierz hobby dla aktywności.', editActivityId: id });
		}
		if (title.length < 2) {
			return fail(400, { activityUpdateError: 'Tytuł aktywności musi mieć co najmniej 2 znaki.', editActivityId: id });
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
			return fail(400, { activityUpdateError: 'Podaj poprawną datę aktywności.', editActivityId: id });
		}

		const hobby = await db.select({ id: hobbies.id }).from(hobbies).where(eq(hobbies.id, hobbyId)).limit(1);
		if (hobby.length === 0) {
			return fail(404, { activityUpdateError: 'Wybrane hobby już nie istnieje.', editActivityId: id });
		}

		const updated = await db
			.update(activities)
			.set({ hobbyId, title, notes: notes || null, occurredOn })
			.where(eq(activities.id, id))
			.returning({ id: activities.id });

		if (updated.length === 0) {
			return fail(404, { activityUpdateError: 'Nie znaleziono aktywności lub wybranego hobby.', editActivityId: id });
		}

		return { success: true };
	},

	deleteActivity: async ({ request, locals }) => {
		const db = await getUserDb(requireUser(locals.userId));
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { activityDeleteError: 'Nie znaleziono aktywności do usunięcia.' });
		}

		const deleted = await db.delete(activities).where(eq(activities.id, id)).returning({ id: activities.id });
		if (deleted.length === 0) {
			return fail(404, { activityDeleteError: 'Nie znaleziono aktywności do usunięcia.', deleteActivityId: id });
		}

		return { success: true };
	}
};
