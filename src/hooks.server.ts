import { createClerkClient } from '@clerk/backend';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.userId = null;

	const secretKey = env.CLERK_SECRET_KEY;
	const publishableKey = env.PUBLIC_CLERK_PUBLISHABLE_KEY;
	if (secretKey && publishableKey) {
		const clerk = createClerkClient({ secretKey, publishableKey });
		const requestState = await clerk.authenticateRequest(event.request, {
			authorizedParties: [event.url.origin]
		});

		if (requestState.isAuthenticated) {
			event.locals.userId = requestState.toAuth().userId;
		}
	}

	return resolve(event);
};
