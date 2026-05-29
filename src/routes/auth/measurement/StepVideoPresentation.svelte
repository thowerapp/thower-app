<script lang="ts">
	import { Button } from '$shadcn/button';
	import { ArrowRight, PlayCircle } from 'lucide-svelte';

	let {
		videoUrl,
		onnext
	}: {
		videoUrl: string;
		onnext: () => void;
	} = $props();
</script>

<div class="step-video-presentation">
	<div class="video-card meas-card">
		<div class="video-heading">
			<PlayCircle class="h-8 w-8 step-icon" />
			<div>
				<p class="eyebrow">Avant de commencer</p>
				<h2>Regarde cette vidéo de présentation</h2>
			</div>
		</div>

		{#if videoUrl}
			<div class="video-frame">
				<iframe
					src={videoUrl}
					title="Vidéo de présentation Thower"
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
					allowfullscreen
					class="h-full w-full"
				></iframe>
			</div>
		{:else}
			<div class="video-frame video-placeholder">
				<p>Vidéo de présentation à configurer avec l'UUID Cloudflare Stream.</p>
			</div>
		{/if}

		<p class="video-copy">
			Prends quelques minutes pour comprendre la suite du parcours, puis continue vers le
			formulaire.
		</p>
	</div>

	<Button type="button" size="lg" class="w-full mt-6 gap-2 meas-btn-primary" onclick={onnext}>
		Continuer
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
</style>
