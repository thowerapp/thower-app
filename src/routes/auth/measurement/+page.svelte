<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { Textarea } from '$shadcn/textarea';
	import { Label } from '$shadcn/label/index.js';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { toast } from 'svelte-sonner';
	import { measurementSchema, objectiveValues } from '$lib/schema/measurement/measurementSchema';
	import type { PageProps } from './$types';
	import { Ruler, Activity } from 'lucide-svelte';

	let { data }: PageProps = $props();

	const formOptions = {
		validators: zodClient(measurementSchema),
		id: 'measurementForm'
	};

	const measurementForm = $derived.by(() => superForm(data.measurementForm, formOptions));

	const {
		form: measurementData,
		enhance: measurementEnhance,
		message: measurementMessage
	} = $derived(measurementForm);

	$effect(() => {
		if ($measurementMessage) {
			toast.success($measurementMessage);
		}
	});

	const objectiveLabels: Record<string, string> = {
		fat_loss: 'Perte de graisse',
		muscle_gain: 'Prise de muscle',
		more_energy: "Plus d'énergie",
		more_libido: 'Plus de libido',
		better_sleep: 'Meilleur sommeil',
		better_body: 'Se sentir mieux dans son corps',
		better_mind: 'Se sentir mieux dans sa tête'
	};

	function toggleObjective(value: string) {
		const current = ($measurementData.objectives ?? []) as string[];
		if (current.includes(value)) {
			$measurementData.objectives = current.filter((o: string) => o !== value);
		} else {
			$measurementData.objectives = [...current, value];
		}
	}
</script>

