<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';
	import { fireNewlyUnlocked } from '$lib/utils/particles';
	let { data } = $props<{ data: PageData }>();

	type Video = { id: string; title: string; completed: boolean; locked: boolean };
	const videos = $derived((data.videos ?? []) as Video[]);
	const unlockedCount = $derived(videos.filter(v => !v.locked).length);

	onMount(() => fireNewlyUnlocked('thower_locked_mindset', videos));

	function onLockedClick() {
		toast.info('Contenu verrouillé', {
			description: 'Ce contenu se débloque au fil de ta progression dans le programme.'
		});
	}
</script>

<div class="back-row">
<a href="/user/decouverte" class="back-lnk">
<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
<span class="back-lbl">Découverte</span>
</a>
<div class="back-head">Mindset</div>
</div>
<div class="sh">
	<div class="sh-t">Motivation · Discipline</div>
	<div class="sh-s">{unlockedCount} / {videos.length} débloqué{unlockedCount > 1 ? 's' : ''}</div>
</div>

{#if videos.length === 0}
	<div class="empty-state">Aucune vidéo disponible pour le moment.</div>
{:else}
<div class="media-grid">
	{#each videos as video (video.id)}
		{#if video.locked}
			<button type="button" class="mcell locked" data-vid-id={video.id} onclick={onLockedClick}>
				<div class="lock-icon">🔒</div>
			</button>
		{:else}
			<a href="/user/decouverte/mindset/{video.id}" class="mcell" class:done={video.completed} data-vid-id={video.id}>
				{#if video.completed}
					<div style="width:9px;height:9px;border-radius:50%;background:var(--g)"></div>
				{:else}
					<div style="width:9px;height:9px;background:var(--cy)"></div>
				{/if}
				<div class="mc-t">{video.title}</div>
			</a>
		{/if}
	{/each}
</div>
{/if}

<style>
.back-row { display:flex; align-items:center; justify-content:space-between; padding:11px 18px; background:var(--s1); border-bottom:1px solid var(--br); position:sticky; top:0; z-index:10; }
.back-lnk { display:flex; align-items:center; gap:7px; -webkit-tap-highlight-color:transparent; }
.back-lbl { font-size:.55rem; color:var(--txd); font-family:var(--fb); }
.back-head { font-family:var(--fh); font-size:1.35rem; font-weight:800; color:var(--gb); letter-spacing:-.08em; line-height:1; text-transform:uppercase; text-shadow:0 0 10px var(--gg); }
.sh { padding:12px 18px 8px; border-bottom:1px solid var(--br); }
.sh-t { font-family:var(--fh); font-size:1rem; font-weight:800; color:var(--tx); letter-spacing:-.06em; text-transform:uppercase; }
.sh-s { font-size:.5625rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }
.media-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; padding:8px 18px; }
.mcell { aspect-ratio:1; background:var(--s2); border:1px solid var(--br2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
.mcell:active { background:var(--s3); border-color:var(--gd); }
.mcell.locked { background:var(--s1); border-color:var(--br); opacity:.45; cursor:pointer; }
.lock-icon { font-size:.75rem; opacity:.5; }
.mc-t { font-size:.5625rem; color:var(--txd); text-align:center; padding:0 3px; line-height:1.3; font-family:var(--fb); }
</style>
