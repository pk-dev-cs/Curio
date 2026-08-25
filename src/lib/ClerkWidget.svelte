<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	let { mode }: { mode: 'sign-in' | 'sign-up' | 'user-button' } = $props();
	let container: HTMLDivElement;
	let error = $state('');

	onMount(() => {
		let mounted = true;
		let unmount = () => {};

		void Promise.all([import('@clerk/clerk-js'), import('@clerk/ui')]).then(
			async ([{ Clerk }, { ui }]) => {
				const publishableKey =
					env.PUBLIC_CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
				if (!publishableKey) {
					error = 'Brak publicznego klucza Clerk.';
					return;
				}

				const clerk = new Clerk(publishableKey);
				await clerk.load({ ui });
				if (!mounted) return;

				if (mode === 'sign-in') {
					clerk.mountSignIn(container, { signUpUrl: '/sign-up', forceRedirectUrl: '/' });
					unmount = () => clerk.unmountSignIn(container);
				} else if (mode === 'sign-up') {
					clerk.mountSignUp(container, { signInUrl: '/sign-in', forceRedirectUrl: '/' });
					unmount = () => clerk.unmountSignUp(container);
				} else {
					clerk.mountUserButton(container, { signInUrl: '/sign-in' });
					unmount = () => clerk.unmountUserButton(container);
				}
			}
		).catch((cause) => {
			if (mounted) error = cause instanceof Error ? cause.message : 'Nie udało się załadować Clerk.';
		});

		return () => {
			mounted = false;
			unmount();
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
