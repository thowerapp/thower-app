<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import type { UserSelected } from '../types';
	import { fmtDate } from '../types';

	let { userSelected }: { userSelected: UserSelected } = $props();
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Jours nutrition</Card.Title>
			<Card.Description>Jours du programme avec option jeûne.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.nutritionDays?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Jour</Table.Head>
								<Table.Head>Jeûne intermittent</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.nutritionDays as n}
								<Table.Row>
									<Table.Cell>{n.dayIndex}</Table.Cell>
									<Table.Cell>{n.intermittentFasting ? 'Oui' : 'Non'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun jour nutrition.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Listes de courses</Card.Title>
			<Card.Description>Périodes et date de génération.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.shoppingLists?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Jours (début → fin)</Table.Head>
								<Table.Head>Générée le</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.shoppingLists as s}
								<Table.Row>
									<Table.Cell>{s.startDayIndex} → {s.endDayIndex}</Table.Cell>
									<Table.Cell>{fmtDate(s.generatedAt)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune liste de courses.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recettes personnelles</Card.Title>
			<Card.Description>Recettes créées par l'utilisateur.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.recipes?.length}
				<ul class="list-disc list-inside text-sm">
					{#each userSelected.recipes as r}
						<li>{r.name}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune recette personnelle.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
