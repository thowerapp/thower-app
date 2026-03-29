<script lang="ts">
	import type { PageData } from './$types';
	import SecHead from '$lib/components/SecHead.svelte';
	import CheckItem from '$lib/components/CheckItem.svelte';
	import StatBox from '$lib/components/StatBox.svelte';

	export let data: PageData;

	let tasks = [
		{ label: "Boire 2L d'eau",          pts: 5,  checked: true  },
		{ label: "10 min de méditation",     pts: 5,  checked: true  },
		{ label: "Pas de sucre ajouté",      pts: 5,  checked: true  },
		{ label: "Max 4 cafés",              pts: 5,  checked: false },
		{ label: "Pas de café après 14h",    pts: 5,  checked: false },
		{ label: "Pas de tabac",             pts: 10, checked: false },
	];

	$: checklistPts = tasks.filter(t => t.checked).reduce((acc, t) => acc + t.pts, 0);
	$: completed = tasks.filter(t => t.checked).length;
	$: available = tasks.filter(t => !t.checked).reduce((acc, t) => acc + t.pts, 0);
</script>

<SecHead
	title="Ma checklist du jour"
	sub="{completed} / {tasks.length} complétées · +{available} pts disponibles"
/>

<div class="checklist-block">
	{#each tasks as task}
		<CheckItem bind:checked={task.checked} label={task.label} pts={task.pts} />
	{/each}
</div>

<SecHead title="Points du jour" sub="Checklist + Séance + Nutrition" />

<div class="stats-row">
	<StatBox value={checklistPts} label="Checklist" />
	<StatBox value={0} label="Séance" />
	<StatBox value={checklistPts} label="Total jour" />
</div>

<div class="hint">
	Ces tâches sont définies par l'admin. Tu peux désactiver celles que tu ne suis pas dans
	<a href="/user/parametres">Paramètres</a>.
</div>

<style>
	.checklist-block {
		padding: 10px 18px;
		border-bottom: 1px solid #f5f5f5;
	}
	.stats-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
		padding: 12px 18px 6px;
	}
	.hint {
		padding: 10px 18px 6px;
		font-size: 0.56rem;
		color: #aaa;
	}
	.hint a {
		color: #111;
		text-decoration: underline;
	}
</style>
