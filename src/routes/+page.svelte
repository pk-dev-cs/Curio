<script lang="ts">
	import { onMount } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import type { Chart } from 'chart.js';

	export let data: PageData;
	export let form: ActionData;

	type Activity = PageData['activities'][number];

	type TimelineMonth = {
		key: string;
		label: string;
		activities: Activity[];
	};

	let chartCanvas: HTMLCanvasElement;
	let chart: Chart | undefined;
	let ChartConstructor: typeof import('chart.js/auto').default | undefined;
	let selectedChartMonth = 'all';
	let themeVersion = 0;

	const monthFormatter = new Intl.DateTimeFormat('pl-PL', {
		month: 'long',
		year: 'numeric'
	});

	const dayFormatter = new Intl.DateTimeFormat('pl-PL', {
		day: '2-digit',
		month: 'short'
	});

	function groupByMonth(activities: Activity[]): TimelineMonth[] {
		const groups = new Map<string, TimelineMonth>();

		for (const activity of activities) {
			const key = activity.occurredOn.slice(0, 7);
			const date = new Date(`${activity.occurredOn}T12:00:00`);

			if (!groups.has(key)) {
				groups.set(key, {
					key,
					label: monthFormatter.format(date),
					activities: []
				});
			}

			groups.get(key)?.activities.push(activity);
		}

		return Array.from(groups.values());
	}

	function monthLabel(monthKey: string) {
		return monthFormatter.format(new Date(`${monthKey}-01T12:00:00`));
	}

	function getMonthOptions(activities: Activity[]) {
		return Array.from(new Set(activities.map((activity) => activity.occurredOn.slice(0, 7))))
			.sort((a, b) => b.localeCompare(a))
			.map((key) => ({ key, label: monthLabel(key) }));
	}

	function getChartStats(monthKey: string) {
		const counts = new Map<number, number>();
		const filteredActivities =
			monthKey === 'all'
				? data.activities
				: data.activities.filter((activity) => activity.occurredOn.startsWith(monthKey));

		for (const activity of filteredActivities) {
			counts.set(activity.hobbyId, (counts.get(activity.hobbyId) ?? 0) + 1);
		}

		return data.hobbies.map((hobby) => ({
			hobbyId: hobby.id,
			hobbyName: hobby.name,
			hobbyColor: hobby.color,
			count: counts.get(hobby.id) ?? 0
		}));
	}

	function renderChart(stats: ReturnType<typeof getChartStats>) {
		if (!ChartConstructor || !chartCanvas) return;
		const styles = getComputedStyle(document.body);
		const axisColor = styles.getPropertyValue('--muted-text').trim() || '#475569';
		const gridColor = styles.getPropertyValue('--grid-line').trim() || '#e2e8f0';

		chart?.destroy();

		chart = new ChartConstructor(chartCanvas, {
			type: 'bar',
			data: {
				labels: stats.map((item) => item.hobbyName),
				datasets: [
					{
						label: 'Liczba aktywności',
						data: stats.map((item) => item.count),
						backgroundColor: stats.map((item) => item.hobbyColor),
						borderRadius: 8,
						borderSkipped: false
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (context) => `${context.parsed.y} aktywności`
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: { color: axisColor }
					},
					y: {
						beginAtZero: true,
						ticks: { precision: 0, stepSize: 1, color: axisColor },
						grid: { color: gridColor }
					}
				}
			}
		});
	}

	$: timeline = groupByMonth(data.activities);
	$: activityCount = data.activities.length;
	$: hobbyCount = data.hobbies.length;
	$: monthOptions = getMonthOptions(data.activities);
	$: chartStats = getChartStats(selectedChartMonth);
	$: chartHasData = chartStats.some((item) => item.count > 0);
	$: if (ChartConstructor && chartCanvas && chartHasData) {
		themeVersion;
		renderChart(chartStats);
	}
	$: if (!chartHasData && chart) {
		chart.destroy();
		chart = undefined;
	}

	onMount(() => {
		const handleThemeChange = () => {
			themeVersion += 1;
		};
		window.addEventListener('curio-theme-change', handleThemeChange);

		void import('chart.js/auto').then((module) => {
			ChartConstructor = module.default;
			renderChart(chartStats);
		});
		return () => {
			window.removeEventListener('curio-theme-change', handleThemeChange);
			chart?.destroy();
		};
	});
</script>

