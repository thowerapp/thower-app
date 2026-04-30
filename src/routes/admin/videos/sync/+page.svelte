<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Download from 'lucide-svelte/icons/download';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';

	let { data } = $props();

	const statusLabels: Record<string, string> = {
		pendingupload: 'À uploader',
		queued: 'En file',
		inprogress: 'Traitement',
		ready: 'Prêt',
		error: 'Erreur',
		unknown: 'Inconnu'
	};

	function formatDuration(seconds: number | null): string {
		if (seconds == null || seconds <= 0) return '—';
		const m = Math.floor(seconds / 60);
		const s = Math.round(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	let purgeConfirm = $state(false);
</script>

<div class="ccc w-full gap-6 p-4">
	<!-- En-tête -->
	<div class="flex w-full items-center justify-between">
		<a href="/admin/videos" class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
			<ArrowLeft class="h-4 w-4" />
			Retour aux vidéos
		</a>
		<h1 class="text-lg font-semibold">Synchronisation Cloudflare → DB</h1>
	</div>

	<!-- Statistiques -->
	<div class="flex w-full gap-4">
		<div class="flex-1 rounded-lg border bg-card p-4 text-center">
			<div class="text-2xl font-bold">{data.totalCf}</div>
			<div class="text-xs text-muted-foreground">Vidéos sur Cloudflare</div>
		</div>
		<div class="flex-1 rounded-lg border bg-card p-4 text-center">
			<div class="text-2xl font-bold">{data.totalDb}</div>
			<div class="text-xs text-muted-foreground">Enregistrées en DB</div>
		</div>
		<div class="flex-1 rounded-lg border bg-card p-4 text-center">
			<div class="text-2xl font-bold text-orange-500">{data.unregistered.length}</div>
			<div class="text-xs text-muted-foreground">Nouvelles à importer</div>
		</div>
	</div>

	<!-- Erreur Cloudflare -->
	{#if data.cfError}
		<div class="w-full rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
			<strong>Erreur Cloudflare :</strong> {data.cfError}
		</div>
	{/if}

	<!-- Vidéos non enregistrées -->
	{#if data.unregistered.length > 0}
		<div class="w-full">
			<h2 class="mb-3 text-sm font-semibold text-orange-500">
				{data.unregistered.length} vidéo(s) Cloudflare non enregistrée(s) en DB
			</h2>
			<div class="overflow-hidden rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th class="p-3 text-left font-medium">Titre / UID</th>
							<th class="p-3 text-left font-medium">Statut</th>
							<th class="p-3 text-left font-medium">Durée</th>
							<th class="p-3 text-right font-medium">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each data.unregistered as video (video.uid)}
							<tr class="hover:bg-muted/20">
								<td class="p-3">
									<div class="font-medium">{video.title !== video.uid ? video.title : '—'}</div>
									<div class="font-mono text-xs text-muted-foreground">{video.uid}</div>
								</td>
								<td class="p-3">
									<span class="rounded px-1.5 py-0.5 text-xs"
										class:bg-green-100={video.status === 'ready'}
										class:text-green-700={video.status === 'ready'}
										class:bg-muted={video.status !== 'ready'}>
										{statusLabels[video.status] ?? video.status}
									</span>
								</td>
								<td class="p-3 text-muted-foreground">{formatDuration(video.duration)}</td>
								<td class="p-3 text-right">
									<form
										method="POST"
										action="?/importVideo"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'redirect') {
													toast.success(`Vidéo importée — configurez son type et sa catégorie.`);
												} else if (result.type === 'failure') {
													toast.error((result.data as { message?: string })?.message ?? 'Erreur import.');
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="uid" value={video.uid} />
										<input type="hidden" name="title" value={video.title} />
										<input type="hidden" name="durationSeconds" value={video.duration ?? ''} />
										<input type="hidden" name="thumbnailUrl" value={video.thumbnail ?? ''} />
										<input type="hidden" name="status" value={video.status} />
										<button
											type="submit"
											class="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
										>
											<Download class="h-3 w-3" />
											Importer
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Les vidéos sont importées avec le type <strong>Découverte / MOTIVATION</strong> et restent
				<strong>inactives</strong> jusqu'à configuration dans la fiche d'édition.
			</p>
		</div>
	{:else if !data.cfError}
		<div class="flex w-full items-center gap-2 rounded-lg border bg-green-50 p-4 text-sm text-green-700">
			<CheckCircle2 class="h-4 w-4 shrink-0" />
			Toutes les vidéos Cloudflare sont déjà enregistrées en DB.
		</div>
	{/if}

	<!-- Vidéos déjà enregistrées (récap) -->
	{#if data.registered.length > 0}
		<div class="w-full">
			<h2 class="mb-3 text-sm font-semibold text-muted-foreground">
				{data.registered.length} vidéo(s) déjà en DB
			</h2>
			<div class="overflow-hidden rounded-lg border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th class="p-3 text-left font-medium">Titre / UID</th>
							<th class="p-3 text-left font-medium">Statut CF</th>
							<th class="p-3 text-left font-medium">Durée</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each data.registered as video (video.uid)}
							<tr class="hover:bg-muted/20">
								<td class="p-3">
									<div class="font-medium">{video.title !== video.uid ? video.title : '—'}</div>
									<div class="font-mono text-xs text-muted-foreground">{video.uid}</div>
								</td>
								<td class="p-3">
									<span class="rounded px-1.5 py-0.5 text-xs"
										class:bg-green-100={video.status === 'ready'}
										class:text-green-700={video.status === 'ready'}
										class:bg-muted={video.status !== 'ready'}>
										{statusLabels[video.status] ?? video.status}
									</span>
								</td>
								<td class="p-3 text-muted-foreground">{formatDuration(video.duration)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Zone danger : purge DB -->
	<div class="w-full rounded-lg border border-destructive/40 p-4">
		<h2 class="mb-2 text-sm font-semibold text-destructive">Zone danger</h2>
		<p class="mb-3 text-xs text-muted-foreground">
			Purger la DB supprime toutes les fiches vidéo (workout + découverte). Les vidéos restent sur
			Cloudflare. Re-synchronisez ensuite depuis cette page.
		</p>
		{#if !purgeConfirm}
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-md border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
				onclick={() => (purgeConfirm = true)}
			>
				<Trash2 class="h-3 w-3" />
				Purger toutes les vidéos DB
			</button>
		{:else}
			<form method="POST" action="?/purgeAll" use:enhance>
				<p class="mb-2 text-xs font-semibold text-destructive">Confirmer la purge ?</p>
				<div class="flex gap-2">
					<button
						type="submit"
						class="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
					>
						<Trash2 class="h-3 w-3" />
						Oui, tout purger
					</button>
					<button
						type="button"
						class="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
						onclick={() => (purgeConfirm = false)}
					>
						Annuler
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
