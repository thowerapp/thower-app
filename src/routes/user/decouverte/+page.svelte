<script lang="ts">
	import type { PageData } from './$types';
	import SecHead from '$lib/components/SecHead.svelte';
	import DecCard from '$lib/components/DecCard.svelte';

	export let data: PageData;
</script>

<SecHead title="Mes pratiques" sub="3 catégories disponibles" />

<DecCard
	title="Méditation"
	sub="Pleine conscience · Guidée · Corps"
	count="3 débloquées · 6 à venir"
	href="/user/decouverte/meditation"
>
	<svelte:fragment slot="icon">
		<div class="icon-circle"></div>
	</svelte:fragment>
</DecCard>

<DecCard
	title="Mindset"
	sub="Motivation · Discipline · Objectifs"
	count="2 débloquées · 4 à venir"
	href="/user/decouverte/mindset"
>
	<svelte:fragment slot="icon">
		<div class="icon-triangle"></div>
	</svelte:fragment>
</DecCard>

<DecCard
	title="Breathwork"
	sub="Cohérence · Anti-stress · Activation"
	count="2 débloquées · 4 à venir"
	href="/user/decouverte/breathwork"
>
	<svelte:fragment slot="icon">
		<div class="icon-square"></div>
	</svelte:fragment>
</DecCard>

<style>
	.icon-circle {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid #555;
	}
	.icon-triangle {
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-bottom: 14px solid #555;
	}
	.icon-square {
		width: 16px;
		height: 16px;
		border: 2px solid #555;
		border-radius: 2px;
	}
</style>
