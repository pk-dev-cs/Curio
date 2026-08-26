<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let fileInput: HTMLInputElement;
	let selectedImageName = '';
	let isDraggingImage = false;
	let selectedHobbyFilter = 'all';
	let editingMilestoneId: number | null = null;
	let openedImage: { src: string; title: string } | null = null;
	let uploadError = '';
	let isUploadingImage = false;

	const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	});

	function updateSelectedImage() {
		selectedImageName = fileInput.files?.[0]?.name ?? '';
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDraggingImage = true;
	}

	function handleDragLeave(event: DragEvent) {
		if (event.currentTarget === event.target) {
			isDraggingImage = false;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingImage = false;

		const files = event.dataTransfer?.files;
		if (!files?.length) return;

		fileInput.files = files;
		updateSelectedImage();
	}

	function toggleEditing(id: number) {
		editingMilestoneId = editingMilestoneId === id ? null : id;
	}

	function formEditMilestoneId(actionForm: ActionData) {
		return actionForm && 'editMilestoneId' in actionForm ? actionForm.editMilestoneId : undefined;
	}

	async function prepareImageUpload(event: SubmitEvent) {
		const formElement = event.currentTarget as HTMLFormElement;
		if (formElement.dataset.imageUploaded === 'true') return;

		const imageInput = formElement.querySelector<HTMLInputElement>('input[type="file"]');
		const image = imageInput?.files?.[0];
		if (!image) return;

		event.preventDefault();
		uploadError = '';
		isUploadingImage = true;

		try {
			const prepareResponse = await fetch('/api/milestone-uploads', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contentType: image.type, size: image.size })
			});
			if (!prepareResponse.ok) throw new Error(await prepareResponse.text());

			const upload = (await prepareResponse.json()) as {
				key: string;
				url: string;
				fields: Record<string, string>;
			};
			const uploadForm = new FormData();
			for (const [name, value] of Object.entries(upload.fields)) uploadForm.append(name, value);
			uploadForm.append('file', image);

			const uploadResponse = await fetch(upload.url, { method: 'POST', body: uploadForm });
			if (!uploadResponse.ok) throw new Error('Railway Bucket odrzucił przesyłanie zdjęcia.');

			const imageKey = document.createElement('input');
			imageKey.type = 'hidden';
			imageKey.name = 'imageKey';
			imageKey.value = upload.key;
			formElement.append(imageKey);
			imageInput?.removeAttribute('name');
			formElement.dataset.imageUploaded = 'true';
			formElement.requestSubmit();
		} catch (cause) {
			uploadError = cause instanceof Error ? cause.message : 'Nie udało się przesłać zdjęcia.';
			isUploadingImage = false;
		}
	}

	$: filteredMilestones =
		selectedHobbyFilter === 'all'
			? data.milestones
			: data.milestones.filter((milestone) => milestone.hobbyId === Number(selectedHobbyFilter));
</script>

<svelte:head>
	<title>Milestones | Curio</title>
	<meta name="description" content="Milestones i achievements powiązane z Twoimi hobby." />
</svelte:head>

