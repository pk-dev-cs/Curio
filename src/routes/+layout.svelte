<script lang="ts">
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();
	let darkMode = $state(false);

	function applyTheme(isDark: boolean) {
		darkMode = isDark;
		document.body.classList.toggle('dark-mode', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		window.dispatchEvent(new CustomEvent('curio-theme-change'));
	}

	function toggleTheme() {
		applyTheme(!darkMode);
	}

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<nav class="navbar" aria-label="Główna nawigacja">
	<a class="brand" href="/" aria-label="Curio dashboard">
		<svg viewBox="0 0 44 44" role="img" aria-hidden="true">
			<rect x="4" y="4" width="36" height="36" rx="10"></rect>
			<path d="M14 15h9c5 0 8 3 8 7s-3 7-8 7h-9"></path>
			<path d="M14 22h18"></path>
			<path d="M14 15v14"></path>
		</svg>
		<span>Curio</span>
	</a>

	<div class="nav-actions">
		<div class="nav-links">
			<a class:active={$page.url.pathname === '/'} href="/">Dashboard</a>
			<a class:active={$page.url.pathname.startsWith('/milestones')} href="/milestones">Milestones</a>
		</div>
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
	</div>
</nav>

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
		width: min(1180px, calc(100% - 32px));
		margin: 0 auto;
		padding: 22px 0 4px;
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

	@media (max-width: 720px) {
		.navbar,
		.nav-actions {
			align-items: stretch;
			display: grid;
		}

		.nav-links {
			justify-content: space-between;
		}

		.nav-links a,
		.theme-toggle {
			justify-content: center;
		}
	}
</style>
