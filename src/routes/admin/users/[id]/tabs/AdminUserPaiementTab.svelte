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
			<Card.Title>Transactions</Card.Title>
			<Card.Description>Historique des paiements.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.transactions?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Date</Table.Head>
								<Table.Head>Montant</Table.Head>
								<Table.Head>Devise</Table.Head>
								<Table.Head>Statut</Table.Head>
								<Table.Head>Offres</Table.Head>
								<Table.Head>Stripe ID</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.transactions as t}
								<Table.Row>
									<Table.Cell>{fmtDate(t.createdAt)}</Table.Cell>
									<Table.Cell>{t.amount}</Table.Cell>
									<Table.Cell>{t.currency}</Table.Cell>
									<Table.Cell>{t.status}</Table.Cell>
									<Table.Cell>{t.offerSlugs?.join(', ') ?? '—'}</Table.Cell>
									<Table.Cell class="font-mono text-xs truncate max-w-[120px]">{t.stripePaymentId}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune transaction.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
