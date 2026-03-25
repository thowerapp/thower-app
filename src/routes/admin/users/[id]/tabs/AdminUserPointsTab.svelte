<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import type { UserSelected } from '../types';
	import { fmtDate, fmtDateShort } from '../types';

	let { userSelected }: { userSelected: UserSelected } = $props();
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Événements de points</Card.Title>
			<Card.Description>Gains et dépenses de points.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.pointEvents?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Date</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Montant</Table.Head>
								<Table.Head>Métadonnées</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.pointEvents as e}
								<Table.Row>
									<Table.Cell>{fmtDate(e.createdAt)}</Table.Cell>
									<Table.Cell>{e.type}</Table.Cell>
									<Table.Cell>{e.amount > 0 ? '+' : ''}{e.amount}</Table.Cell>
									<Table.Cell class="text-xs">{e.metadata ? JSON.stringify(e.metadata) : '—'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun événement de points.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Badges</Card.Title>
			<Card.Description>Progression et déblocage.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.userBadges?.length}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each userSelected.userBadges as ub}
						<Card.Root class="border">
							<Card.Header class="py-3">
								<Card.Title class="text-base">{ub.badge?.name ?? 'Badge'}</Card.Title>
								{#if ub.badge?.description}
									<Card.Description>{ub.badge.description}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="text-sm">
								<p>Progression : {Math.round((ub.progress ?? 0) * 100)}%</p>
								<p>Débloqué : {ub.unlockedAt ? fmtDate(ub.unlockedAt) : 'Non'}</p>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun badge.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Photos de progression</Card.Title>
			<Card.Description>Par mois et angle.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.progressPhotos?.length}
				<div class="grid gap-4 grid-cols-2 sm:grid-cols-3">
					{#each userSelected.progressPhotos as p}
						<div class="rounded-lg border p-2 space-y-1">
							<img src={p.url} alt={p.angle} class="w-full h-24 object-cover rounded" />
							<p class="text-xs text-muted-foreground">Mois {p.month} — {p.angle}</p>
							<p class="text-xs">{fmtDateShort(p.uploadedAt)}</p>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune photo de progression.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
