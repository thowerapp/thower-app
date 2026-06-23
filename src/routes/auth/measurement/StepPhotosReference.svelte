<script lang="ts">
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import { ArrowRight, Camera, CheckCircle2, LoaderCircle, Upload } from 'lucide-svelte';

	type PhotoPosition = 'front' | 'side' | 'back';

	type PhotoSlot = {
		position: PhotoPosition;
		field: 'frontUrl' | 'sideUrl' | 'backUrl';
		label: string;
		alt: string;
		capture?: 'user' | 'environment';
		help: string;
	};

	const photoSlots: PhotoSlot[] = [
		{
			position: 'front',
			field: 'frontUrl',
			label: 'Face',
			alt: 'Photo de reference de face',
			capture: 'user',
			help: 'Debout, bras relaches, cadrage tete-pieds.'
		},
		{
			position: 'side',
			field: 'sideUrl',
			label: 'Profil',
			alt: 'Photo de reference de profil',
			capture: 'environment',
			help: 'Profil naturel, posture droite, meme distance.'
		},
		{
			position: 'back',
			field: 'backUrl',
			label: 'Dos',
			alt: 'Photo de reference de dos',
			capture: 'environment',
			help: 'Dos complet, bras relaches, lumiere stable.'
		}
	];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { formData, onnext }: { formData: any; onnext: () => void } = $props();

	let uploadingPosition = $state<PhotoPosition | null>(null);
	let uploadError = $state<string | null>(null);

	const isUploading = $derived(uploadingPosition !== null);
	const isComplete = $derived(
		Boolean($formData.frontUrl && $formData.sideUrl && $formData.backUrl)
	);

	function getPhotoUrl(field: PhotoSlot['field']): string {
		return String($formData[field] ?? '');
	}

	function setPhotoUrl(field: PhotoSlot['field'], url: string) {
		$formData[field] = url;
	}

	async function uploadPhoto(file: File, slot: PhotoSlot) {
		const body = new FormData();
		body.append('file', file);

		try {
			uploadingPosition = slot.position;
			uploadError = null;

			const response = await fetch('/api/cloudflare/r2/upload', {
				method: 'POST',
				body
			});

			if (!response.ok) {
				const error = await response.text();
				uploadError = `Erreur upload ${slot.label.toLowerCase()} : ${error}`;
				return;
			}

			const { url } = (await response.json()) as { url?: string };
			if (!url) {
				uploadError = `L'upload ${slot.label.toLowerCase()} n'a pas renvoye d'URL.`;
				return;
			}

			setPhotoUrl(slot.field, url);
		} catch (error) {
			console.error(error);
			uploadError = `Erreur reseau pendant l'upload ${slot.label.toLowerCase()}.`;
		} finally {
			uploadingPosition = null;
		}
	}

	async function handleFileChange(event: Event, slot: PhotoSlot) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		await uploadPhoto(file, slot);
		input.value = '';
	}
</script>

<div class="step-content">
	<div class="step-heading">
		<Camera class="step-icon" />
		<div>
			<h2 class="step-title">Photos de reference</h2>
			<p class="step-desc">
				Face, profil et dos sont obligatoires pour suivre ton evolution avec un point de depart
				fiable.
			</p>
		</div>
	</div>

	<Card.Root class="meas-card">
		<Card.Content class="pt-5 pb-5 space-y-4">
			<p class="photo-instructions">
				Prends les photos en pied, dans une lumiere stable, avec le meme recul. Elles restent
				stockees de facon securisee dans ton espace.
			</p>

			{#if uploadError}
				<div class="error-banner" role="alert">
					{uploadError}
				</div>
			{/if}

			<div class="photos-grid">
				{#each photoSlots as slot (slot.position)}
					{@const photoUrl = getPhotoUrl(slot.field)}
					<div class="photo-zone">
						<div class="photo-label-row">
							<span class="meas-label">{slot.label}</span>
							{#if photoUrl}
								<span class="uploaded-pill">
									<CheckCircle2 class="h-3.5 w-3.5" />
									OK
								</span>
							{/if}
						</div>

						<div class:has-photo={Boolean(photoUrl)} class="upload-area">
							{#if photoUrl}
								<img src={photoUrl} alt={slot.alt} />
								<label class="replace-photo" for={`${slot.position}-photo-input`}>
									Remplacer
								</label>
							{:else}
								<label class="upload-label" for={`${slot.position}-photo-input`}>
									{#if uploadingPosition === slot.position}
										<LoaderCircle class="h-8 w-8 animate-spin" />
										<span>Upload...</span>
									{:else}
										<Upload class="h-8 w-8" />
										<span>Ajouter</span>
									{/if}
								</label>
							{/if}

							<input
								id={`${slot.position}-photo-input`}
								type="file"
								accept="image/*"
								capture={slot.capture}
								onchange={(event) => handleFileChange(event, slot)}
								disabled={isUploading}
								class="sr-only"
								aria-label={`Ajouter la photo ${slot.label.toLowerCase()}`}
							/>
						</div>

						<p class="photo-help">{slot.help}</p>
						<input type="hidden" name={slot.field} value={photoUrl} />
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Button
		type="button"
		size="lg"
		class="w-full gap-2 meas-btn-primary"
		onclick={onnext}
		disabled={!isComplete || isUploading}
	>
		{isUploading ? 'Upload en cours...' : 'Continuer'}
		<ArrowRight class="h-4 w-4" />
	</Button>
</div>

<style lang="scss">
	.step-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.step-heading {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	:global(.step-icon) {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--primary);
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.step-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		line-height: 1.2;
	}

	.step-desc,
	.photo-instructions,
	.photo-help {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin: 0.2rem 0 0;
		line-height: 1.4;
	}

	.photo-instructions {
		color: rgba(240, 237, 232, 0.72);
	}

	.error-banner {
		border: 1px solid rgba(239, 68, 68, 0.35);
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
	}

	.photos-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	.photo-zone {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.photo-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.uploaded-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		border-radius: 999px;
		background: rgba(58, 184, 184, 0.12);
		color: #3ab8b8;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.2rem 0.5rem;
	}

	.upload-area {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border: 1px dashed rgba(58, 184, 184, 0.45);
		border-radius: 0.75rem;
		background:
			linear-gradient(180deg, rgba(58, 184, 184, 0.08), rgba(10, 10, 10, 0.72)),
			#0a0a0a;
		transition:
			border-color 0.2s ease,
			background 0.2s ease;
	}

	.upload-area:hover {
		border-color: #3ab8b8;
		background:
			linear-gradient(180deg, rgba(58, 184, 184, 0.13), rgba(10, 10, 10, 0.72)),
			#0a0a0a;
	}

	.upload-area.has-photo {
		border-style: solid;
		border-color: rgba(201, 168, 76, 0.45);
	}

	.upload-area img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.upload-label,
	.replace-photo {
		cursor: pointer;
		color: #3ab8b8;
		font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.upload-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		text-align: center;
	}

	.replace-photo {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		border-radius: 999px;
		background: rgba(10, 10, 10, 0.82);
		border: 1px solid rgba(201, 168, 76, 0.45);
		color: #c9a84c;
		font-size: 0.7rem;
		padding: 0.35rem 0.6rem;
	}

	@media (min-width: 640px) {
		.photos-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
