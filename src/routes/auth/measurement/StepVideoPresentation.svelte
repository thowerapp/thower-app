<script lang="ts">
	import { Button } from '$shadcn/button';
	import { ArrowRight, ExternalLink, PlayCircle } from 'lucide-svelte';

	type Props = {
		videoUrl: string;
		onnext: () => void;
		eyebrow?: string;
		title?: string;
		copy?: string;
		buttonLabel?: string;
		placeholder?: string;
		iframeTitle?: string;
		materialTitle?: string;
		materialDescription?: string;
		materialUrl?: string;
		materialLinkLabel?: string;
	};

	let {
		videoUrl,
		onnext,
		eyebrow = 'Avant de commencer',
		title = 'Regarde cette vidéo de présentation',
		copy = 'Prends quelques minutes pour comprendre la suite du parcours, puis continue vers le formulaire.',
		buttonLabel = 'Continuer',
		placeholder = "Vidéo de présentation à configurer avec l'UUID Cloudflare Stream.",
		iframeTitle = 'Vidéo de présentation Thower',
		materialTitle = 'Matériel nécessaire',
		materialDescription = '',
		materialUrl = '',
		materialLinkLabel = "Voir le kit d'élastiques"
	}: Props = $props();
</script>

<div class="step-video-presentation">
	<div class="video-card meas-card">
		<div class="video-heading">
			<PlayCircle class="h-8 w-8 step-icon" />
			<div>
				<p class="eyebrow">{eyebrow}</p>
				<h2>{title}</h2>
			</div>
		</div>

		{#if videoUrl}
			<div class="video-frame">
				<iframe
					src={videoUrl}
					title={iframeTitle}
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
					allowfullscreen
					class="h-full w-full"
				></iframe>
			</div>
		{:else}
			<div class="video-frame video-placeholder">
				<p>{placeholder}</p>
			</div>
		{/if}

		<p class="video-copy">{copy}</p>

		{#if materialUrl}
			<div class="material-card">
				<div>
					<p class="material-title">{materialTitle}</p>
					{#if materialDescription}
						<p class="material-description">{materialDescription}</p>
					{/if}
				</div>
				<a class="material-link" href={materialUrl} target="_blank" rel="noreferrer">
					{materialLinkLabel}
					<ExternalLink class="h-4 w-4" />
				</a>
			</div>
		{/if}
	</div>

	<Button type="button" size="lg" class="w-full mt-6 gap-2 meas-btn-primary" onclick={onnext}>
		{buttonLabel}
		<ArrowRight class="h-4 w-4" />
	</Button>
</div>

<style lang="scss">
	.step-video-presentation {
		display: flex;
		flex-direction: column;
	}

	.video-card {
		margin-top: 1.5rem;
		border-left: 3px solid var(--primary);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.video-heading {
		display: flex;
		gap: 0.875rem;
		align-items: center;
		margin-bottom: 1.25rem;
	}

	.eyebrow {
		margin: 0 0 0.25rem;
		color: #c9a84c !important;
		font-family:
			'DM Sans',
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	h2 {
		margin: 0;
		color: #3ab8b8;
	}

	.video-frame {
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border: 1px solid rgba(240, 237, 232, 0.12);
		border-radius: 0.75rem;
		background: #000;
	}

	.video-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		text-align: center;
	}

	.video-placeholder p {
		margin: 0;
		color: rgba(240, 237, 232, 0.65) !important;
		font-size: 0.875rem;
	}

	.video-copy {
		margin: 1rem 0 0;
		color: rgba(240, 237, 232, 0.7) !important;
		font-size: 0.9375rem;
	}

	.material-card {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		margin-top: 1rem;
		border: 1px solid rgba(201, 168, 76, 0.25);
		border-radius: 0.75rem;
		padding: 1rem;
		background: rgba(201, 168, 76, 0.08);
	}

	.material-title {
		margin: 0 0 0.25rem;
		color: #c9a84c !important;
		font-family:
			'DM Sans',
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.material-description {
		margin: 0;
		color: rgba(240, 237, 232, 0.72) !important;
		font-size: 0.875rem;
	}

	.material-link {
		display: inline-flex;
		flex-shrink: 0;
		gap: 0.4rem;
		align-items: center;
		color: #3ab8b8 !important;
		font-family:
			'DM Sans',
			system-ui,
			-apple-system,
			sans-serif;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: none;
	}

	.material-link:hover {
		color: #5ee1e1 !important;
	}

	@media (max-width: 640px) {
		.material-card {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
