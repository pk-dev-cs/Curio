import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { hobbies, milestones } from '$lib/server/schema';

const today = () =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: process.env.TZ || 'Europe/Warsaw'
	}).format(new Date());
const now = () => new Date().toISOString();
const uploadDir = join(process.cwd(), 'static', 'uploads', 'milestones');
const allowedImageTypes = new Map([
	['image/jpeg', '.jpg'],
	['image/png', '.png'],
	['image/webp', '.webp'],
	['image/gif', '.gif']
]);
const maxImageSize = 5 * 1024 * 1024;

async function saveMilestoneImage(file: File) {
	if (file.size === 0) return null;

	if (file.size > maxImageSize) {
		throw new Error('Zdjęcie może mieć maksymalnie 5 MB.');
	}

	const extension = allowedImageTypes.get(file.type);
	if (!extension) {
		throw new Error('Obsługiwane formaty zdjęcia: JPG, PNG, WebP albo GIF.');
	}

	await mkdir(uploadDir, { recursive: true });

	const originalExtension = extname(file.name).toLowerCase();
	const safeExtension = allowedImageTypes.has(file.type) ? extension : originalExtension;
	const filename = `${randomUUID()}${safeExtension}`;
	const path = join(uploadDir, filename);
	const buffer = Buffer.from(await file.arrayBuffer());

	await writeFile(path, buffer);

	return `/uploads/milestones/${filename}`;
}

export const load: PageServerLoad = async () => {
	const hobbyRows = await db.select().from(hobbies).orderBy(hobbies.name);

	const milestoneRows = await db
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

	return {
		hobbies: hobbyRows,
		milestones: milestoneRows,
		today: today()
	};
};

export const actions: Actions = {
	createMilestone: async ({ request }) => {
		const form = await request.formData();
		const hobbyId = Number(form.get('hobbyId'));
		const title = String(form.get('title') ?? '').trim();
		const image = form.get('image');
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
			if (image instanceof File) {
				imageUrl = await saveMilestoneImage(image);
			}
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

	updateMilestone: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const hobbyId = Number(form.get('hobbyId'));
		const title = String(form.get('title') ?? '').trim();
		const image = form.get('image');
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
			if (image instanceof File && image.size > 0) {
				imageUrl = await saveMilestoneImage(image);
			}
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
