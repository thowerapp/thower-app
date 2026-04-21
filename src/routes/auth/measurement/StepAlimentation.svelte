<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Textarea } from '$shadcn/textarea';
	import { Separator } from '$shadcn/separator';
	import { Checkbox } from '$shadcn/checkbox';
	import { ChefHat } from 'lucide-svelte';
	import { allergenOptions, type AllergenValue } from '$lib/schema/recipe/allergens';
	import { breadTypeOptions, type BreadTypeValue } from '$lib/schema/profile/breadType';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form, formData }: { form: any; formData: any } = $props();

	const kitchenItems = [
		{ value: 'four', label: 'Four' },
		{ value: 'micro-ondes', label: 'Micro-ondes' },
		{ value: 'blender', label: 'Blender' },
		{ value: 'air-fryer', label: 'Air Fryer' },
		{ value: 'balance', label: 'Balance cuisine' },
		{ value: 'plaque', label: 'Plaque de cuisson' }
	];

	function toggleEquipment(value: string) {
		const current = ($formData.kitchenEquipment ?? []) as string[];
		$formData.kitchenEquipment = current.includes(value)
			? current.filter((e: string) => e !== value)
			: [...current, value];
	}

	function toggleAllergen(value: AllergenValue) {
		const current = ($formData.allergens ?? []) as AllergenValue[];
		$formData.allergens = current.includes(value)
			? current.filter((a: AllergenValue) => a !== value)
			: [...current, value];
	}

	function setBreadDaily(value: boolean) {
		$formData.breadDaily = value;
	}
</script>

<div class="step-content">
	<div class="step-heading">
		<ChefHat class="step-icon" />
		<div>
			<h2 class="step-title">Alimentation</h2>
			<p class="step-desc">Pour des recettes réalistes et adaptées à tes goûts et contraintes.</p>
		</div>
	</div>

	<Card.Root class="meas-card">
		<Card.Header class="pb-3">
			<Card.Title class="text-sm font-semibold">Équipement cuisine</Card.Title>
			<Card.Description class="text-xs">De quoi disposes-tu ?</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<div class="equipment-grid">
				{#each kitchenItems as item}
					<button
						type="button"
						class="equipment-chip"
						class:selected={(($formData.kitchenEquipment ?? []) as string[]).includes(item.value)}
						onclick={() => toggleEquipment(item.value)}
						aria-pressed={(($formData.kitchenEquipment ?? []) as string[]).includes(item.value)}
					>
						<Checkbox
							checked={(($formData.kitchenEquipment ?? []) as string[]).includes(item.value)}
							class="pointer-events-none shrink-0"
						/>
						{item.label}
					</button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root class="meas-card mt-4">
		<Card.Content class="pt-5 pb-5 space-y-4">
			<div class="space-y-3">
				<p class="meas-label font-medium">Pain</p>
				<p class="text-xs text-muted-foreground">
					Ces infos servent au calcul des apports (macros pour la quantité et le type choisis, référence pour 100 g).
				</p>
				<div class="space-y-2">
					<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Consommation quotidienne ?</p>
					<div class="equipment-grid">
						<button
							type="button"
							class="equipment-chip"
							class:selected={$formData.breadDaily === true}
							onclick={() => setBreadDaily(true)}
							aria-pressed={$formData.breadDaily === true}
						>
							<Checkbox checked={$formData.breadDaily === true} class="pointer-events-none shrink-0" />
							Oui
						</button>
						<button
							type="button"
							class="equipment-chip"
							class:selected={$formData.breadDaily === false}
							onclick={() => setBreadDaily(false)}
							aria-pressed={$formData.breadDaily === false}
						>
							<Checkbox checked={$formData.breadDaily === false} class="pointer-events-none shrink-0" />
							Non
						</button>
					</div>
				</div>
				<Form.Field name="breadGramsPerDay" {form}>
					<Form.Control>
						<Form.Label class="meas-label font-medium">Quantité moyenne (g / jour)</Form.Label>
						<p class="text-xs text-muted-foreground mb-2">
							Moyenne sur la semaine si ce n’est pas chaque jour (ex. 150 g le dimanche ≈ 21 g/j).
						</p>
						<Input
							class="meas-input"
							type="number"
							min="0"
							step="1"
							name="breadGramsPerDay"
							bind:value={$formData.breadGramsPerDay}
							placeholder="Ex. 60"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="breadType" {form}>
					<Form.Control>
						<Form.Label class="meas-label font-medium">Type de pain</Form.Label>
						<p class="text-xs text-muted-foreground mb-2">Le plus proche de ce que tu consommes habituellement.</p>
						<select
							class="meas-input w-full"
							name="breadType"
							value={($formData.breadType as BreadTypeValue | undefined) ?? ''}
							onchange={(e) => {
								const v = e.currentTarget.value;
								$formData.breadType = v === '' ? undefined : (v as BreadTypeValue);
							}}
						>
							<option value="">— Choisir un type —</option>
							{#each breadTypeOptions as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="breadManagement" {form}>
					<Form.Control>
						<Form.Label class="meas-label font-medium">Précisions (optionnel)</Form.Label>
						<p class="text-xs text-muted-foreground mb-2">Ex. horaires, marque, pain sans gluten…</p>
						<Textarea
							class="meas-input resize-y"
							name="breadManagement"
							bind:value={$formData.breadManagement}
							rows={2}
							placeholder="Ex. : surtout le matin, baguette tradition…"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
			<Separator />
			<div class="space-y-2">
				<p class="meas-label font-medium">Allergènes</p>
				<p class="text-xs text-muted-foreground">Y a-t-il des aliments dont tu es allergique ?</p>
				<div class="allergen-grid">
					{#each allergenOptions as item}
						<button
							type="button"
							class="allergen-chip"
							class:selected={(($formData.allergens ?? []) as AllergenValue[]).includes(item.value)}
							onclick={() => toggleAllergen(item.value)}
							aria-pressed={(($formData.allergens ?? []) as AllergenValue[]).includes(item.value)}
						>
							<Checkbox
								checked={(($formData.allergens ?? []) as AllergenValue[]).includes(item.value)}
								class="pointer-events-none shrink-0"
							/>
							{item.label}
						</button>
					{/each}
				</div>
				<Form.Field name="otherAllergens" {form}>
					<Form.Control>
						<Form.Label class="meas-label font-medium">Autres allergènes</Form.Label>
						<p class="text-xs text-muted-foreground mb-2">Des allergènes non listés ci-dessus ? Précise-les ici.</p>
						<Textarea
							class="meas-input resize-y"
							name="otherAllergens"
							bind:value={$formData.otherAllergens}
							rows={2}
							placeholder="Ex. : kiwi, arachides, latex..."
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
			<Separator />
			<Form.Field name="disgustingFoods" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Aliments dégoutants</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Des aliments que tu ne supportes pas ? (Pour garantir des recettes savoureuses.)</p>
					<Textarea
					class="meas-input resize-y"
					name="disgustingFoods"
					bind:value={$formData.disgustingFoods}
					rows={2}
					placeholder="Ex. : champignons, poisson, chou..."
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

	.equipment-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.equipment-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: 8px;
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

	.equipment-chip.selected {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);

		:global([data-slot='checkbox']) {
			background: var(--primary-foreground);
			border-color: var(--primary-foreground);
			color: var(--primary);
		}
	}

	.allergen-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.allergen-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: 8px;
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

	.allergen-chip.selected {
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
