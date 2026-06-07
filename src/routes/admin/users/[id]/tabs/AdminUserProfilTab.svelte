<script lang="ts">
	import * as AlertDialog from '$shadcn/alert-dialog/index.js';
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import * as Tabs from '$shadcn/tabs';
	import { Input } from '$shadcn/input';
	import { Textarea } from '$shadcn/textarea';
	import { Label } from '$shadcn/label';
	import { Button } from '$shadcn/button';
	import { Badge } from '$shadcn/badge';
	import { Separator } from '$shadcn/separator';
	import CalendarCog from 'lucide-svelte/icons/calendar-cog';
	import Camera from 'lucide-svelte/icons/camera';
	import HeartPulse from 'lucide-svelte/icons/heart-pulse';
	import Ruler from 'lucide-svelte/icons/ruler';
	import ClipboardCheck from 'lucide-svelte/icons/clipboard-check';
	import Activity from 'lucide-svelte/icons/activity';
	import Target from 'lucide-svelte/icons/target';
	import Wheat from 'lucide-svelte/icons/wheat';
	import Smile from 'lucide-svelte/icons/smile';
	import CircleAlert from 'lucide-svelte/icons/circle-alert';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import type { ProgressPhotoSelected, UserProfileSelected, UserSelected } from '../types';
	import { fmtDate } from '../types';
	import { breadTypeOptions } from '$lib/schema/profile/breadType';

	let { userSelected }: { userSelected: UserSelected } = $props();

	const selectClass =
		'border-input bg-background ring-offset-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

	const profileScoreFields = [
		{ name: 'stressLevel', label: 'Stress' },
		{ name: 'sleepQuality', label: 'Sommeil' },
		{ name: 'bodyConfidence', label: 'Confiance corps' },
		{ name: 'digestionQuality', label: 'Digestion' },
		{ name: 'happinessLevel', label: 'Bonheur' },
		{ name: 'readinessToChange', label: 'Prêt à changer' }
	] as const satisfies ReadonlyArray<{ name: keyof UserProfileSelected; label: string }>;

	const monthlyScoreFields = [
		{ name: 'stressLevel', label: 'Stress' },
		{ name: 'sleepQuality', label: 'Sommeil' },
		{ name: 'bodyConfidence', label: 'Confiance corps' },
		{ name: 'digestionQuality', label: 'Digestion' },
		{ name: 'happinessLevel', label: 'Bonheur' },
		{ name: 'readinessToChange', label: 'Prêt à changer' }
	] as const;

	function toDateInput(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 10) : '';
	}

	function toDateTimeLocal(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 16) : '';
	}

	function joinValues(values: string[] | undefined): string {
		return values?.join(', ') ?? '';
	}

	function jsonValue(value: unknown): string {
		return value == null ? '' : JSON.stringify(value);
	}

	function confirmRegeneration(event: SubmitEvent) {
		if (!confirm('Cette modification peut régénérer le futur programme de cet utilisateur. Continuer ?')) {
			event.preventDefault();
		}
	}

	let programSettingsConfirmOpen = $state(false);
	let pendingProgramSettingsForm: HTMLFormElement | null = null;
	let programSettingsSubmitConfirmed = false;

	function confirmProgramSettings(event: SubmitEvent) {
		if (programSettingsSubmitConfirmed) {
			programSettingsSubmitConfirmed = false;
			return;
		}

		event.preventDefault();
		pendingProgramSettingsForm = event.currentTarget as HTMLFormElement;
		programSettingsConfirmOpen = true;
	}

	function closeProgramSettingsConfirm() {
		programSettingsConfirmOpen = false;
		pendingProgramSettingsForm = null;
	}

	function submitConfirmedProgramSettings() {
		const form = pendingProgramSettingsForm;
		if (!form) return;

		programSettingsSubmitConfirmed = true;
		programSettingsConfirmOpen = false;
		pendingProgramSettingsForm = null;
		form.requestSubmit();
	}

	// Récupérer les photos de validation (month = 0)
	const validationPhotos = $derived.by(() => {
		const photos = (userSelected.progressPhotos ?? []) as ProgressPhotoSelected[];
		return photos.filter((p) => p.month === 0 || !p.month);
	});

	const photoByAngle = $derived.by(() => {
		const photosByAngle: Partial<Record<string, string>> = {};
		for (const photo of validationPhotos) {
			photosByAngle[photo.angle] = photo.url;
		}
		return photosByAngle;
	});

	const photoValidated = $derived(userSelected.photoValidationStatus === 'VALIDATED');
	const angleLabels: Record<string, string> = { FRONT: 'Face', SIDE: 'Profil', BACK: 'Dos' };
