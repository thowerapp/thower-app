<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type Props = {
		/** Type de vidéo : workout (séance sport) ou discovery (Découverte) */
		kind: 'workout' | 'discovery';
		/** ID base de données (pas l'UID Cloudflare) */
		videoId: string;
		/** Affichage : ratio 16/9 par défaut */
		aspect?: 'video' | 'square';
		/** Cb optionnelle quand la complétion est reconnue (90 % ou ended) */
		onCompleted?: () => void;
	};

	let { kind, videoId, aspect = 'video', onCompleted }: Props = $props();

	let containerRef = $state<HTMLDivElement | null>(null);
	let embedUrl = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let isCompleted = $state(false);

	type StreamPlayer = {
		addEventListener: (event: string, cb: (e?: unknown) => void) => void;
		currentTime: number;
		duration: number;
	};
	type StreamApi = (iframe: HTMLIFrameElement) => StreamPlayer;

	let streamApi: StreamApi | null = null;
	let player: StreamPlayer | null = null;
	let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchPlaybackToken() {
		try {
			const res = await fetch(`/api/videos/${kind}/${videoId}/playback-token`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.message ?? `Erreur ${res.status}`);
			}
			const data = await res.json();
			embedUrl = data.embedUrl as string;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
		}
	}

	async function loadStreamSdk(): Promise<void> {
		if (typeof window === 'undefined') return;
		if ((window as unknown as { Stream?: unknown }).Stream) {
			streamApi = (window as unknown as { Stream: StreamApi }).Stream;
			return;
		}
		await new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('SDK Cloudflare Stream introuvable.'));
			document.head.appendChild(script);
		});
		streamApi = (window as unknown as { Stream: StreamApi }).Stream;
	}

	async function postProgress(positionSec: number, ended: boolean) {
		try {
			await fetch(`/api/videos/${kind}/${videoId}/progress`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ positionSec, ended })
			});
		} catch (err) {
			console.warn('[CloudflareVideoPlayer] progress post failed', err);
		}
	}

	function attachPlayer() {
		if (!streamApi || !containerRef) return;
		const iframe = containerRef.querySelector('iframe');
		if (!iframe) return;
		player = streamApi(iframe as HTMLIFrameElement);

		player.addEventListener('ended', async () => {
			if (isCompleted) return;
			isCompleted = true;
			await postProgress(player?.currentTime ?? 0, true);
			onCompleted?.();
		});

		// Heartbeat toutes les 15 s pour suivre la position max et détecter 90 %
		heartbeatInterval = setInterval(async () => {
			if (!player) return;
			const t = player.currentTime ?? 0;
			if (t > 0) {
				await postProgress(t, false);
			}
		}, 15000);
	}

	onMount(async () => {
		await fetchPlaybackToken();
		if (!embedUrl) return;
		try {
			await loadStreamSdk();
			// Laisser le DOM peindre l'iframe
			requestAnimationFrame(() => attachPlayer());
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
		}
	});

	onDestroy(() => {
		if (heartbeatInterval) clearInterval(heartbeatInterval);
	});
</script>

<div class="overflow-hidden rounded-lg border bg-black" class:aspect-video={aspect === 'video'} class:aspect-square={aspect === 'square'} bind:this={containerRef}>
	{#if errorMessage}
		<div class="flex h-full items-center justify-center p-4 text-center text-sm text-white/80">
			{errorMessage}
		</div>
	{:else if embedUrl}
		<iframe
			src={embedUrl}
			title="Cloudflare Stream"
			allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
			allowfullscreen
			class="h-full w-full"
		></iframe>
	{:else}
		<div class="flex h-full items-center justify-center text-xs text-white/60">
			Chargement de la vidéo…
		</div>
	{/if}
</div>