<div class="container w-[100vw] h-full mx-auto px-4 py-8">
	<h1 class="titleHome mb-8 text-3xl font-bold tracking-tight">Mon profil physique</h1>

	<form method="POST" action="?/save" use:measurementEnhance class="space-y-8 pb-[100px]">
		<input type="hidden" name="objectives" value={JSON.stringify(($measurementData.objectives ?? []) as string[])} />

		<!-- Bloc 1 – Mesures -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Ruler class="w-6 h-6 text-primary" />
					<span>Mesures</span>
				</Card.Title>
				<Card.Description>Âge, taille, poids et tours (en cm).</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<Form.Field name="age" form={measurementForm}>
					<Form.Control>
						<Form.Label>Âge (ans)</Form.Label>
						<Input type="number" name="age" bind:value={$measurementData.age as number | undefined} min={10} max={120} placeholder="25" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="heightCm" form={measurementForm}>
					<Form.Control>
						<Form.Label>Taille (cm)</Form.Label>
						<Input type="number" name="heightCm" bind:value={$measurementData.heightCm as number | undefined} min={100} max={250} placeholder="175" step="0.1" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="weightKg" form={measurementForm}>
					<Form.Control>
						<Form.Label>Poids (kg)</Form.Label>
						<Input type="number" name="weightKg" bind:value={$measurementData.weightKg as number | undefined} min={30} max={300} placeholder="70" step="0.1" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="waistCm" form={measurementForm}>
					<Form.Control>
						<Form.Label>Tour de taille (cm)</Form.Label>
						<Input type="number" name="waistCm" bind:value={$measurementData.waistCm as number | undefined} min={50} max={200} placeholder="80" step="0.1" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="chestCm" form={measurementForm}>
					<Form.Control>
						<Form.Label>Tour de torse (cm)</Form.Label>
						<Input type="number" name="chestCm" bind:value={$measurementData.chestCm as number | undefined} min={50} max={200} placeholder="100" step="0.1" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="armCm" form={measurementForm}>
					<Form.Control>
						<Form.Label>Tour de bras (cm)</Form.Label>
						<Input type="number" name="armCm" bind:value={$measurementData.armCm as number | undefined} min={15} max={80} placeholder="32" step="0.1" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<!-- Bloc 2 – Jeûne intermittent -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Jeûne intermittent le matin</Card.Title>
				<Card.Description>Pratiquez-vous le jeûne intermittent le matin ?</Card.Description>
			</Card.Header>
			<Card.Content class="flex gap-4">
				<label class="flex items-center gap-2">
					<input type="radio" name="intermittentFastingMorning" value="off" checked={!($measurementData.intermittentFastingMorning ?? false)} onchange={() => ($measurementData.intermittentFastingMorning = false)} />
					Non
				</label>
				<label class="flex items-center gap-2">
					<input type="radio" name="intermittentFastingMorning" value="on" checked={$measurementData.intermittentFastingMorning === true} onchange={() => ($measurementData.intermittentFastingMorning = true)} />
					Oui
				</label>
			</Card.Content>
		</Card.Root>

		<!-- Bloc 3 – Niveau d'activité -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Niveau actuel</Card.Title>
				<Card.Description>Comment qualifieriez-vous votre niveau d'activité ?</Card.Description>
			</Card.Header>
			<Card.Content>
				<Form.Field name="activityLevel" form={measurementForm}>
					<Form.Control>
						<Form.Label>Niveau</Form.Label>
						<select
							name="activityLevel"
							bind:value={$measurementData.activityLevel}
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:text-sm"
						>
							<option value={undefined}>— Choisir —</option>
							<option value="SEDENTARY">Sédentaire</option>
							<option value="ACTIVE">Actif</option>
							<option value="ATHLETE">Sportif</option>
						</select>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<!-- Bloc 4 – Objectifs -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Objectifs</Card.Title>
				<Card.Description>Un ou plusieurs objectifs (cases à cocher).</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-4">
				{#each objectiveValues as value}
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							checked={(($measurementData.objectives ?? []) as string[]).includes(value)}
							onchange={() => toggleObjective(value)}
						/>
						{objectiveLabels[value]}
					</label>
				{/each}
			</Card.Content>
		</Card.Root>

		<!-- Bloc 5 – Texte libre -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Informations complémentaires</Card.Title>
				<Card.Description>Douleurs, contexte, pain, activité sportive.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<Form.Field name="painsPathologies" form={measurementForm}>
					<Form.Control>
						<Form.Label>Douleurs / pathologies / contre-indications</Form.Label>
						<Textarea name="painsPathologies" bind:value={$measurementData.painsPathologies as string | undefined} rows={3} placeholder="Ex. mal de dos, hypertension..." class="resize-y" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="contextParticular" form={measurementForm}>
					<Form.Control>
						<Form.Label>Contexte particulier</Form.Label>
						<Textarea name="contextParticular" bind:value={$measurementData.contextParticular as string | undefined} rows={3} placeholder="Ex. travail de nuit, déplacements, resto le vendredi midi..." class="resize-y" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="breadManagement" form={measurementForm}>
					<Form.Control>
						<Form.Label>Gestion du pain</Form.Label>
						<Textarea name="breadManagement" bind:value={$measurementData.breadManagement as string | undefined} rows={2} placeholder="Consommation de pain habituelle..." class="resize-y" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="sportActivity" form={measurementForm}>
					<Form.Control>
						<Form.Label>Activité sportive</Form.Label>
						<Textarea name="sportActivity" bind:value={$measurementData.sportActivity as string | undefined} rows={3} placeholder="Ex. foot le mardi, VTT le dimanche, course 10 km..." class="resize-y" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-end">
			<Button type="submit">Enregistrer</Button>
		</div>
	</form>

	{#if data.measurements?.length > 0}
		<Card.Root class="mt-8">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Activity class="w-6 h-6 text-primary" />
					<span>Historique des mesures</span>
				</Card.Title>
				<Card.Description>Vos derniers enregistrements.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2">
					{#each data.measurements as m}
						<li class="flex flex-wrap items-center gap-2 text-sm">
							<strong>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</strong>
							{#if m.weightKg != null}<span>• {m.weightKg} kg</span>{/if}
							{#if m.heightCm != null}<span>• {m.heightCm} cm</span>{/if}
							{#if m.waistCm != null}<span>• Taille {m.waistCm} cm</span>{/if}
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style lang="scss">
	.titleHome {
		font-family: 'Open Sans Variable', sans-serif;
		font-style: italic;
		font-size: 50px;
		margin-bottom: 12px;
		margin-top: 20px;
		-webkit-text-stroke: 1px black;
		color: transparent;
		text-transform: uppercase;
		font-weight: 900;
	}
</style>
