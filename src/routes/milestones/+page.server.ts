import { fail, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { getUserDb } from '$lib/server/db';
import {
	milestoneObjectBelongsToUser,
	resolveMilestoneImage,
	storedMilestoneImage
} from '$lib/server/object-storage';
import { hobbies, milestoneImages, milestones } from '$lib/server/schema';

const today = () =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: process.env.TZ || 'Europe/Warsaw'
	}).format(new Date());
const now = () => new Date().toISOString();

function requireUser(userId: string | null): string {
	if (!userId) redirect(303, '/sign-in');
	return userId;
}

function imagesFromForm(form: FormData, userId: string) {
	const keys = form.getAll('imageKey');
	if (keys.length > 10) throw new Error('Do jednego milestone możesz dodać maksymalnie 10 zdjęć naraz.');
	return keys
		.map((value) => String(value))
		.filter(Boolean)
		.map((key) => {
			if (!milestoneObjectBelongsToUser(key, userId)) {
				throw new Error('Nieprawidłowy klucz przesłanego zdjęcia.');
			}
			return storedMilestoneImage(key);
		});
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
	const storedImageRows = await db.select().from(milestoneImages).orderBy(milestoneImages.id);
	const imagesByMilestone = new Map<number, string[]>();
	for (const image of storedImageRows) {
		const values = imagesByMilestone.get(image.milestoneId) ?? [];
		values.push(image.imageUrl);
		imagesByMilestone.set(image.milestoneId, values);
	}
	const milestoneRows = await Promise.all(
		storedMilestoneRows.map(async (milestone) => {
			const storedImages = [milestone.imageUrl, ...(imagesByMilestone.get(milestone.id) ?? [])].filter(
				(value): value is string => Boolean(value)
			);
			const imageUrls = await Promise.all(storedImages.map(resolveMilestoneImage));
			return { ...milestone, imageUrl: imageUrls[0] ?? null, imageUrls: imageUrls.filter((value): value is string => Boolean(value)) };
		})
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

		const hobby = await db.select({ id: hobbies.id }).from(hobbies).where(eq(hobbies.id, hobbyId)).limit(1);
		if (hobby.length === 0) {
			return fail(400, { milestoneError: 'Wybrane hobby już nie istnieje.' });
		}

		let imageUrls: string[] = [];
		try {
			imageUrls = imagesFromForm(form, userId);
		} catch (error) {
			return fail(400, {
				milestoneError: error instanceof Error ? error.message : 'Nie udało się zapisać zdjęcia.'
			});
		}

		try {
			const created = await db.insert(milestones).values({
				hobbyId,
				title,
				imageUrl: null,
				description,
				achievedOn,
				createdAt: now()
			}).returning({ id: milestones.id });
			if (imageUrls.length > 0) {
				await db.insert(milestoneImages).values(
					imageUrls.map((imageUrl) => ({ milestoneId: created[0].id, imageUrl, createdAt: now() }))
				);
			}
		} catch (cause) {
			console.error('Unable to create milestone', cause);
			return fail(500, { milestoneError: 'Nie udało się zapisać milestone. Spróbuj ponownie.' });
		}

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

		let newImageUrls: string[] = [];
		try {
			newImageUrls = imagesFromForm(form, userId);
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
				description,
				achievedOn
			})
			.where(eq(milestones.id, id));
		if (newImageUrls.length > 0) {
			await db.insert(milestoneImages).values(
				newImageUrls.map((imageUrl) => ({ milestoneId: id, imageUrl, createdAt: now() }))
			);
		}

		return { success: true };
	}
};