</script>

<Tabs.Root value="programme" class="w-full">
	<Tabs.List class="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
		<Tabs.Trigger value="programme" class="gap-1.5">
			<CalendarCog class="size-4" />
			Programme & photos
		</Tabs.Trigger>
		<Tabs.Trigger value="sante" class="gap-1.5">
			<HeartPulse class="size-4" />
			Santé & profil
		</Tabs.Trigger>
		<Tabs.Trigger value="mensurations" class="gap-1.5">
			<Ruler class="size-4" />
			Mensurations
		</Tabs.Trigger>
		<Tabs.Trigger value="checkins" class="gap-1.5">
			<ClipboardCheck class="size-4" />
			Check-ins
		</Tabs.Trigger>
	</Tabs.List>

	<!-- ════════════ PROGRAMME & PHOTOS ════════════ -->
	<Tabs.Content value="programme" class="mt-4 space-y-6">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<CalendarCog class="size-5 text-primary" />
					<Card.Title>Paramètres programme / validation photo</Card.Title>
				</div>
				<Card.Description>
					Les champs programme demandent une confirmation car ils peuvent relancer une génération.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/updateProgramSettings" class="space-y-6" onsubmit={confirmProgramSettings}>
					<input type="hidden" name="id" value={userSelected.id ?? ''} />
					<input type="hidden" name="confirmRegenerate" value="1" />

					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						<div class="space-y-1.5">
							<Label for="nutritionDaysAllocated">Jours nutrition alloués</Label>
							<Input id="nutritionDaysAllocated" type="number" min="0" max="1000" name="nutritionDaysAllocated" value={userSelected.nutritionDaysAllocated ?? 0} />
						</div>
						<div class="space-y-1.5">
							<Label for="programStartDate">Début programme</Label>
							<Input id="programStartDate" type="date" name="programStartDate" value={toDateInput(userSelected.programStartDate)} />
						</div>
						<div class="space-y-1.5">
							<Label for="photoValidationStatus">Statut validation photo</Label>
							<select id="photoValidationStatus" class={selectClass} name="photoValidationStatus">
								<option value="PENDING" selected={!photoValidated}>En attente</option>
								<option value="VALIDATED" selected={photoValidated}>Validée</option>
							</select>
						</div>
						<div class="space-y-1.5">
							<Label for="photoValidatedAt">Photo validée le</Label>
							<Input id="photoValidatedAt" type="datetime-local" name="photoValidatedAt" value={toDateTimeLocal(userSelected.photoValidatedAt)} />
						</div>
					</div>

					<Separator />

					<div class="space-y-1">
						<p class="text-sm font-medium">Morphologie de référence</p>
						<p class="text-xs text-muted-foreground">
							Ces valeurs sont stockées dans le profil et utilisées pour les cibles nutritionnelles.
						</p>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="ps-bodyFatPercent">Masse grasse (%)</Label>
							<Input id="ps-bodyFatPercent" type="number" step="0.1" min="3" max="70" name="bodyFatPercent" value={userSelected.profile?.bodyFatPercent ?? ''} />
						</div>
						<div class="space-y-1.5">
							<Label for="ps-weightLossGoalKg">Objectif perte (kg)</Label>
							<Input id="ps-weightLossGoalKg" type="number" step="0.1" min="0.5" max="150" name="weightLossGoalKg" value={userSelected.profile?.weightLossGoalKg ?? ''} />
						</div>
					</div>

					<div class="flex items-center gap-3">
						<Button type="submit">Enregistrer les paramètres</Button>
						<Badge variant={photoValidated ? 'default' : 'secondary'} class={photoValidated ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
							{photoValidated ? 'Photos validées' : 'Photos en attente'}
						</Badge>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<AlertDialog.Root bind:open={programSettingsConfirmOpen} onOpenChange={(open) => (open ? (programSettingsConfirmOpen = true) : closeProgramSettingsConfirm())}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Confirmer la mise à jour</AlertDialog.Title>
					<AlertDialog.Description>
						Cette modification peut régénérer le futur programme de cet utilisateur. Continuer ?
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel type="button" onclick={closeProgramSettingsConfirm}>Annuler</AlertDialog.Cancel>
					<AlertDialog.Action type="button" onclick={submitConfirmedProgramSettings}>Confirmer</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>

		<!-- Photos d'inscription (month = 0) -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<Camera class="size-5 text-primary" />
					<Card.Title>Photos d'inscription</Card.Title>
				</div>
				<Card.Description>Éditer les URLs R2 des photos de validation (mois 0).</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each ['FRONT', 'SIDE', 'BACK'] as angle (angle)}
						{@const photo = validationPhotos.find((p) => p.angle === angle)}
						<form method="POST" action="?/upsertProgressPhoto" class="space-y-3 rounded-lg border bg-card p-3">
							<input type="hidden" name="id" value={photo?.id ?? ''} />
							<input type="hidden" name="angle" value={angle} />
							<input type="hidden" name="month" value="0" />
							<div class="flex items-center justify-between">
								<p class="text-sm font-semibold">{angleLabels[angle]}</p>
								<Badge variant="outline" class="text-xs">{angle}</Badge>
							</div>
							{#if photoByAngle[angle]}
								<img src={photoByAngle[angle]} alt={angle} class="aspect-[3/4] w-full rounded-md border object-cover" />
							{:else}
								<div class="flex aspect-[3/4] w-full items-center justify-center rounded-md border border-dashed bg-muted text-muted-foreground">
									<Camera class="size-6 opacity-40" />
								</div>
							{/if}
							<div class="space-y-1.5">
								<Label class="text-xs">URL</Label>
								<Input class="text-xs" name="url" value={photo?.url ?? ''} placeholder="/api/cloudflare/r2/image/photos/..." />
							</div>
							<div class="space-y-1.5">
								<Label class="text-xs">Upload</Label>
								<Input type="datetime-local" name="uploadedAt" value={toDateTimeLocal(photo?.uploadedAt)} />
							</div>
							<Button type="submit" variant="outline" size="sm" class="w-full">Enregistrer</Button>
						</form>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</Tabs.Content>

	<!-- ════════════ SANTÉ & PROFIL ════════════ -->
	<Tabs.Content value="sante" class="mt-4 space-y-6">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<HeartPulse class="size-5 text-primary" />
					<Card.Title>Profil & santé</Card.Title>
				</div>
				<Card.Description>
					Formulaire complet. Certains champs nutrition/santé déclenchent une confirmation de régénération.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/updateProfile" class="space-y-8" onsubmit={confirmRegeneration}>
					<input type="hidden" name="id" value={userSelected.id ?? ''} />
					<input type="hidden" name="confirmRegenerate" value="1" />

					<!-- Activité & préférences -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<Activity class="size-4 text-muted-foreground" />
							Activité & préférences
						</div>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div class="space-y-1.5">
								<Label for="activityLevel">Niveau d'activité</Label>
								<select id="activityLevel" class={selectClass} name="activityLevel">
									<option value="">—</option>
									<option value="SEDENTARY" selected={userSelected.profile?.activityLevel === 'SEDENTARY'}>Sédentaire</option>
									<option value="ACTIVE" selected={userSelected.profile?.activityLevel === 'ACTIVE'}>Actif</option>
									<option value="ATHLETE" selected={userSelected.profile?.activityLevel === 'ATHLETE'}>Athlète</option>
								</select>
							</div>
							<div class="space-y-1.5">
								<Label for="coffeePerDay">Cafés / jour</Label>
								<Input id="coffeePerDay" type="number" min="0" max="20" name="coffeePerDay" value={userSelected.profile?.coffeePerDay ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="shoppingListSortOrder">Tri liste de courses</Label>
								<select id="shoppingListSortOrder" class={selectClass} name="shoppingListSortOrder">
									<option value="">—</option>
									<option value="category" selected={userSelected.profile?.shoppingListSortOrder === 'category'}>Catégorie</option>
									<option value="alphabetical" selected={userSelected.profile?.shoppingListSortOrder === 'alphabetical'}>Alphabétique</option>
								</select>
							</div>
						</div>
					</section>

					<Separator />

					<!-- Objectifs & restrictions -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<Target class="size-4 text-muted-foreground" />
							Objectifs & restrictions
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="objectives">Objectifs <span class="font-normal text-muted-foreground">(séparés par virgules)</span></Label>
								<Input id="objectives" name="objectives" value={joinValues(userSelected.profile?.objectives)} />
							</div>
							<div class="space-y-1.5">
								<Label for="allergens">Allergènes <span class="font-normal text-muted-foreground">(séparés par virgules)</span></Label>
								<Input id="allergens" name="allergens" value={joinValues(userSelected.profile?.allergens)} />
							</div>
							<div class="space-y-1.5">
								<Label for="kitchenEquipment">Équipement cuisine</Label>
								<Input id="kitchenEquipment" name="kitchenEquipment" value={joinValues(userSelected.profile?.kitchenEquipment)} />
							</div>
							<div class="space-y-1.5">
								<Label for="familyCoefficients">Coeff. famille <span class="font-normal text-muted-foreground">(JSON)</span></Label>
								<Input id="familyCoefficients" class="font-mono text-xs" name="familyCoefficients" value={jsonValue(userSelected.profile?.familyCoefficients)} />
							</div>
						</div>
					</section>

					<Separator />

					<!-- Santé & contexte -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<CircleAlert class="size-4 text-muted-foreground" />
							Santé & contexte
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="painsPathologies">Douleurs / pathologies</Label>
								<Textarea id="painsPathologies" class="min-h-24" name="painsPathologies" value={userSelected.profile?.painsPathologies ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="contextParticular">Contexte particulier</Label>
								<Textarea id="contextParticular" class="min-h-24" name="contextParticular" value={userSelected.profile?.contextParticular ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="disgustingFoods">Aliments détestés</Label>
								<Textarea id="disgustingFoods" class="min-h-24" name="disgustingFoods" value={userSelected.profile?.disgustingFoods ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="otherAllergens">Autres allergènes</Label>
								<Textarea id="otherAllergens" class="min-h-24" name="otherAllergens" value={userSelected.profile?.otherAllergens ?? ''} />
							</div>
						</div>
					</section>

					<Separator />

					<!-- Habitudes -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<Smile class="size-4 text-muted-foreground" />
							Habitudes
						</div>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<label class="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
								<input type="checkbox" name="breadDaily" checked={userSelected.profile?.breadDaily ?? false} class="size-4 accent-primary" />
								<span>Pain quotidien</span>
							</label>
							<label class="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
								<input type="checkbox" name="breakfastEnabled" checked={userSelected.profile?.breakfastEnabled ?? false} class="size-4 accent-primary" />
								<span>Petit-déjeuner</span>
							</label>
							<div class="space-y-1.5">
								<Label for="alcoholHabit">Alcool</Label>
								<select id="alcoholHabit" class={selectClass} name="alcoholHabit">
									<option value="">—</option>
									<option value="true" selected={userSelected.profile?.alcoholHabit === true}>Oui</option>
									<option value="false" selected={userSelected.profile?.alcoholHabit === false}>Non</option>
								</select>
							</div>
							<div class="space-y-1.5">
								<Label for="tobaccoHabit">Tabac</Label>
								<select id="tobaccoHabit" class={selectClass} name="tobaccoHabit">
									<option value="">—</option>
									<option value="true" selected={userSelected.profile?.tobaccoHabit === true}>Oui</option>
									<option value="false" selected={userSelected.profile?.tobaccoHabit === false}>Non</option>
								</select>
							</div>
						</div>
					</section>

					<Separator />

					<!-- Pain -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<Wheat class="size-4 text-muted-foreground" />
							Pain
						</div>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div class="space-y-1.5">
								<Label for="breadGramsPerDay">Pain (g / jour)</Label>
								<Input id="breadGramsPerDay" type="number" min="0" max="2000" name="breadGramsPerDay" value={userSelected.profile?.breadGramsPerDay ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="breadType">Type de pain</Label>
								<select id="breadType" class={selectClass} name="breadType">
									<option value="">—</option>
									{#each breadTypeOptions as option (option.value)}
										<option value={option.value} selected={userSelected.profile?.breadType === option.value}>{option.label}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-1.5 lg:col-span-2">
								<Label for="breadManagement">Précisions pain</Label>
								<Input id="breadManagement" name="breadManagement" value={userSelected.profile?.breadManagement ?? ''} />
							</div>
						</div>
					</section>

					<Separator />

					<!-- Morphologie & jeûne -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<Ruler class="size-4 text-muted-foreground" />
							Morphologie & jeûne
						</div>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div class="space-y-1.5">
								<Label for="bodyFatPercent">Masse grasse (%)</Label>
								<Input id="bodyFatPercent" type="number" step="0.1" min="3" max="70" name="bodyFatPercent" value={userSelected.profile?.bodyFatPercent ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="weightLossGoalKg">Objectif perte (kg)</Label>
								<Input id="weightLossGoalKg" type="number" step="0.1" min="0.5" max="150" name="weightLossGoalKg" value={userSelected.profile?.weightLossGoalKg ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="intermittentFastingMorning">Jeûne matin</Label>
								<select id="intermittentFastingMorning" class={selectClass} name="intermittentFastingMorning">
									<option value="">—</option>
									<option value="true" selected={userSelected.profile?.intermittentFastingMorning === true}>Oui</option>
									<option value="false" selected={userSelected.profile?.intermittentFastingMorning === false}>Non</option>
								</select>
							</div>
							<div class="space-y-1.5">
								<Label for="sportActivity">Sport existant</Label>
								<Input id="sportActivity" name="sportActivity" value={userSelected.profile?.sportActivity ?? ''} />
							</div>
						</div>
					</section>

					<Separator />

					<!-- Scores bien-être -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<HeartPulse class="size-4 text-muted-foreground" />
							Scores bien-être <span class="font-normal text-muted-foreground">(1 à 10)</span>
						</div>
						<div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
							{#each profileScoreFields as field (field.name)}
								<div class="space-y-1.5">
									<Label for={`profile-${field.name}`}>{field.label}</Label>
									<Input id={`profile-${field.name}`} class="text-center" type="number" min="1" max="10" name={field.name} value={userSelected.profile?.[field.name] ?? ''} />
								</div>
							{/each}
						</div>
					</section>

					<Separator />

					<!-- Objectifs personnels -->
					<section class="space-y-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							<Target class="size-4 text-muted-foreground" />
							Objectifs personnels
						</div>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div class="space-y-1.5">
								<Label for="physicalObjective">Objectif physique</Label>
								<Textarea id="physicalObjective" class="min-h-20" name="physicalObjective" value={userSelected.profile?.physicalObjective ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="eventMotivation">Motivation événement</Label>
								<Textarea id="eventMotivation" class="min-h-20" name="eventMotivation" value={userSelected.profile?.eventMotivation ?? ''} />
							</div>
							<div class="space-y-1.5">
								<Label for="addictionsText">Addictions / habitudes</Label>
								<Textarea id="addictionsText" class="min-h-20" name="addictionsText" value={userSelected.profile?.addictionsText ?? ''} />
							</div>
						</div>
					</section>

					<div class="flex flex-wrap items-center gap-3 border-t pt-4">
						<Button type="submit">Enregistrer le profil</Button>
						<span class="text-xs text-muted-foreground">Dernière mise à jour : {fmtDate(userSelected.profile?.updatedAt)}</span>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</Tabs.Content>

	<!-- ════════════ MENSURATIONS ════════════ -->
	<Tabs.Content value="mensurations" class="mt-4 space-y-6">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<Ruler class="size-5 text-primary" />
					<Card.Title>Mensurations (historique)</Card.Title>
				</div>
				<Card.Description>Créer, modifier ou supprimer une mesure. Chaque action demande confirmation de régénération.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<form method="POST" action="?/upsertBodyMeasurement" class="rounded-lg border bg-muted/30 p-4" onsubmit={confirmRegeneration}>
					<input type="hidden" name="confirmRegenerate" value="1" />
					<div class="mb-3 flex items-center gap-2 text-sm font-semibold">
						<Plus class="size-4 text-muted-foreground" />
						Nouvelle mensuration
					</div>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
						<div class="space-y-1.5 sm:col-span-2 lg:col-span-1">
							<Label class="text-xs">Date</Label>
							<Input type="datetime-local" name="createdAt" />
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Âge</Label>
							<Input type="number" min="10" max="120" name="age" />
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Taille</Label>
							<Input type="number" step="0.1" name="heightCm" />
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Poids</Label>
							<Input type="number" step="0.1" name="weightKg" />
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Tour taille</Label>
							<Input type="number" step="0.1" name="waistCm" />
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Poitrine</Label>
							<Input type="number" step="0.1" name="chestCm" />
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Bras</Label>
							<Input type="number" step="0.1" name="armCm" />
						</div>
					</div>
					<div class="mt-4">
						<Button type="submit" variant="outline" size="sm">
							<Plus class="mr-1.5 size-4" />
							Ajouter une mensuration
						</Button>
					</div>
				</form>

				{#if userSelected.bodyMeasurements?.length}
					<div class="hidden">
						{#each userSelected.bodyMeasurements as m (m.id)}
							<form id={`measurement-${m.id}`} method="POST" action="?/upsertBodyMeasurement" onsubmit={confirmRegeneration}>
								<input type="hidden" name="id" value={m.id} />
								<input type="hidden" name="confirmRegenerate" value="1" />
							</form>
						{/each}
					</div>
					<div class="overflow-x-auto rounded-md border">
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
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each userSelected.bodyMeasurements as m (m.id)}
									<Table.Row>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-40" type="datetime-local" name="createdAt" value={toDateTimeLocal(m.createdAt)} /></Table.Cell>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-20" type="number" name="age" value={m.age ?? ''} /></Table.Cell>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-24" type="number" step="0.1" name="heightCm" value={m.heightCm ?? ''} /></Table.Cell>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-24" type="number" step="0.1" name="weightKg" value={m.weightKg ?? ''} /></Table.Cell>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-24" type="number" step="0.1" name="waistCm" value={m.waistCm ?? ''} /></Table.Cell>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-24" type="number" step="0.1" name="chestCm" value={m.chestCm ?? ''} /></Table.Cell>
										<Table.Cell><Input form={`measurement-${m.id}`} class="w-24" type="number" step="0.1" name="armCm" value={m.armCm ?? ''} /></Table.Cell>
										<Table.Cell class="space-x-2 whitespace-nowrap text-right">
											<Button form={`measurement-${m.id}`} type="submit" variant="outline" size="sm">Sauver</Button>
											<form method="POST" action="?/deleteBodyMeasurement" class="inline" onsubmit={confirmRegeneration}>
												<input type="hidden" name="id" value={m.id} />
												<input type="hidden" name="confirmRegenerate" value="1" />
												<Button type="submit" variant="ghost" size="sm" class="text-destructive hover:text-destructive">
													<Trash2 class="size-4" />
												</Button>
											</form>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">Aucune mensuration.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</Tabs.Content>

	<!-- ════════════ CHECK-INS ════════════ -->
	<Tabs.Content value="checkins" class="mt-4 space-y-6">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<ClipboardCheck class="size-5 text-primary" />
					<Card.Title>Monthly check-ins</Card.Title>
				</div>
				<Card.Description>Éditer les scores mensuels et les statuts associés.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<form method="POST" action="?/upsertMonthlyCheckIn" class="rounded-lg border bg-muted/30 p-4">
					<div class="mb-3 flex items-center gap-2 text-sm font-semibold">
						<Plus class="size-4 text-muted-foreground" />
						Nouveau check-in
					</div>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
						<div class="space-y-1.5">
							<Label class="text-xs">Mois</Label>
							<Input type="number" min="0" max="12" name="month" />
						</div>
						{#each monthlyScoreFields as field (field.name)}
							<div class="space-y-1.5">
								<Label class="text-xs">{field.label}</Label>
								<Input type="number" min="1" max="10" name={field.name} />
							</div>
						{/each}
						<div class="space-y-1.5">
							<Label class="text-xs">Soumis le</Label>
							<Input type="datetime-local" name="submittedAt" />
						</div>
					</div>
					<div class="mt-3 flex flex-wrap items-center gap-4">
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" name="pointsAwarded" class="size-4 accent-primary" />
							<span>Points</span>
						</label>
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" name="nutritionRecalibrated" class="size-4 accent-primary" />
							<span>Recalibré</span>
						</label>
						<Button type="submit" variant="outline" size="sm">Ajouter / remplacer le mois</Button>
					</div>
				</form>

				{#if userSelected.monthlyCheckIns?.length}
					<div class="grid gap-4">
						{#each userSelected.monthlyCheckIns as checkIn (checkIn.id)}
							<form method="POST" action="?/upsertMonthlyCheckIn" class="rounded-lg border bg-card p-4">
								<input type="hidden" name="id" value={checkIn.id} />
								<div class="mb-3 flex items-center gap-2">
									<Badge variant="secondary">Mois {checkIn.month}</Badge>
									{#if checkIn.pointsAwarded}<Badge variant="outline" class="text-xs">Points</Badge>{/if}
									{#if checkIn.nutritionRecalibrated}<Badge variant="outline" class="text-xs">Recalibré</Badge>{/if}
								</div>
								<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
									<div class="space-y-1.5">
										<Label class="text-xs">Mois</Label>
										<Input type="number" min="0" max="12" name="month" value={checkIn.month} />
									</div>
									{#each monthlyScoreFields as field (field.name)}
										<div class="space-y-1.5">
											<Label class="text-xs">{field.label}</Label>
											<Input type="number" min="1" max="10" name={field.name} value={checkIn[field.name] ?? ''} />
										</div>
									{/each}
									<div class="space-y-1.5">
										<Label class="text-xs">Soumis le</Label>
										<Input type="datetime-local" name="submittedAt" value={toDateTimeLocal(checkIn.submittedAt)} />
									</div>
								</div>
								<div class="mt-3 flex flex-wrap items-center gap-4">
									<label class="flex items-center gap-2 text-sm">
										<input type="checkbox" name="pointsAwarded" checked={checkIn.pointsAwarded ?? false} class="size-4 accent-primary" />
										<span>Points</span>
									</label>
									<label class="flex items-center gap-2 text-sm">
										<input type="checkbox" name="nutritionRecalibrated" checked={checkIn.nutritionRecalibrated ?? false} class="size-4 accent-primary" />
										<span>Recalibré</span>
									</label>
									<Button type="submit" variant="outline" size="sm">Enregistrer le mois {checkIn.month}</Button>
								</div>
							</form>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">Aucun check-in mensuel.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</Tabs.Content>
</Tabs.Root>