<main class="app-shell">
	<section class="page-heading">
		<div>
			<p class="eyebrow">Milestones</p>
			<h1>Osiągnięcia związane z zainteresowaniami</h1>
		</div>
		<label class="filter">
			Filtruj po hobby
			<select bind:value={selectedHobbyFilter} disabled={data.hobbies.length === 0}>
				<option value="all">Wszystkie hobby</option>
				{#each data.hobbies as hobby}
					<option value={hobby.id}>{hobby.name}</option>
				{/each}
			</select>
		</label>
	</section>

	<div class="workspace">
		<aside class="panel">
			<h2>Dodaj milestone</h2>
			<form method="POST" action="?/createMilestone" class="stack" onsubmit={prepareImageUpload}>
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
					Nagłówek
					<input name="title" placeholder="np. Pierwszy ukończony model" required minlength="2" />
				</label>
				<div class="field">
					<span>Zdjęcie</span>
					<label
						class:dragging={isDraggingImage}
						class="dropzone"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
					>
						<input
							bind:this={fileInput}
							name="image"
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							onchange={updateSelectedImage}
						/>
						<strong>{selectedImageName || 'Przeciągnij zdjęcie albo wybierz z dysku'}</strong>
						<small>JPG, PNG, WebP albo GIF, maksymalnie 5 MB</small>
					</label>
				</div>
				<label>
					Data
					<input name="achievedOn" type="date" value={data.today} required />
				</label>
				<label>
					Opis
					<textarea
						name="description"
						rows="6"
						placeholder="Co się udało, dlaczego to ważne, co chcesz zapamiętać?"
						required
						minlength="5"
					></textarea>
				</label>
				{#if form?.milestoneError}
					<p class="form-error">{form.milestoneError}</p>
				{/if}
				{#if uploadError}<p class="form-error">{uploadError}</p>{/if}
				<button type="submit" disabled={data.hobbies.length === 0 || isUploadingImage}>
					{isUploadingImage ? 'Przesyłanie zdjęcia…' : 'Dodaj milestone'}
				</button>
			</form>
			{#if data.hobbies.length === 0}
				<p class="muted sidebar-note">Najpierw dodaj hobby na Dashboardzie, potem wróć tutaj po pierwsze osiągnięcie.</p>
			{/if}
		</aside>

		<section class="milestones">
			{#if filteredMilestones.length > 0}
				{#each filteredMilestones as milestone}
					<article class="milestone-card">
						{#if milestone.imageUrl}
							<button
								class="image-button"
								type="button"
								aria-label={`Otwórz pełne zdjęcie: ${milestone.title}`}
								onclick={() => (openedImage = { src: milestone.imageUrl ?? '', title: milestone.title })}
							>
								<img src={milestone.imageUrl} alt="" loading="lazy" />
							</button>
						{:else}
							<div class="image-placeholder">
								<span style={`--color: ${milestone.hobbyColor}`}></span>
							</div>
						{/if}
						<div class="milestone-body">
							<div class="milestone-meta">
								<span class="hobby-pill" style={`--color: ${milestone.hobbyColor}`}>
									{milestone.hobbyName}
								</span>
								<time datetime={milestone.achievedOn}>
									{dateFormatter.format(new Date(`${milestone.achievedOn}T12:00:00`))}
								</time>
							</div>
							<h2>{milestone.title}</h2>
							<p>{milestone.description}</p>
							<button class="secondary-button" type="button" onclick={() => toggleEditing(milestone.id)}>
								{editingMilestoneId === milestone.id ? 'Zamknij edycję' : 'Edytuj'}
							</button>

							{#if editingMilestoneId === milestone.id || formEditMilestoneId(form) === milestone.id}
								<form method="POST" action="?/updateMilestone" class="edit-form" onsubmit={prepareImageUpload}>
									<input type="hidden" name="id" value={milestone.id} />
									<label>
										Hobby
										<select name="hobbyId" required>
											{#each data.hobbies as hobby}
												<option value={hobby.id} selected={hobby.id === milestone.hobbyId}>{hobby.name}</option>
											{/each}
										</select>
									</label>
									<label>
										Nagłówek
										<input name="title" value={milestone.title} required minlength="2" />
									</label>
									<label>
										Zmień zdjęcie
										<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
									</label>
									<label>
										Data
										<input name="achievedOn" type="date" value={milestone.achievedOn} required />
									</label>
									<label>
										Opis
										<textarea name="description" rows="5" required minlength="5">{milestone.description}</textarea>
									</label>
									{#if form?.updateError && formEditMilestoneId(form) === milestone.id}
										<p class="form-error">{form.updateError}</p>
									{/if}
									<button type="submit">Zapisz zmiany</button>
								</form>
							{/if}
						</div>
					</article>
				{/each}
			{:else}
				<div class="empty">
					{data.milestones.length === 0
						? 'Nie ma jeszcze milestone’ów. Dodaj coś, co warto zapamiętać: pierwszy projekt, ukończony kurs, występ, publikację albo mały prywatny przełom.'
						: 'Brak milestone’ów dla wybranego hobby.'}
				</div>
			{/if}
		</section>
	</div>
</main>

{#if openedImage}
	<div class="image-modal" role="dialog" aria-modal="true" aria-label={`Zdjęcie milestone: ${openedImage.title}`}>
		<button class="modal-backdrop" type="button" aria-label="Zamknij podgląd zdjęcia" onclick={() => (openedImage = null)}></button>
		<div class="modal-content">
			<div class="modal-header">
				<strong>{openedImage.title}</strong>
				<button class="icon-button" type="button" aria-label="Zamknij podgląd zdjęcia" onclick={() => (openedImage = null)}>
					×
				</button>
			</div>
			<img src={openedImage.src} alt="" />
			<a href={openedImage.src} target="_blank" rel="noreferrer">Otwórz w nowej karcie</a>
		</div>
	</div>
{/if}

<style>
	.app-shell {
		width: 100%;
		margin: 0;
		padding: 28px 24px 56px;
	}

	.page-heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 20px;
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
	p {
		margin-top: 0;
	}

	h1 {
		max-width: 760px;
		margin-bottom: 0;
		font-size: clamp(2rem, 4vw, 3rem);
		line-height: 1;
	}

	h2 {
		margin-bottom: 18px;
		font-size: 1.15rem;
	}

	.filter {
		width: min(260px, 100%);
	}

	.workspace {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: 22px;
		align-items: start;
	}

	.panel,
	.milestone-card {
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--panel-bg);
		box-shadow: var(--shadow);
	}

	.panel {
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

	.field {
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

	.dropzone {
		align-items: center;
		border: 1px dashed var(--field-border);
		border-radius: 8px;
		cursor: pointer;
		display: grid;
		gap: 6px;
		min-height: 118px;
		place-items: center;
		padding: 18px;
		text-align: center;
		transition:
			background-color 160ms ease,
			border-color 160ms ease,
			color 160ms ease;
	}

	.dropzone.dragging {
		background: color-mix(in srgb, var(--accent) 9%, transparent);
		border-color: var(--accent);
		color: var(--text);
	}

	.dropzone input {
		height: 1px;
		opacity: 0;
		padding: 0;
		position: absolute;
		width: 1px;
	}

	.dropzone strong {
		color: var(--text);
		font-size: 0.95rem;
	}

	.dropzone small {
		color: var(--muted-text);
		font-size: 0.8rem;
		font-weight: 700;
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

	.muted {
		color: var(--muted-text);
	}

	.sidebar-note {
		margin: 16px 0 0;
		line-height: 1.5;
	}

	.milestones {
		display: grid;
		gap: 16px;
	}

	.milestone-card {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		overflow: hidden;
	}

	.image-button {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: zoom-in;
		display: block;
		padding: 0;
		text-align: inherit;
	}

	.milestone-card img,
	.image-placeholder {
		width: 100%;
		height: 100%;
		min-height: 220px;
		object-fit: cover;
	}

	.image-placeholder {
		display: grid;
		place-items: center;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--color) 26%, transparent), transparent),
			var(--empty-bg);
	}

	.image-placeholder span {
		width: 52px;
		height: 52px;
		border: 3px solid color-mix(in srgb, var(--color) 45%, var(--field-border));
		border-radius: 999px;
		box-shadow: inset 0 0 0 12px color-mix(in srgb, var(--color) 18%, transparent);
	}

	.milestone-body {
		padding: 20px;
	}

	.milestone-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
	}

	.hobby-pill {
		border-radius: 999px;
		background: color-mix(in srgb, var(--color) 13%, white);
		color: var(--color);
		font-size: 0.78rem;
		font-weight: 800;
		padding: 4px 9px;
	}

	time {
		color: var(--muted-text);
		font-size: 0.85rem;
		font-weight: 800;
	}

	.milestone-body p {
		margin-bottom: 0;
		color: var(--muted-text);
		line-height: 1.55;
	}

	.secondary-button {
		border: 1px solid var(--border);
		background: var(--panel-bg);
		color: var(--text);
		margin-top: 18px;
	}

	.edit-form {
		border-top: 1px solid var(--border);
		display: grid;
		gap: 14px;
		margin-top: 18px;
		padding-top: 18px;
	}

	.empty {
		border: 1px dashed var(--field-border);
		border-radius: 8px;
		background: var(--empty-bg);
		color: var(--muted-text);
		line-height: 1.55;
		padding: 22px;
	}

	.image-modal {
		display: grid;
		inset: 0;
		padding: 28px;
		place-items: center;
		position: fixed;
		z-index: 20;
	}

	.modal-backdrop {
		background: rgb(15 23 42 / 0.78);
		border: 0;
		inset: 0;
		position: fixed;
	}

	.modal-content {
		background: var(--panel-bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 24px 80px rgb(0 0 0 / 0.34);
		display: grid;
		gap: 12px;
		max-height: min(860px, calc(100vh - 56px));
		max-width: min(980px, calc(100vw - 56px));
		overflow: hidden;
		padding: 14px;
		position: relative;
		width: max-content;
	}

	.modal-header {
		align-items: center;
		display: flex;
		gap: 16px;
		justify-content: space-between;
	}

	.icon-button {
		align-items: center;
		border: 1px solid var(--border);
		background: var(--field-bg);
		color: var(--text);
		display: inline-grid;
		font-size: 1.4rem;
		height: 34px;
		line-height: 1;
		padding: 0;
		place-items: center;
		width: 34px;
	}

	.modal-content img {
		display: block;
		max-height: min(720px, calc(100vh - 180px));
		max-width: min(920px, calc(100vw - 84px));
		object-fit: contain;
	}

	.modal-content a {
		color: var(--accent);
		font-weight: 800;
		text-decoration: none;
	}

	@media (max-width: 860px) {
		.app-shell {
			padding-inline: 16px;
		}

		.page-heading,
		.workspace,
		.milestone-card {
			grid-template-columns: 1fr;
		}

		.page-heading {
			align-items: start;
			display: grid;
		}

		.filter {
			width: 100%;
		}

		.milestone-card img,
		.image-placeholder {
			aspect-ratio: 16 / 9;
			min-height: auto;
		}
	}
</style>
