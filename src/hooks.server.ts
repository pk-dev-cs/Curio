import { createClerkClient } from '@clerk/backend';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.userId = null;

	const secretKey = env.CLERK_SECRET_KEY;
	const publishableKey = env.PUBLIC_CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY;
	if (secretKey && publishableKey) {
		const clerk = createClerkClient({ secretKey, publishableKey });
		const requestState = await clerk.authenticateRequest(event.request, {
			authorizedParties: [event.url.origin]
		});
		const handshakeLocation = requestState.headers.get('location');
		if (handshakeLocation) {
			return new Response(null, { status: 307, headers: requestState.headers });
		}
		if (requestState.status === 'handshake') {
			throw new Error('Clerk zwrócił handshake bez adresu przekierowania.');
		}

		if (requestState.isAuthenticated) {
			event.locals.userId = requestState.toAuth().userId;
		}

		const response = await resolve(event);
		requestState.headers.forEach((value, key) => response.headers.append(key, value));
		return response;
	}

	return resolve(event);
};
