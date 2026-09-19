<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import { Input } from '$shadcn/input';
	import { Label } from '$shadcn/label';
	import * as Table from '$shadcn/table';
	import { Copy, KeyRound } from 'lucide-svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let generating = $state(false);
	let newCodes = $state<string[]>([]);

	$effect(() => {
		if (form?.success && Array.isArray((form as { codes?: unknown }).codes)) {
			newCodes = (form as { codes: string[] }).codes;
			toast.success(`${newCodes.length} code(s) généré(s).`);
		} else if (form && !form.success && form.message) {
			toast.error(String(form.message));
		}
	});

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			toast.success('Code copié.');
		} catch {
			toast.error('Impossible de copier le code.');
		}
	}

	function formatDate(iso: string | null) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<div class="ccc w-full max-w-3xl space-y-6 p-4">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<KeyRound class="w-5 h-5 text-primary" />
				<span>Générer des codes d'accès</span>
			</Card.Title>
			<Card.Description>
				Pour les utilisateurs ayant payé directement avec vous (hors application). Chaque code
				donne un accès complet à vie et ne peut être utilisé qu'une seule fois.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/generate"
				use:enhance={() => {
					generating = true;
					return async ({ update }) => {
						generating = false;
						await update();
					};
				}}
				class="flex flex-col sm:flex-row gap-3 sm:items-end"
			>
				<div class="flex flex-col gap-1">
					<Label for="count">Nombre de codes</Label>
					<Input id="count" name="count" type="number" min="1" max="100" value="1" class="w-full sm:w-32" required />
				</div>
				<div class="flex flex-col gap-1 flex-1">
					<Label for="note">Note (optionnel)</Label>
					<Input id="note" name="note" type="text" placeholder="Ex : lot salle de sport janvier" class="w-full" />
				</div>
				<Button type="submit" disabled={generating} class="shrink-0">
					{generating ? 'Génération...' : 'Générer'}
				</Button>
			</form>

			{#if newCodes.length > 0}
				<div class="mt-4 space-y-2 rounded-lg border p-3 bg-muted/30">
					<p class="text-sm font-medium">Codes générés :</p>
					{#each newCodes as code (code)}
						<div class="flex items-center justify-between gap-2 font-mono text-sm">
							<span>{code}</span>
							<Button type="button" size="sm" variant="ghost" onclick={() => copyCode(code)} class="gap-1">
								<Copy class="w-3.5 h-3.5" />
								Copier
							</Button>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Codes existants ({data.codes?.length ?? 0})</Card.Title>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Code</Table.Head>
						<Table.Head>Note</Table.Head>
						<Table.Head>Statut</Table.Head>
						<Table.Head>Utilisé par</Table.Head>
						<Table.Head>Créé le</Table.Head>
						<Table.Head></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.codes ?? [] as row (row.id)}
						<Table.Row>
							<Table.Cell class="font-mono text-xs">{row.code}</Table.Cell>
							<Table.Cell>{row.note ?? '—'}</Table.Cell>
							<Table.Cell>
								{#if row.usedAt}
									<span class="text-muted-foreground">Utilisé le {formatDate(row.usedAt)}</span>
								{:else}
									<span class="text-green-600 dark:text-green-400 font-medium">Disponible</span>
								{/if}
							</Table.Cell>
							<Table.Cell>{row.usedByEmail ?? '—'}</Table.Cell>
							<Table.Cell>{formatDate(row.createdAt)}</Table.Cell>
							<Table.Cell>
								{#if !row.usedAt}
									<Button type="button" size="sm" variant="ghost" onclick={() => copyCode(row.code)} class="gap-1">
										<Copy class="w-3.5 h-3.5" />
									</Button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
