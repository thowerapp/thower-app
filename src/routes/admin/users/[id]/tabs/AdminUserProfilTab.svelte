<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import type { UserSelected } from '../types';
	import { fmtDate } from '../types';
	import { BREAD_TYPE_LABELS, type BreadTypeValue } from '$lib/schema/profile/breadType';

	let { userSelected }: { userSelected: UserSelected } = $props();

	function breadTypeLabel(code: string | null | undefined): string {
		if (!code) return '—';
		return BREAD_TYPE_LABELS[code as BreadTypeValue] ?? code;
	}

	// Récupérer les photos de validation (month = 0)
	const validationPhotos = $derived.by(() => {
		const photos = (userSelected.progressPhotos ?? []) as Array<{ angle: string; url: string; month?: number }>;
		return photos.filter((p) => p.month === 0 || !p.month);
	});

	const photoByAngle = $derived.by(() => {
		const map = new Map<string, string>();
		for (const photo of validationPhotos) {
			map.set(photo.angle, photo.url);
		}
		return map;
	});

</script>

<div class="space-y-6">
	<!-- Photos d'inscription (month = 0) -->
	{#if validationPhotos.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Photos d'inscription</Card.Title>
				<Card.Description>Consultation uniquement (suivi visuel utilisateur).</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="grid grid-cols-3 gap-4">
					{#each ['FRONT', 'SIDE', 'BACK'] as angle}
						<div class="space-y-2">
							<p class="text-sm font-semibold">{angle === 'FRONT' ? 'Face' : angle === 'SIDE' ? 'Profil' : 'Dos'}</p>
							{#if photoByAngle.get(angle)}
								<img
									src={photoByAngle.get(angle)}
									alt={angle}
									class="w-full aspect-[3/4] object-cover rounded-md border"
								/>
							{:else}
								<div class="w-full aspect-[3/4] bg-muted rounded-md border flex items-center justify-center text-muted-foreground">
									—
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
	<Card.Root>
		<Card.Header>
			<Card.Title>Planning nutrition</Card.Title>
		</Card.Header>
		<Card.Content>
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				<dt class="text-muted-foreground">Jours alloués (paiements)</dt>
				<dd>{userSelected.nutritionDaysAllocated ?? 0}</dd>
			</dl>
		</Card.Content>
	</Card.Root>

	{#if userSelected.profile}
		<Card.Root>
			<Card.Header>
				<Card.Title>Profil (UserProfile)</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
					<dt class="text-muted-foreground">Niveau d'activité</dt>
					<dd>{userSelected.profile.activityLevel ?? '—'}</dd>
					<dt class="text-muted-foreground">Objectifs</dt>
					<dd>{userSelected.profile.objectives?.join(', ') ?? '—'}</dd>
					<dt class="text-muted-foreground">Douleurs / pathologies</dt>
					<dd>{userSelected.profile.painsPathologies ?? '—'}</dd>
					<dt class="text-muted-foreground">Contexte particulier</dt>
					<dd>{userSelected.profile.contextParticular ?? '—'}</dd>
					<dt class="text-muted-foreground">Pain quotidien</dt>
					<dd>{userSelected.profile.breadDaily ? 'Oui' : 'Non'}</dd>
					<dt class="text-muted-foreground">Pain (g / jour, moy.)</dt>
					<dd>{userSelected.profile.breadGramsPerDay ?? '—'}</dd>
					<dt class="text-muted-foreground">Type de pain</dt>
					<dd>{breadTypeLabel(userSelected.profile.breadType)}</dd>
					<dt class="text-muted-foreground">Précisions pain</dt>
					<dd>{userSelected.profile.breadManagement ?? '—'}</dd>
					<dt class="text-muted-foreground">Allergènes</dt>
					<dd>{userSelected.profile.allergens?.join(', ') ?? '—'}</dd>
					<dt class="text-muted-foreground">Cafés / jour</dt>
					<dd>{userSelected.profile.coffeePerDay ?? '—'}</dd>
					<dt class="text-muted-foreground">Alcool</dt>
					<dd>{userSelected.profile.alcoholHabit == null ? '—' : userSelected.profile.alcoholHabit ? 'Oui' : 'Non'}</dd>
					<dt class="text-muted-foreground">Tabac</dt>
					<dd>{userSelected.profile.tobaccoHabit == null ? '—' : userSelected.profile.tobaccoHabit ? 'Oui' : 'Non'}</dd>
					<dt class="text-muted-foreground">Petit-déjeuner</dt>
					<dd>{userSelected.profile.breakfastEnabled ? 'Oui' : 'Non'}</dd>
					<dt class="text-muted-foreground">Masse grasse (%)</dt>
					<dd>{userSelected.profile.bodyFatPercent ?? '—'}</dd>
					<dt class="text-muted-foreground">Objectif perte (kg)</dt>
					<dd>{userSelected.profile.weightLossGoalKg ?? '—'}</dd>
					<dt class="text-muted-foreground">Jeûne intermittent matin</dt>
					<dd>{userSelected.profile.intermittentFastingMorning == null ? '—' : userSelected.profile.intermittentFastingMorning ? 'Oui' : 'Non'}</dd>
					<dt class="text-muted-foreground">Sport existant</dt>
					<dd>{userSelected.profile.sportActivity ?? '—'}</dd>
					<dt class="text-muted-foreground">Tri liste de courses</dt>
					<dd>{userSelected.profile.shoppingListSortOrder ?? '—'}</dd>
					{#if userSelected.profile.familyCoefficients?.length}
						<dt class="text-muted-foreground">Coeff. famille</dt>
						<dd>{userSelected.profile.familyCoefficients.map((c) => `${c.label}: ${c.coefficient}`).join(', ')}</dd>
					{/if}
					<dt class="text-muted-foreground">Mis à jour le</dt>
					<dd>{fmtDate(userSelected.profile.updatedAt)}</dd>
				</dl>
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-muted-foreground text-sm">Aucun profil renseigné.</p>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Mensurations (historique)</Card.Title>
			<Card.Description>Dernières entrées, triées par date.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.bodyMeasurements?.length}
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Date</Table.Head>
								<Table.Head>Âge</Table.Head>
								<Table.Head>Taille (cm)</Table.Head>
								<Table.Head>Poids (kg)</Table.Head>
								<Table.Head>Tour taille (cm)</Table.Head>
								<Table.Head>Poitrine (cm)</Table.Head>
								<Table.Head>Bras (cm)</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.bodyMeasurements as m}
								<Table.Row>
									<Table.Cell>{fmtDate(m.createdAt)}</Table.Cell>
									<Table.Cell>{m.age ?? '—'}</Table.Cell>
									<Table.Cell>{m.heightCm ?? '—'}</Table.Cell>
									<Table.Cell>{m.weightKg ?? '—'}</Table.Cell>
									<Table.Cell>{m.waistCm ?? '—'}</Table.Cell>
									<Table.Cell>{m.chestCm ?? '—'}</Table.Cell>
									<Table.Cell>{m.armCm ?? '—'}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune mensuration.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
