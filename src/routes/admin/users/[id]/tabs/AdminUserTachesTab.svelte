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
			<Card.Title>Tâches quotidiennes complétées</Card.Title>
			<Card.Description>Historique des validations.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.dailyTaskCompletions?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Date</Table.Head>
								<Table.Head>Complété le</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.dailyTaskCompletions as c}
								<Table.Row>
									<Table.Cell>{fmtDateShort(c.date)}</Table.Cell>
									<Table.Cell>{fmtDate(c.completedAt)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune tâche complétée.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Défis</Card.Title>
			<Card.Description>Défis rejoints et statut.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.challenges?.length}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each userSelected.challenges as uc}
						<Card.Root class="border">
							<Card.Header class="py-3">
								<Card.Title class="text-base">{uc.challenge?.name ?? 'Défi'}</Card.Title>
								{#if uc.challenge?.description}
									<Card.Description>{uc.challenge.description}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="text-sm space-y-1">
								<p>Durée : {uc.challenge?.durationDays ?? '—'} jours — Bonus : {uc.challenge?.bonusPoints ?? '—'} pts</p>
								<p>Période : {uc.challenge?.startAt ? fmtDateShort(uc.challenge.startAt) : '—'} → {uc.challenge?.endAt ? fmtDateShort(uc.challenge.endAt) : '—'}</p>
								<p>Rejoint le : {fmtDate(uc.joinedAt)}</p>
								<p>Complété : {uc.completedAt ? fmtDate(uc.completedAt) : 'Non'}</p>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun défi rejoint.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
