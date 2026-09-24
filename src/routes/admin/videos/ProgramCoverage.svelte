<script lang="ts">
	import {
		COVERAGE_POSITIONS,
		COVERAGE_SESSION_TYPES,
		SESSION_TYPE_LABELS,
		type CoverageDay,
		type CoverageSessions
	} from '$lib/utils/adminVideoCoverage';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';

	let { days, sessions }: { days: CoverageDay[]; sessions: CoverageSessions } = $props();

	const positionLabels: Record<string, string> = { PRE: 'Pré-séance', VID1: 'Vidéo 1', VID2: 'Vidéo 2' };

	const coveredCount = $derived(days.filter((d) => d.titles.length > 0).length);
	const weeks = $derived(
		Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7))
	);
</script>

<div class="grid w-full gap-4 lg:grid-cols-[1fr_auto]">
	<section class="rounded-lg border bg-card p-4">
		<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="text-sm font-semibold">Vidéos rattachées aux journées</h2>
			<p class="text-xs text-muted-foreground">
				<strong class="text-foreground">{coveredCount}/{days.length}</strong> jours avec au moins une
				vidéo (jour précis ou tâche vidéo, hors seed)
			</p>
		</div>
		<div class="flex flex-col gap-1 overflow-x-auto">
			{#each weeks as week, w (w)}
				<div class="flex items-center gap-1">
					<span class="w-8 shrink-0 text-[10px] text-muted-foreground">S{w + 1}</span>
					{#each week as day (day.dayIndex)}
						<div
							class="flex size-7 shrink-0 items-center justify-center rounded text-[10px] font-medium {day
								.titles.length > 0
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'}"
							title={day.titles.length > 0
								? `J${day.dayIndex} :\n${day.titles.join('\n')}`
								: `J${day.dayIndex} : aucune vidéo`}
						>
							{day.dayIndex}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</section>

	<section class="rounded-lg border bg-card p-4">
		<h2 class="mb-1 text-sm font-semibold">Créneaux des séances sport</h2>
		<p class="mb-3 text-xs text-muted-foreground">Chaque séance revient chaque semaine.</p>
		<table class="text-xs">
			<thead>
				<tr>
					<th></th>
					{#each COVERAGE_POSITIONS as pos (pos)}
						<th class="px-2 pb-1 font-medium text-muted-foreground">{positionLabels[pos]}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each COVERAGE_SESSION_TYPES as type (type)}
					<tr>
						<td class="pr-2 py-1 font-medium">{SESSION_TYPE_LABELS[type]}</td>
						{#each COVERAGE_POSITIONS as pos (pos)}
							{@const titles = sessions[type]?.[pos] ?? []}
							<td class="px-2 py-1 text-center" title={titles.join('\n') || 'Aucune vidéo'}>
								{#if titles.length > 0}
									<Check class="mx-auto size-4 text-primary" />
								{:else}
									<X class="mx-auto size-4 text-destructive" />
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
