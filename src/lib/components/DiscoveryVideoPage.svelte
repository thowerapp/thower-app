<script lang="ts">
import { enhance } from '$app/forms';
import { resolve } from '$app/paths';
import CloudflareVideoPlayer from '$lib/components/CloudflareVideoPlayer.svelte';
import type { DiscoveryVideoView } from '$lib/server/discovery/discoveryVideo';

let { video }: { video: DiscoveryVideoView } = $props();

/** Recalé à chaque vidéo, passé à vrai localement en fin de lecture. */
let watched = $derived(video.watched);
let earnedFeedback = $state<number | null>(null);
let watchForm = $state<HTMLFormElement | null>(null);

function handleEnded() {
	if (!watched && watchForm) {
		watchForm.requestSubmit();
	}
}

function handleStreamCompleted() {
	watched = true;
}
</script>

<div class="back-row">
<a href={resolve('/user/decouverte')} class="back-lnk">
<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
<span class="back-lbl">Découverte</span>
</a>
<div class="back-head">{video.title}</div>
</div>

{#if video.isLocal && video.videoSrc}
	<form
		method="POST"
		action="?/markWatched"
		bind:this={watchForm}
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					watched = true;
					const points = Number(result.data?.pointsEarned ?? 0);
					if (points > 0) {
						earnedFeedback = points;
						setTimeout(() => (earnedFeedback = null), 2800);
					}
				}
				await update({ invalidateAll: false });
			};
		}}
	></form>

	<div class="player-wrap">
		<video
			class="vid"
			src={video.videoSrc}
			poster={video.thumbSrc ?? undefined}
			controls
			playsinline
			onended={handleEnded}
		><track kind="captions" /></video>
	</div>
{:else}
	<div class="player-wrap cf-shell">
		<CloudflareVideoPlayer kind="discovery" videoId={video.id} onCompleted={handleStreamCompleted} />
	</div>
{/if}

{#if watched}
	<div class="watched-row">
		<div class="watched-dot"></div>
		<span class="watched-lbl">Vidéo regardée</span>
	</div>
{:else}
	<p class="watch-hint">La vidéo sera marquée comme regardée à la fin de la lecture (80 % pour Stream).</p>
{/if}

{#if earnedFeedback !== null}
	<div class="earned-toast">+{earnedFeedback} pts gagnés</div>
{/if}

<style>
.back-row { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; background:var(--s1); border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.back-lnk { display:flex; align-items:center; gap:7px; -webkit-tap-highlight-color:transparent; }
.back-lbl { font-size:.55rem; color:var(--txd); font-family:var(--fb); }
.back-head { font-family:var(--fh); font-size:1.1rem; font-weight:800; color:var(--gb); letter-spacing:-.06em; line-height:1; text-transform:uppercase; text-shadow:0 0 10px var(--gg); max-width:55%; text-align:right; }

.player-wrap { width:100%; background:#000; }
.vid { width:100%; display:block; max-height:56vw; }
.cf-shell :global(> div) { border-radius: 0; border-left: none; border-right: none; }

.watched-row { display:flex; align-items:center; gap:8px; padding:14px 18px; border-bottom:1px solid var(--br); }
.watched-dot { width:8px; height:8px; border-radius:50%; background:var(--g); flex-shrink:0; }
.watched-lbl { font-size:.6875rem; color:var(--g); font-family:var(--fb); font-weight:600; }
.watch-hint { padding:12px 18px; font-size:.5625rem; color:var(--txd); font-family:var(--fb); }

.earned-toast { position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:var(--s2); border:1px solid var(--gd); color:var(--g); font-size:.75rem; font-weight:600; font-family:var(--fb); padding:8px 16px; border-radius:20px; z-index:50; white-space:nowrap; }
</style>
