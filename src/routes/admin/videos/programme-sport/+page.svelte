<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';

	let { data } = $props();

	const daysWithWarnings = $derived(data.days.filter((d) => d.warnings.length > 0).length);
</script>

{#snippet videoList(videos: { id: string; title: string; status: string }[])}
	{#if videos.length === 0}
		<span class="ps-empty">—</span>
	{:else}
		<ul class="ps-videos">
			{#each videos as v (v.id)}
				<li>
					<a
						href={resolve('/admin/videos/[kind]/[id]', { kind: 'workout', id: v.id })}
						class="ps-link">{v.title}</a
					>
					{#if v.status !== 'ready'}
						<span class="ps-status">{v.status}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<div class="ps-page">
	<div class="ps-head">
		<a href={resolve('/admin/videos')} class="ps-back">
			<ArrowLeft class="h-4 w-4" />
			Retour aux vidéos
		</a>
		<h1 class="ps-title">Programme sport — <span class="gold">récap par jour</span></h1>
	</div>

	<p class="ps-intro">
		Chaque jour listé est un jour de séance pour l’utilisateur (vidéos sport rattachées en « Séance
		sport »). Ordre affiché côté utilisateur : pré-séances, puis Séance 1, puis Séance 2. Le rôle
		d’une vidéo se change sur sa fiche (champ Position).
	</p>

	<div class="ps-stats">
		<div class="ps-stat">
			<div class="ps-stat-value teal">{data.days.length} / {data.totalProgramDays}</div>
			<div class="ps-stat-label">Jours de séance</div>
		</div>
		<div class="ps-stat">
			<div class="ps-stat-value" class:gold={daysWithWarnings > 0}>{daysWithWarnings}</div>
			<div class="ps-stat-label">Jours à corriger</div>
		</div>
	</div>

	{#if data.days.length === 0}
		<p class="ps-intro">Aucune vidéo sport rattachée au programme pour l’instant.</p>
	{:else}
		<div class="ps-table-wrap">
			<table class="ps-table">
				<thead>
					<tr>
						<th>Jour</th>
						<th>Pré-séances</th>
						<th>Séance 1</th>
						<th>Séance 2</th>
						<th>Alertes</th>
					</tr>
				</thead>
				<tbody>
					{#each data.days as day (day.dayIndex)}
						<tr class:ps-row-warn={day.warnings.length > 0}>
							<td class="ps-day">J{day.dayIndex}</td>
							<td>{@render videoList(day.pre)}</td>
							<td>{@render videoList(day.vid1)}</td>
							<td>{@render videoList(day.vid2)}</td>
							<td>
								{#if day.warnings.length === 0}
									<span class="ps-ok">OK</span>
								{:else}
									{#each day.warnings as w (w)}
										<div class="ps-warn">
											<TriangleAlert class="size-3 shrink-0" />{w}
										</div>
									{/each}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.ps-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		padding: 1rem;
		background: var(--thower-black);
		color: var(--thower-white);
	}

	.ps-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ps-back {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: rgba(240, 237, 232, 0.6);
		transition: color 0.2s;
	}

	.ps-back:hover {
		color: var(--thower-teal);
	}

	.ps-title {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0;
	}

	.ps-intro {
		font-size: 0.85rem;
		color: rgba(240, 237, 232, 0.6);
	}

	.ps-stats {
		display: flex;
		gap: 1rem;
	}

	.ps-stat {
		flex: 1;
		padding: 1rem;
		text-align: center;
		border: 1px solid var(--thower-border-medium);
		border-radius: 0.5rem;
		background: rgba(240, 237, 232, 0.03);
	}

	.ps-stat-value {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--thower-white);
	}

	.ps-stat-value.teal {
		color: var(--thower-teal);
	}

	.ps-stat-value.gold {
		color: var(--thower-gold);
	}

	.ps-stat-label {
		font-size: 0.75rem;
		color: rgba(240, 237, 232, 0.55);
	}

	.ps-table-wrap {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--thower-border-medium);
		border-radius: 0.5rem;
	}

	.ps-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.ps-table th {
		padding: 0.6rem 0.75rem;
		text-align: left;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--thower-gold);
		background: rgba(201, 168, 76, 0.08);
		border-bottom: 1px solid var(--thower-border-medium);
	}

	.ps-table td {
		padding: 0.6rem 0.75rem;
		vertical-align: top;
		color: var(--thower-white);
		border-bottom: 1px solid var(--thower-border-light);
	}

	.ps-table tbody tr:last-child td {
		border-bottom: none;
	}

	.ps-table tbody tr:hover td {
		background: rgba(240, 237, 232, 0.03);
	}

	.ps-row-warn td {
		background: rgba(201, 168, 76, 0.06);
	}

	.ps-row-warn td:first-child {
		box-shadow: inset 3px 0 0 var(--thower-gold);
	}

	.ps-day {
		font-weight: 700;
		white-space: nowrap;
		color: var(--thower-teal) !important;
	}

	.ps-videos {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ps-link {
		color: var(--thower-white);
		text-decoration: none;
		transition: color 0.2s;
	}

	.ps-link:hover {
		color: var(--thower-teal);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.ps-status {
		margin-left: 0.35rem;
		font-size: 0.7rem;
		color: var(--thower-gold);
	}

	.ps-empty {
		color: rgba(240, 237, 232, 0.3);
	}

	.ps-ok {
		font-size: 0.75rem;
		color: var(--thower-teal);
	}

	.ps-warn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--thower-gold);
	}
</style>
