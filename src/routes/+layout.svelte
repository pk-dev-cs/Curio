<script lang="ts">
	import { page } from '$app/stores';
	import ClerkWidget from '$lib/ClerkWidget.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount, tick } from 'svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
	let darkMode = $state(false);
	let mobileMenuOpen = $state(false);
	let menuToggle: HTMLButtonElement;
	let mobileMenu: HTMLElement;

	function applyTheme(isDark: boolean) {
		darkMode = isDark;
		document.body.classList.toggle('dark-mode', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		window.dispatchEvent(new CustomEvent('curio-theme-change'));
	}

	function toggleTheme() {
		applyTheme(!darkMode);
	}

	async function openMobileMenu() {
		mobileMenuOpen = true;
		await tick();
		mobileMenu.querySelector<HTMLElement>('button, a')?.focus();
	}

	function closeMobileMenu(restoreFocus = true) {
		mobileMenuOpen = false;
		if (restoreFocus) {
			menuToggle.focus();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!mobileMenuOpen) {
			return;
		}

		if (event.key === 'Escape') {
			closeMobileMenu();
			return;
		}

		if (event.key === 'Tab') {
			const focusableElements = Array.from(mobileMenu.querySelectorAll<HTMLElement>('button, a'));
			const firstElement = focusableElements[0];
			const lastElement = focusableElements.at(-1);

			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement?.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement?.focus();
			}
		}
	}

	$effect(() => {
		if (!mobileMenuOpen) {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="navbar" aria-label="Główna nawigacja">
	<a class="brand" href="/" aria-label="Curio dashboard" data-sveltekit-reload>
		<svg viewBox="0 0 44 44" role="img" aria-hidden="true">
			<rect x="4" y="4" width="36" height="36" rx="10"></rect>
			<path d="M14 15h9c5 0 8 3 8 7s-3 7-8 7h-9"></path>
			<path d="M14 22h18"></path>
			<path d="M14 15v14"></path>
		</svg>
		<span>Curio</span>
	</a>

	<div class="nav-actions">
		{#if data.userId}
			<div class="nav-links">
				<a class:active={$page.url.pathname === '/'} href="/" data-sveltekit-reload>Dashboard</a>
				<a class:active={$page.url.pathname.startsWith('/milestones')} href="/milestones" data-sveltekit-reload>Milestones</a>
			</div>
		{:else}
			<div class="nav-links">
				<a class:active={$page.url.pathname === '/sign-in'} href="/sign-in">Zaloguj się</a>
				<a class:active={$page.url.pathname === '/sign-up'} href="/sign-up">Zarejestruj się</a>
			</div>
		{/if}
		<button
			class="theme-toggle"
			type="button"
			aria-pressed={darkMode}
			aria-label={darkMode ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
			onclick={toggleTheme}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				{#if darkMode}
					<path d="M12 4v2"></path>
					<path d="M12 18v2"></path>
					<path d="m4.93 4.93 1.41 1.41"></path>
					<path d="m17.66 17.66 1.41 1.41"></path>
					<path d="M4 12h2"></path>
					<path d="M18 12h2"></path>
					<path d="m4.93 19.07 1.41-1.41"></path>
					<path d="m17.66 6.34 1.41-1.41"></path>
					<circle cx="12" cy="12" r="4"></circle>
				{:else}
					<path d="M20 14.6A8 8 0 0 1 9.4 4 7 7 0 1 0 20 14.6Z"></path>
				{/if}
			</svg>
			<span>{darkMode ? 'Jasny' : 'Ciemny'}</span>
		</button>
		{#if data.userId}
			<ClerkWidget mode="user-button" />
		{/if}
		<button
			bind:this={menuToggle}
			class="menu-toggle"
			type="button"
			aria-label="Otwórz menu"
			aria-controls="mobile-navigation"
			aria-expanded={mobileMenuOpen}
			onclick={openMobileMenu}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 7h16"></path>
				<path d="M4 12h16"></path>
				<path d="M4 17h16"></path>
			</svg>
		</button>
	</div>
</nav>

<button
	class:visible={mobileMenuOpen}
	class="menu-backdrop"
	type="button"
	aria-label="Zamknij menu"
	tabindex={mobileMenuOpen ? 0 : -1}
	onclick={() => closeMobileMenu()}
></button>
<aside
	id="mobile-navigation"
	bind:this={mobileMenu}
	class:open={mobileMenuOpen}
	class="mobile-menu"
	aria-label="Mobilna nawigacja"
	aria-hidden={!mobileMenuOpen}
>
	<div class="mobile-menu-header">
		<strong>Menu</strong>
		<button type="button" aria-label="Zamknij menu" tabindex={mobileMenuOpen ? 0 : -1} onclick={() => closeMobileMenu()}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="m6 6 12 12"></path>
				<path d="m18 6-12 12"></path>
			</svg>
		</button>
	</div>
	<div class="mobile-menu-links">
		{#if data.userId}
			<a class:active={$page.url.pathname === '/'} href="/" tabindex={mobileMenuOpen ? 0 : -1} data-sveltekit-reload onclick={() => closeMobileMenu(false)}>Dashboard</a>
			<a class:active={$page.url.pathname.startsWith('/milestones')} href="/milestones" tabindex={mobileMenuOpen ? 0 : -1} data-sveltekit-reload onclick={() => closeMobileMenu(false)}>Milestones</a>
		{:else}
			<a class:active={$page.url.pathname === '/sign-in'} href="/sign-in" tabindex={mobileMenuOpen ? 0 : -1} onclick={() => closeMobileMenu(false)}>Zaloguj się</a>
			<a class:active={$page.url.pathname === '/sign-up'} href="/sign-up" tabindex={mobileMenuOpen ? 0 : -1} onclick={() => closeMobileMenu(false)}>Zarejestruj się</a>
		{/if}
	</div>
</aside>

{@render children()}

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		--app-bg: #f8fafc;
		--panel-bg: #ffffff;
		--text: #0f172a;
		--soft-text: #334155;
		--muted-text: #64748b;
		--border: #e2e8f0;
		--field-border: #cbd5e1;
		--field-bg: #ffffff;
		--button-bg: #0f172a;
		--button-text: #ffffff;
		--empty-bg: #f8fafc;
		--grid-line: #e2e8f0;
		--accent: #2563eb;
		--shadow: 0 16px 40px rgb(15 23 42 / 0.06);
		margin: 0;
		background: var(--app-bg);
		color: var(--text);
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		transition:
			background-color 180ms ease,
			color 180ms ease;
	}

	:global(body.dark-mode) {
		--app-bg: #0f172a;
		--panel-bg: #111827;
		--text: #e5e7eb;
		--soft-text: #cbd5e1;
		--muted-text: #94a3b8;
		--border: #263449;
		--field-border: #334155;
		--field-bg: #0b1220;
		--button-bg: #e5e7eb;
		--button-text: #0f172a;
		--empty-bg: #0b1220;
		--grid-line: #243244;
		--accent: #60a5fa;
		--shadow: 0 18px 44px rgb(0 0 0 / 0.22);
	}

	:global(button),
	:global(input),
	:global(select),
	:global(textarea) {
		font: inherit;
	}

	.navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		width: 100%;
		margin: 0;
		padding: 22px 24px 4px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		font-size: 1rem;
		font-weight: 900;
		text-decoration: none;
	}

	.brand svg {
		width: 38px;
		height: 38px;
		flex: 0 0 auto;
	}

	.brand rect {
		fill: var(--button-bg);
	}

	.brand path {
		fill: none;
		stroke: var(--button-text);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.8;
	}

	.nav-actions,
	.nav-links {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.nav-links {
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--panel-bg);
		padding: 4px;
	}

	.nav-links a {
		border-radius: 6px;
		color: var(--muted-text);
		font-size: 0.9rem;
		font-weight: 800;
		padding: 9px 12px;
		text-decoration: none;
	}

	.nav-links a.active {
		background: var(--button-bg);
		color: var(--button-text);
	}

	.theme-toggle {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--panel-bg);
		color: var(--text);
		cursor: pointer;
		font-weight: 800;
		padding: 10px 12px;
		white-space: nowrap;
	}

	.theme-toggle svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.menu-toggle,
	.mobile-menu,
	.menu-backdrop {
		display: none;
	}

	@media (max-width: 720px) {
		.navbar {
			padding: 16px 16px 4px;
		}

		.nav-actions {
			gap: 8px;
		}

		.nav-links {
			display: none;
		}

		.theme-toggle span {
			display: none;
		}

		.theme-toggle,
		.menu-toggle {
			align-items: center;
			justify-content: center;
			width: 42px;
			height: 42px;
			padding: 0;
		}

		.menu-toggle {
			display: inline-flex;
			border: 1px solid var(--border);
			border-radius: 8px;
			background: var(--panel-bg);
			color: var(--text);
			cursor: pointer;
		}

		.menu-toggle svg,
		.mobile-menu-header svg {
			width: 22px;
			height: 22px;
			fill: none;
			stroke: currentColor;
			stroke-linecap: round;
			stroke-width: 2;
		}

		.menu-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 20;
			border: 0;
			background: rgb(15 23 42 / 0.48);
			opacity: 0;
			pointer-events: none;
			transition: opacity 180ms ease;
		}

		.menu-backdrop.visible {
			opacity: 1;
			pointer-events: auto;
		}

		.mobile-menu {
			display: flex;
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			z-index: 30;
			flex-direction: column;
			width: min(82vw, 320px);
			border-left: 1px solid var(--border);
			background: var(--panel-bg);
			box-shadow: -16px 0 40px rgb(15 23 42 / 0.16);
			padding: 20px;
			transform: translateX(100%);
			transition: transform 220ms ease;
		}

		.mobile-menu.open {
			transform: translateX(0);
		}

		.mobile-menu-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-bottom: 20px;
		}

		.mobile-menu-header strong {
			font-size: 1.1rem;
		}

		.mobile-menu-header button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 40px;
			height: 40px;
			border: 1px solid var(--border);
			border-radius: 8px;
			background: var(--panel-bg);
			color: var(--text);
			cursor: pointer;
		}

		.mobile-menu-links {
			display: grid;
			gap: 8px;
		}

		.mobile-menu-links a {
			border-radius: 8px;
			color: var(--soft-text);
			font-weight: 800;
			padding: 14px 16px;
			text-decoration: none;
		}

		.mobile-menu-links a.active {
			background: var(--button-bg);
			color: var(--button-text);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.menu-backdrop,
		.mobile-menu {
			transition: none;
		}
	}
</style>
