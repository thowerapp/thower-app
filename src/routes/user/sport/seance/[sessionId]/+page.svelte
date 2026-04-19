<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CloudflareVideoPlayer from '$lib/components/CloudflareVideoPlayer.svelte';
	import { fireElement } from '$lib/utils/particles';

	let { data } = $props<{ data: PageData }>();

	function fire(e: MouseEvent) {
		fireElement(e.currentTarget as HTMLElement, e);
	}

	const posLabel: Record<string, string> = {
		PRE: 'Pré-séance',
		VID1: 'Vidéo 1',
		VID2: 'Vidéo 2'
	};
</script>

<div class="u-back-row">
	<a href="/user/sport" class="u-back-lnk" onclick={fire}>
		<svg width="12" height="12" viewBox="0 0 14 14"
			><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"></path></svg
		>
		<span class="u-back-lbl">Sport</span>
	</a>
	<div class="u-back-head">Séance</div>
</div>

<div class="u-sh">
	<div class="u-sh-t">{data.sessionName}</div>
	<div class="u-sh-s">
		Jour {data.dayIndex} / 91
		{#if data.scheduledDateISO}
			· {data.scheduledDateISO.slice(0, 10)}
		{/if}
	</div>
</div>

{#if data.seanceCompletedAt}
	<p class="mx-4 text-sm" style="color:var(--g)">Séance enregistrée comme terminée.</p>
{:else if !data.allMandatoryVideosCompleted}
	<p class="mx-4 text-sm" style="color:var(--txd);">
		Enregistre toutes les vidéos obligatoires (ou appuie sur le bouton ci-dessous si tu as terminé).
	</p>
{/if}

<div class="mx-4" style="display:flex; flex-direction:column; gap:1.5rem;">
	{#each data.videos as v (v.id)}
		<div class="space-y-1">
			<div
				style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--txd);"
			>
				<span
					>{posLabel[v.position] ?? v.position}{#if v.isOptional} (facultative){/if}</span
				>
				{#if v.videoCompleted}
					<span style="color:var(--g)">Vue ✓</span>
				{:else if v.status === 'ready'}
					<span>En cours</span>
				{:else}
					<span>Transcodage…</span>
				{/if}
			</div>
			{#if v.status === 'ready'}
				<CloudflareVideoPlayer
					kind="workout"
					videoId={v.id}
					onCompleted={async () => {
						await invalidateAll();
					}}
				/>
			{:else}
				<div
					class="rounded-lg border p-3 text-center text-sm"
					style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);color:rgba(255,255,255,.72);"
				>
					La vidéo n’est pas encore prête côté Cloudflare (statut : {v.status}).
				</div>
			{/if}
		</div>
	{/each}
</div>

<form
	method="POST"
	action="?/markCompleted"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			await invalidateAll();
		};
	}}
	style="margin: 1rem 1rem 0;"
>
	<input type="hidden" name="dayIndex" value={data.dayIndex} />
	<button
		type="submit"
		style="width:100%;border-radius:8px;padding:0.65rem 1rem;background:var(--cy);color:var(--s1);font-weight:600;font-size:0.875rem;border:none;"
	>
		Marquer la séance comme terminée
	</button>
</form>

<p class="mx-4 mt-2 text-center text-xs" style="color:var(--txm);">
	+50 pts côté gamification quand le programme enregistre la complétion (tâches / points).
</p>