<svelte:head>
	<title>Curio</title>
	<meta
		name="description"
		content="Timeline aktywności i statystyki dla Twoich hobby."
	/>
</svelte:head>

<main class="app-shell">
	<section class="hero">
		<div>
			<p class="eyebrow">Dashboard</p>
			<h1>Twoje aktywności</h1>
		</div>
		<div class="summary">
			<div>
				<strong>{hobbyCount}</strong>
				<span>hobby</span>
			</div>
			<div>
				<strong>{activityCount}</strong>
				<span>aktywności</span>
			</div>
		</div>
	</section>

	<div class="workspace">
		<aside class="sidebar">
			<section class="panel">
				<h2>Dodaj hobby</h2>
				<form method="POST" action="?/createHobby" class="stack">
					<label>
						Nazwa
						<input name="name" placeholder="np. Fotografia analogowa" required minlength="2" />
					</label>
					<label>
						Kolor
						<input name="color" type="color" value="#2563eb" />
					</label>
					{#if form?.hobbyError}
						<p class="form-error">{form.hobbyError}</p>
					{/if}
					<button type="submit">Dodaj hobby</button>
				</form>
			</section>

			<section class="panel">
				<h2>Dodaj aktywność</h2>
				<form method="POST" action="?/createActivity" class="stack">
					<label>
						Hobby
						<select name="hobbyId" required disabled={data.hobbies.length === 0}>
							<option value="">Wybierz hobby</option>
							{#each data.hobbies as hobby}
								<option value={hobby.id}>{hobby.name}</option>
							{/each}
						</select>
					</label>
					<label>
						Tytuł
						<input name="title" placeholder="np. 2 godziny szkicowania" required minlength="2" />
					</label>
					<label>
						Data
						<input name="occurredOn" type="date" value={data.today} required />
					</label>
					<label>
						Notatki
						<textarea name="notes" rows="4" placeholder="Opcjonalnie: co poszło dobrze, link, pomysł na kolejny raz"></textarea>
					</label>
					{#if form?.activityError}
						<p class="form-error">{form.activityError}</p>
					{/if}
					<button type="submit" disabled={data.hobbies.length === 0}>Dodaj aktywność</button>
				</form>
			</section>

			<section class="panel hobby-list">
				<h2>Hobbies</h2>
				{#if data.hobbies.length > 0}
					<ul>
						{#each data.hobbies as hobby}
							<li>
								<span class="dot" style={`--color: ${hobby.color}`}></span>
								{hobby.name}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="muted">Dodaj pierwsze hobby, a formularz aktywności od razu ruszy.</p>
				{/if}
			</section>
		</aside>

		<section class="content">
			<section class="chart-panel">
				<div class="chart-heading">
					<div>
						<p class="eyebrow">Porównanie</p>
						<h2>Aktywności według hobby</h2>
					</div>
					<label class="month-filter">
						Miesiąc
						<select bind:value={selectedChartMonth} disabled={monthOptions.length === 0}>
							<option value="all">Wszystkie miesiące</option>
							{#each monthOptions as month}
								<option value={month.key}>{month.label}</option>
							{/each}
						</select>
					</label>
				</div>
				{#if chartHasData}
					<div class="chart-wrap">
						<canvas bind:this={chartCanvas} aria-label="Wykres aktywności według hobby"></canvas>
					</div>
				{:else}
					<div class="empty chart-empty">
						{selectedChartMonth === 'all'
							? 'Wykres pojawi się po dodaniu pierwszej aktywności.'
							: 'Brak aktywności w wybranym miesiącu.'}
					</div>
				{/if}
			</section>

			<section class="timeline-panel">
				<div class="section-heading">
					<div>
						<p class="eyebrow">Timeline</p>
						<h2>Aktywności miesiąc po miesiącu</h2>
					</div>
				</div>

				{#if timeline.length > 0}
					<div class="timeline">
						{#each timeline as month (month.key)}
							<section class="month">
								<h3>{month.label}</h3>
								<div class="month-items">
									{#each month.activities as activity}
										<article class="activity">
											<div class="activity-date">{dayFormatter.format(new Date(`${activity.occurredOn}T12:00:00`))}</div>
											<div class="activity-body">
												<div class="activity-header">
													<strong>{activity.title}</strong>
													<span style={`--color: ${activity.hobbyColor}`}>{activity.hobbyName}</span>
												</div>
												{#if activity.notes}
													<p>{activity.notes}</p>
												{/if}
											</div>
										</article>
									{/each}
								</div>
							</section>
						{/each}
					</div>
				{:else}
					<div class="empty">Nie ma jeszcze aktywności. Dodaj hobby, potem pierwszą aktywność i timeline zapełni się automatycznie.</div>
				{/if}
			</section>
		</section>
	</div>
</main>

<style>
	.app-shell {
		width: min(1180px, calc(100% - 32px));
		margin: 0 auto;
		padding: 28px 0 56px;
	}

	.hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 28px;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: var(--accent);
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 0;
		font-size: clamp(2rem, 4vw, 3rem);
		line-height: 1;
	}

	h2 {
		margin-bottom: 18px;
		font-size: 1.15rem;
	}

	.summary {
		display: grid;
		grid-template-columns: repeat(2, minmax(108px, 1fr));
		gap: 10px;
	}

	.summary div,
	.panel,
	.chart-panel,
	.timeline-panel {
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--panel-bg);
		box-shadow: var(--shadow);
	}

	.summary div {
		padding: 16px;
	}

	.summary strong {
		display: block;
		font-size: 2rem;
		line-height: 1;
	}

	.summary span,
	.muted {
		color: var(--muted-text);
	}

	.workspace {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: 22px;
		align-items: start;
	}

	.sidebar,
	.content {
		display: grid;
		gap: 18px;
	}

	.panel,
	.chart-panel,
	.timeline-panel {
		padding: 20px;
	}

	.stack {
		display: grid;
		gap: 14px;
	}

	label {
		display: grid;
		gap: 7px;
		color: var(--soft-text);
		font-size: 0.9rem;
		font-weight: 700;
	}

	input,
	select,
	textarea {
		width: 100%;
		border: 1px solid var(--field-border);
		border-radius: 8px;
		background: var(--field-bg);
		color: var(--text);
		padding: 11px 12px;
	}

	input[type='color'] {
		height: 44px;
		padding: 4px;
	}

	textarea {
		resize: vertical;
	}

	button {
		border: 0;
		border-radius: 8px;
		background: var(--button-bg);
		color: var(--button-text);
		cursor: pointer;
		font-weight: 800;
		padding: 12px 14px;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.form-error {
		margin: 0;
		color: #b91c1c;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.hobby-list ul {
		display: grid;
		gap: 9px;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.hobby-list li {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		background: var(--color);
	}

	.chart-panel {
		display: grid;
		gap: 6px;
	}

	.chart-heading {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 16px;
	}

	.month-filter {
		width: min(240px, 100%);
	}

	.chart-wrap {
		height: 300px;
		min-height: 300px;
	}

	.section-heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}

	.timeline {
		display: grid;
		gap: 28px;
	}

	.month {
		display: grid;
		grid-template-columns: 160px minmax(0, 1fr);
		gap: 18px;
	}

	.month h3 {
		margin: 0;
		color: var(--soft-text);
		font-size: 1rem;
		text-transform: capitalize;
	}

	.month-items {
		display: grid;
		gap: 12px;
		position: relative;
	}

	.activity {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr);
		gap: 14px;
		align-items: start;
	}

	.activity-date {
		color: var(--muted-text);
		font-size: 0.85rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.activity-body {
		border-left: 3px solid var(--field-border);
		padding-left: 14px;
	}

	.activity-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 5px;
	}

	.activity-header span {
		border-radius: 999px;
		background: color-mix(in srgb, var(--color) 13%, white);
		color: var(--color);
		font-size: 0.78rem;
		font-weight: 800;
		padding: 4px 9px;
	}

	.activity-body p {
		margin-bottom: 0;
		color: var(--muted-text);
		line-height: 1.5;
	}

	.empty {
		border: 1px dashed var(--field-border);
		border-radius: 8px;
		background: var(--empty-bg);
		color: var(--muted-text);
		padding: 22px;
	}

	.chart-empty {
		display: grid;
		min-height: 220px;
		place-items: center;
		text-align: center;
	}

	@media (max-width: 860px) {
		.hero,
		.chart-heading,
		.workspace,
		.month,
		.activity {
			grid-template-columns: 1fr;
		}

		.hero,
		.chart-heading {
			display: grid;
		}

		.month-filter {
			width: 100%;
		}

		.summary {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.month {
			gap: 10px;
		}

		.activity {
			gap: 6px;
		}
	}
</style>
