<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const endedOn = $derived(
		data.endedAt
			? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(data.endedAt))
			: null
	);
</script>

<svelte:head>
	<title>Accès expiré</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="max-w-md text-center">
		<h1 class="text-3xl font-bold">Ton accès est expiré</h1>
		<p class="mt-3 text-gray-600 dark:text-gray-400">
			{#if endedOn}
				Ton accompagnement s'est terminé le {endedOn}.
			{:else}
				Ton accompagnement est terminé.
			{/if}
			Renouvelle-le pour retrouver ton programme.
		</p>
		<div class="mt-6 flex flex-col items-center gap-3">
			<a
				href="/auth/subscription"
				class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring focus:ring-blue-300 focus:outline-none"
			>
				Renouveler mon accès
			</a>
			<a href="/auth/account" class="text-sm text-gray-600 underline dark:text-gray-400">
				Mon compte
			</a>
		</div>
	</div>
</div>
