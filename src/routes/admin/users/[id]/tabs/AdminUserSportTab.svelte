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
			<Card.Title>Séances planifiées (workoutDays)</Card.Title>
			<Card.Description>Jours programme et statut.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.workoutDays?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Séance</Table.Head>
								<Table.Head>Jour programme</Table.Head>
								<Table.Head>Date prévue</Table.Head>
								<Table.Head>Complété</Table.Head>
								<Table.Head>Verrouillé</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.workoutDays as w}
								<Table.Row>
									<Table.Cell>{w.session?.name ?? '—'}</Table.Cell>
									<Table.Cell>{w.dayIndex}</Table.Cell>
									<Table.Cell>{fmtDate(w.scheduledDate)}</Table.Cell>
									<Table.Cell>{w.completedAt ? fmtDate(w.completedAt) : '—'}</Table.Cell>
									<Table.Cell>{w.isLocked ? 'Oui' : 'Non'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune séance planifiée.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
