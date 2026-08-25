import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createMilestoneObjectKey, createMilestoneUpload } from '$lib/server/object-storage';

const allowedImageTypes = new Map([
	['image/jpeg', '.jpg'],
	['image/png', '.png'],
	['image/webp', '.webp'],
	['image/gif', '.gif']
]);
const maxImageSize = 5 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.userId) error(401, 'Zaloguj się, aby przesłać zdjęcie.');

	const body = (await request.json()) as { contentType?: unknown; size?: unknown };
	const contentType = typeof body.contentType === 'string' ? body.contentType : '';
	const size = typeof body.size === 'number' ? body.size : Number.NaN;
	const extension = allowedImageTypes.get(contentType);

	if (!extension) error(400, 'Obsługiwane formaty zdjęcia: JPG, PNG, WebP albo GIF.');
	if (!Number.isFinite(size) || size <= 0 || size > maxImageSize) {
		error(400, 'Zdjęcie może mieć maksymalnie 5 MB.');
	}

	const key = createMilestoneObjectKey(locals.userId, extension);
	return json({ key, ...(await createMilestoneUpload(key, contentType)) });
};
