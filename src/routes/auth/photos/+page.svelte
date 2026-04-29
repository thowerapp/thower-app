<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let frontUrl = $state<string | null>(null);
	let sideUrl = $state<string | null>(null);
	let backUrl = $state<string | null>(null);
	let uploading = $state(false);
	let uploadError = $state<string | null>(null);
	let submitting = $state(false);

	async function uploadPhoto(
		file: File,
		position: 'front' | 'side' | 'back'
	): Promise<string | null> {
		const formData = new FormData();
		formData.append('file', file);

		try {
			uploading = true;
			uploadError = null;

			const response = await fetch('/api/cloudflare/r2/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.text();
				uploadError = `Erreur upload ${position}: ${error}`;
				return null;
			}

			const { url } = (await response.json()) as { url: string };
			return url;
		} catch (error) {
			uploadError = `Erreur réseau pour ${position}`;
			console.error(error);
			return null;
		} finally {
			uploading = false;
		}
	}

	async function handleFileChange(
		event: Event,
		position: 'front' | 'side' | 'back'
	) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const url = await uploadPhoto(file, position);
		if (url) {
			if (position === 'front') frontUrl = url;
			else if (position === 'side') sideUrl = url;
			else if (position === 'back') backUrl = url;
		}
	}

	function isComplete(): boolean {
		return !!frontUrl && !!sideUrl && !!backUrl;
	}
</script>

<div class="auth-container">
	<div class="auth-card">
		<h1>Photos de référence</h1>
		<p class="subtitle">
			Ces 3 photos aident à estimer votre pourcentage de masse grasse pour mieux personnaliser la
			nutrition. Vous pouvez aussi passer cette étape et continuer.
		</p>

		<a href="/auth/measurement" class="skip-link">Passer cette étape pour le moment</a>

		{#if uploadError}
			<div class="error-banner">
				{uploadError}
			</div>
		{/if}

		<form method="POST" action="?/submitPhotos" use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}>
			<div class="photos-grid">
				<!-- Photo avant -->
				<div class="photo-zone">
					<div class="photo-label">Face</div>
					<div class="upload-area">
						{#if frontUrl}
							<img src={frontUrl} alt="Vue avant" />
							<div class="uploaded-badge">✓ Uploadée</div>
						{:else}
							<label for="front-input" class="upload-label">
								<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="17 8 12 3 7 8"></polyline>
									<line x1="12" y1="3" x2="12" y2="15"></line>
								</svg>
								<span>Cliquer ou glisser</span>
							</label>
							<input
								id="front-input"
								type="file"
								accept="image/*"
								capture="user"
								onchange={(e) => handleFileChange(e, 'front')}
								disabled={uploading}
								style="display: none;"
							/>
						{/if}
					</div>
					<input type="hidden" name="frontUrl" value={frontUrl ?? ''} />
				</div>

				<!-- Photo profil -->
				<div class="photo-zone">
					<div class="photo-label">Profil</div>
					<div class="upload-area">
						{#if sideUrl}
							<img src={sideUrl} alt="Vue profil" />
							<div class="uploaded-badge">✓ Uploadée</div>
						{:else}
							<label for="side-input" class="upload-label">
								<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="17 8 12 3 7 8"></polyline>
									<line x1="12" y1="3" x2="12" y2="15"></line>
								</svg>
								<span>Cliquer ou glisser</span>
							</label>
							<input
								id="side-input"
								type="file"
								accept="image/*"
								capture="user"
								onchange={(e) => handleFileChange(e, 'side')}
								disabled={uploading}
								style="display: none;"
							/>
						{/if}
					</div>
					<input type="hidden" name="sideUrl" value={sideUrl ?? ''} />
				</div>

				<!-- Photo arrière -->
				<div class="photo-zone">
					<div class="photo-label">Dos</div>
					<div class="upload-area">
						{#if backUrl}
							<img src={backUrl} alt="Vue arriere" />
							<div class="uploaded-badge">✓ Uploadée</div>
						{:else}
							<label for="back-input" class="upload-label">
								<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="17 8 12 3 7 8"></polyline>
									<line x1="12" y1="3" x2="12" y2="15"></line>
								</svg>
								<span>Cliquer ou glisser</span>
							</label>
							<input
								id="back-input"
								type="file"
								accept="image/*"
								capture="user"
								onchange={(e) => handleFileChange(e, 'back')}
								disabled={uploading}
								style="display: none;"
							/>
						{/if}
					</div>
					<input type="hidden" name="backUrl" value={backUrl ?? ''} />
				</div>
			</div>

			<button
				type="submit"
				disabled={!isComplete() || uploading || submitting}
				class="submit-btn"
			>
				{submitting ? 'Envoi en cours...' : 'Envoyer mes photos'}
			</button>
		</form>

		<p class="help-text">
			Les photos sont recommandées mais non bloquantes. Vous pourrez les mettre à jour pendant le
			suivi mensuel depuis votre profil.
		</p>
	</div>
</div>

<style>
	.auth-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: 20px;
		background: var(--bg);
	}

	.auth-card {
		width: 100%;
		max-width: 600px;
		padding: 40px;
		background: var(--s1);
		border-radius: 8px;
		border: 1px solid var(--br);
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 10px 0;
		color: var(--tx);
		font-family: var(--fh2);
	}

	.subtitle {
		font-size: 0.875rem;
		color: var(--txd);
		margin: 0 0 24px 0;
		line-height: 1.5;
	}

	.skip-link {
		display: inline-block;
		font-size: 0.75rem;
		font-family: var(--fb);
		color: var(--cy);
		text-decoration: none;
		margin: -8px 0 8px;
	}

	.skip-link:hover {
		opacity: 0.85;
	}

	.error-banner {
		background: rgba(255, 100, 100, 0.1);
		border-left: 3px solid var(--err);
		padding: 12px 16px;
		border-radius: 4px;
		font-size: 0.875rem;
		color: var(--err);
		margin-bottom: 20px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 16px;
	}

	.photo-zone {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.photo-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--txd);
		font-family: var(--fb);
		letter-spacing: 0.05em;
	}

	.upload-area {
		position: relative;
		aspect-ratio: 3 / 4;
		border: 2px dashed var(--br2);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 229, 255, 0.03);
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.upload-area:hover:not(:has(img)) {
		border-color: var(--cy);
		background: rgba(0, 229, 255, 0.08);
	}

	.upload-area img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.upload-label {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		color: var(--txd);
		font-size: 0.75rem;
		text-align: center;
		padding: 12px;
		transition: color 0.3s ease;
	}

	.upload-label:hover {
		color: var(--cy);
	}

	.uploaded-badge {
		position: absolute;
		top: 6px;
		right: 6px;
		background: var(--g);
		color: var(--s1);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 0.625rem;
		font-weight: 700;
	}

	.submit-btn {
		background: var(--g);
		color: var(--s1);
		border: none;
		padding: 14px 28px;
		font-size: 0.875rem;
		font-weight: 700;
		font-family: var(--fh2);
		cursor: pointer;
		border-radius: 6px;
		transition: opacity 0.3s ease;
		letter-spacing: 0.04em;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:not(:disabled):hover {
		opacity: 0.9;
	}

	.help-text {
		font-size: 0.75rem;
		color: var(--txd);
		text-align: center;
		margin: 0;
		line-height: 1.4;
	}
</style>
