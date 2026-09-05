<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { PROGRAM_TIMEZONE, remainingUntil } from '$lib/utils/programDay';

	let { startsAt }: { startsAt: string } = $props();

	let now = $state(new Date());
	let refreshed = false;

	const target = $derived(new Date(startsAt));
	const parts = $derived(remainingUntil(target, now));

	const startLabel = $derived(
		target.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: PROGRAM_TIMEZONE
		})
	);

	function maybeRefresh(current: Date) {
		if (refreshed) return;
		if (remainingUntil(target, current).totalMs > 0) return;
		refreshed = true;
		void invalidateAll();
	}

	onMount(() => {
		maybeRefresh(new Date());
		const id = setInterval(() => {
			const current = new Date();
			now = current;
			maybeRefresh(current);
		}, 1000);
		return () => clearInterval(id);
	});

	function pad(n: number): string {
		return String(n).padStart(2, '0');
	}

	const cells = $derived([
		{ value: String(parts.days), unit: 'j' },
		{ value: pad(parts.hours), unit: 'h' },
		{ value: pad(parts.minutes), unit: 'min' },
		{ value: pad(parts.seconds), unit: 's' }
	]);
</script>

<div class="cd" aria-live="polite">
	<div class="cd-eyebrow">Programme en attente</div>
	<div class="cd-title">Démarre {startLabel}</div>
	<div class="cd-grid">
		{#each cells as cell (cell.unit)}
			<div class="cd-cell">
				<span class="cd-num">{cell.value}</span>
				<span class="cd-unit">{cell.unit}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.cd {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.cd-eyebrow {
		font-size: 0.4375rem;
		color: var(--txd);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-family: var(--fb);
	}
	.cd-title {
		font-family: var(--fh);
		font-size: 1.15rem;
		color: var(--g);
		letter-spacing: -0.02em;
		line-height: 1.15;
		text-transform: capitalize;
		font-weight: 700;
	}
	.cd-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
		margin-top: 4px;
	}
	.cd-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 10px 4px 8px;
		background: rgba(0, 0, 0, 0.28);
		border: 1px solid var(--br2);
	}
	.cd-num {
		font-family: var(--fh2);
		font-size: 1.35rem;
		color: var(--tx);
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.cd-unit {
		font-size: 0.4375rem;
		color: var(--txd);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-family: var(--fb);
	}
</style>
