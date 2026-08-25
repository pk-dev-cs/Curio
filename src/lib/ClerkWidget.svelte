<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	let { mode }: { mode: 'sign-in' | 'sign-up' | 'user-button' } = $props();
	let container: HTMLDivElement;
	let error = $state('');

	onMount(() => {
		let mounted = true;

		void import('@clerk/clerk-js').then(async ({ Clerk }) => {
			if (!env.PUBLIC_CLERK_PUBLISHABLE_KEY) {
				error = 'Brak klucza PUBLIC_CLERK_PUBLISHABLE_KEY.';
				return;
			}

			const clerk = new Clerk(env.PUBLIC_CLERK_PUBLISHABLE_KEY);
			await clerk.load();
			if (!mounted) return;

			if (mode === 'sign-in') {
				clerk.mountSignIn(container, { signUpUrl: '/sign-up', forceRedirectUrl: '/' });
			} else if (mode === 'sign-up') {
				clerk.mountSignUp(container, { signInUrl: '/sign-in', forceRedirectUrl: '/' });
			} else {
				clerk.mountUserButton(container, { signInUrl: '/sign-in' });
			}
		});

		return () => {
			mounted = false;
		};
	});
</script>

{#if error}<p class="auth-error">{error}</p>{/if}
<div bind:this={container}></div>

<style>
	.auth-error {
		color: #b91c1c;
		font-weight: 700;
	}
</style>
