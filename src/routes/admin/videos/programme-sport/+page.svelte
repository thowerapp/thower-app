<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';

	let { data } = $props();

	const daysWithWarnings = $derived(data.days.filter((d) => d.warnings.length > 0).length);
</script>

{#snippet videoList(videos: { id: string; title: string; status: string }[])}
	{#if videos.length === 0}
		<span class="text-muted-foreground">—</span>
	{:else}
		<ul class="space-y-0.5">
			{#each videos as v (v.id)}
				<li>
					<a
						href={resolve('/admin/videos/[kind]/[id]', { kind: 'workout', id: v.id })}
						class="underline-offset-2 hover:underline">{v.title}</a
					>
					{#if v.status !== 'ready'}
						<span class="text-xs text-amber-600">({v.status})</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<div class="ccc w-full gap-6 p-4">
	<div class="flex w-full items-center justify-between">
		<a
			href={resolve('/admin/videos')}
			class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Retour aux vidéos
		</a>
		<h1 class="text-lg font-semibold">Programme sport — récap par jour</h1>
	</div>

	<p class="w-full text-sm text-muted-foreground">
		Chaque jour listé est un jour de séance pour l’utilisateur (vidéos sport rattachées en « Séance
		sport »). Ordre affiché côté utilisateur : pré-séances, puis Séance 1, puis Séance 2. Le rôle
		d’une vidéo se change sur sa fiche (champ Position).
	</p>

	<div class="flex w-full gap-4">
		<div class="flex-1 rounded-lg border bg-card p-4 text-center">
			<div class="text-2xl font-bold">{data.days.length} / {data.totalProgramDays}</div>
			<div class="text-xs text-muted-foreground">Jours de séance</div>
		</div>
		<div class="flex-1 rounded-lg border bg-card p-4 text-center">
			<div class="text-2xl font-bold" class:text-orange-500={daysWithWarnings > 0}>
				{daysWithWarnings}
			</div>
			<div class="text-xs text-muted-foreground">Jours à corriger</div>
		</div>
	</div>

	{#if data.days.length === 0}
		<p class="w-full text-sm text-muted-foreground">
			Aucune vidéo sport rattachée au programme pour l’instant.
		</p>
	{:else}
		<div class="w-full overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-muted/50 text-left text-xs text-muted-foreground">
					<tr>
						<th class="px-3 py-2">Jour</th>
						<th class="px-3 py-2">Pré-séances</th>
						<th class="px-3 py-2">Séance 1</th>
						<th class="px-3 py-2">Séance 2</th>
						<th class="px-3 py-2">Alertes</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each data.days as day (day.dayIndex)}
						<tr class="align-top" class:bg-orange-50={day.warnings.length > 0}>
							<td class="px-3 py-2 font-semibold whitespace-nowrap">J{day.dayIndex}</td>
							<td class="px-3 py-2">{@render videoList(day.pre)}</td>
							<td class="px-3 py-2">{@render videoList(day.vid1)}</td>
							<td class="px-3 py-2">{@render videoList(day.vid2)}</td>
							<td class="px-3 py-2">
								{#each day.warnings as w (w)}
									<div class="flex items-center gap-1 text-xs text-orange-600">
										<TriangleAlert class="size-3" />{w}
									</div>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
