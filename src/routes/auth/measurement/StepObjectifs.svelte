<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Textarea } from '$shadcn/textarea';
	import { Separator } from '$shadcn/separator';
	import { Checkbox } from '$shadcn/checkbox';
	import { Target } from 'lucide-svelte';
	import { objectiveValues } from '$lib/schema/measurement/measurementSchema';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form, formData }: { form: any; formData: any } = $props();

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
		const current = ($formData.objectives ?? []) as string[];
		$formData.objectives = current.includes(value)
			? current.filter((o: string) => o !== value)
			: [...current, value];
	}
</script>

<div class="step-content">
	<div class="step-heading">
		<Target class="step-icon" />
		<div>
			<h2 class="step-title">Objectifs</h2>
			<p class="step-desc">Ce que tu veux vraiment obtenir avec la Méthode Thower.</p>
		</div>
	</div>

	<Card.Root class="meas-card">
		<Card.Header class="pb-3">
			<Card.Title class="text-sm font-semibold">Objectifs généraux</Card.Title>
			<Card.Description class="text-xs">Sélectionne tout ce qui s'applique.</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<div class="objectives-grid">
				{#each objectiveValues as value}
					<button
						type="button"
						class="objective-chip"
						class:selected={(($formData.objectives ?? []) as string[]).includes(value)}
						onclick={() => toggleObjective(value)}
						aria-pressed={(($formData.objectives ?? []) as string[]).includes(value)}
					>
						<Checkbox
							checked={(($formData.objectives ?? []) as string[]).includes(value)}
							class="pointer-events-none"
						/>
						{objectiveLabels[value]}
					</button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="meas-card mt-4">
		<Card.Header class="pb-3">
			<Card.Title class="text-sm font-semibold">Perte de poids ciblée</Card.Title>
			<Card.Description class="text-xs">
				Utilisé pour calculer ton déficit calorique sur la période méthode (91 jours). Laisse vide si tu n’as pas d’objectif chiffré.
			</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<Form.Field name="weightLossGoalKg" {form}>
				<Form.Control>
					<Form.Label class="meas-label font-medium">Objectif de perte (kg)</Form.Label>
					<div class="input-unit-wrap">
						<Input
							class="meas-input"
							type="number"
							name="weightLossGoalKg"
							bind:value={$formData.weightLossGoalKg}
							min={0.5}
							max={150}
							step="0.1"
							placeholder="ex. 6"
						/>
						<span class="unit">kg</span>
					</div>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</Card.Content>
	</Card.Root>

	<Card.Root class="meas-card mt-4">
		<Card.Content class="pt-5 pb-5 space-y-4">
			<Form.Field name="physicalObjective" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Objectif physique précis</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Ex. : Perdre 12 kg, passer de 100 à 80 cm de tour de taille, avoir un physique athlétique et sec.</p>
					<Textarea
					class="meas-input resize-y"
					name="physicalObjective"
					bind:value={$formData.physicalObjective}
					rows={3}
					placeholder="Décris ton objectif chiffré..."
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Separator />
			<Form.Field name="eventMotivation" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Événement / Motivation</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Ex. : Mariage le 7 juillet, semi-marathon le 14 nov, être fier de ton corps...</p>
					<Textarea
					class="meas-input resize-y"
					name="eventMotivation"
					bind:value={$formData.eventMotivation}
					rows={3}
					placeholder="Quel est ton moteur ?"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</Card.Content>
	</Card.Root>
</div>

<style lang="scss">
	.step-content { display: flex; flex-direction: column; gap: 1rem; }
	.step-heading { display: flex; align-items: flex-start; gap: 0.75rem; }
	:global(.step-icon) { width: 1.5rem; height: 1.5rem; color: var(--primary); flex-shrink: 0; margin-top: 0.1rem; }
	.step-title { font-size: 1.25rem; font-weight: 700; margin: 0; line-height: 1.2; }
	.step-desc { font-size: 0.875rem; color: var(--muted-foreground); margin: 0.2rem 0 0; line-height: 1.4; }

	.objectives-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.objective-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: 9999px;
		background: var(--card);
		cursor: pointer;
		font-size: 0.875rem;
		font: inherit;
		color: inherit;
		transition: border-color 0.15s, background 0.15s, color 0.15s;

		&:hover {
			border-color: var(--primary);
			background: var(--accent);
		}
	}

	.input-unit-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-unit-wrap :global(input) {
		padding-right: 2.5rem;
		width: 100%;
	}

	.unit {
		position: absolute;
		right: 0.75rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		pointer-events: none;
	}

	.objective-chip.selected {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);

		:global([data-slot='checkbox']) {
			background: var(--primary-foreground);
			border-color: var(--primary-foreground);
			color: var(--primary);
		}
	}
</style>
