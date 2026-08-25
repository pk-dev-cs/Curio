import { fail, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { getUserDb } from '$lib/server/db';
import {
	milestoneObjectBelongsToUser,
	resolveMilestoneImage,
	storedMilestoneImage
} from '$lib/server/object-storage';
import { hobbies, milestones } from '$lib/server/schema';

const today = () =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: process.env.TZ || 'Europe/Warsaw'
	}).format(new Date());
const now = () => new Date().toISOString();

function requireUser(userId: string | null): string {
	if (!userId) redirect(303, '/sign-in');
	return userId;
}

function imageFromForm(form: FormData, userId: string) {
	const key = String(form.get('imageKey') ?? '');
	if (!key) return null;
	if (!milestoneObjectBelongsToUser(key, userId)) {
		throw new Error('Nieprawidłowy klucz przesłanego zdjęcia.');
	}
	return storedMilestoneImage(key);
}

export const load: PageServerLoad = async ({ locals }) => {
	const db = await getUserDb(requireUser(locals.userId));
	const hobbyRows = await db.select().from(hobbies).orderBy(hobbies.name);

	const storedMilestoneRows = await db
		.select({
			id: milestones.id,
			title: milestones.title,
			imageUrl: milestones.imageUrl,
			description: milestones.description,
			achievedOn: milestones.achievedOn,
			createdAt: milestones.createdAt,
			hobbyId: hobbies.id,
			hobbyName: hobbies.name,
			hobbyColor: hobbies.color
		})
		.from(milestones)
		.innerJoin(hobbies, eq(milestones.hobbyId, hobbies.id))
		.orderBy(desc(milestones.achievedOn), desc(milestones.createdAt));
	const milestoneRows = await Promise.all(
		storedMilestoneRows.map(async (milestone) => ({
			...milestone,
			imageUrl: await resolveMilestoneImage(milestone.imageUrl)
		}))
	);

	return {
		hobbies: hobbyRows,
		milestones: milestoneRows,
		today: today()
	};
};

export const actions: Actions = {
	createMilestone: async ({ request, locals }) => {
		const userId = requireUser(locals.userId);
		const db = await getUserDb(userId);
		const form = await request.formData();
		const hobbyId = Number(form.get('hobbyId'));
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const achievedOn = String(form.get('achievedOn') ?? '').trim();

		if (!Number.isInteger(hobbyId) || hobbyId <= 0) {
			return fail(400, { milestoneError: 'Wybierz hobby dla milestone.' });
		}

		if (title.length < 2) {
			return fail(400, { milestoneError: 'Nagłówek musi mieć co najmniej 2 znaki.' });
		}

		if (description.length < 5) {
			return fail(400, { milestoneError: 'Opis powinien mieć co najmniej 5 znaków.' });
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(achievedOn)) {
			return fail(400, { milestoneError: 'Podaj poprawną datę osiągnięcia.' });
		}

		let imageUrl: string | null = null;
		try {
			imageUrl = imageFromForm(form, userId);
		} catch (error) {
			return fail(400, {
				milestoneError: error instanceof Error ? error.message : 'Nie udało się zapisać zdjęcia.'
			});
		}

		await db.insert(milestones).values({
			hobbyId,
			title,
			imageUrl,
			description,
			achievedOn,
			createdAt: now()
		});

		return { success: true };
	},

	updateMilestone: async ({ request, locals }) => {
		const userId = requireUser(locals.userId);
		const db = await getUserDb(userId);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const hobbyId = Number(form.get('hobbyId'));
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const achievedOn = String(form.get('achievedOn') ?? '').trim();

		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { updateError: 'Nie znaleziono milestone do edycji.' });
		}

		if (!Number.isInteger(hobbyId) || hobbyId <= 0) {
			return fail(400, { updateError: 'Wybierz hobby dla milestone.', editMilestoneId: id });
		}

		if (title.length < 2) {
			return fail(400, { updateError: 'Nagłówek musi mieć co najmniej 2 znaki.', editMilestoneId: id });
		}

		if (description.length < 5) {
			return fail(400, { updateError: 'Opis powinien mieć co najmniej 5 znaków.', editMilestoneId: id });
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(achievedOn)) {
			return fail(400, { updateError: 'Podaj poprawną datę osiągnięcia.', editMilestoneId: id });
		}

		const existing = await db
			.select({ imageUrl: milestones.imageUrl })
			.from(milestones)
			.where(eq(milestones.id, id))
			.limit(1);

		if (existing.length === 0) {
			return fail(404, { updateError: 'Nie znaleziono milestone do edycji.' });
		}

		let imageUrl = existing[0].imageUrl;
		try {
			imageUrl = imageFromForm(form, userId) ?? imageUrl;
		} catch (error) {
			return fail(400, {
				updateError: error instanceof Error ? error.message : 'Nie udało się zapisać zdjęcia.',
				editMilestoneId: id
			});
		}

		await db
			.update(milestones)
			.set({
				hobbyId,
				title,
				imageUrl,
				description,
				achievedOn
			})
			.where(eq(milestones.id, id));

		return { success: true };
	}
};
