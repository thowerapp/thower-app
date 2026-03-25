<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Textarea } from '$shadcn/textarea';
	import { Separator } from '$shadcn/separator';
	import { Label } from '$shadcn/label';
	import { Checkbox } from '$shadcn/checkbox';
	import { ChefHat } from 'lucide-svelte';

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

	let allergensText = $state(
		(($formData.allergens as string[]) ?? []).join(', ')
	);

	$effect(() => {
		$formData.allergens = allergensText
			.split(',')
			.map((s: string) => s.trim())
			.filter(Boolean);
	});

	function toggleEquipment(value: string) {
		const current = ($formData.kitchenEquipment ?? []) as string[];
		$formData.kitchenEquipment = current.includes(value)
			? current.filter((e: string) => e !== value)
			: [...current, value];
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

	<Card.Root>
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

	<Card.Root class="mt-4">
		<Card.Content class="pt-5 pb-5 space-y-4">
			<div class="space-y-2">
				<Label class="font-medium">Allergènes</Label>
				<p class="text-xs text-muted-foreground">Y a-t-il des aliments dont tu es allergique ?</p>
				<Input
					type="text"
					placeholder="Ex. : gluten, lactose, fruits à coque..."
					bind:value={allergensText}
				/>
			</div>
			<Separator />
			<Form.Field name="disgustingFoods" {form}>
				<Form.Control>
					<Form.Label class="font-medium">Aliments dégoutants</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Des aliments que tu ne supportes pas ? (Pour garantir des recettes savoureuses.)</p>
					<Textarea
						name="disgustingFoods"
						bind:value={$formData.disgustingFoods}
						rows={2}
						placeholder="Ex. : champignons, poisson, chou..."
						class="resize-y"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Separator />
			<Form.Field name="breadManagement" {form}>
				<Form.Control>
					<Form.Label class="font-medium">Habitudes avec le pain</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Est-ce que tu consommes du pain quotidiennement et dans quelles quantités ?</p>
					<Textarea
						name="breadManagement"
						bind:value={$formData.breadManagement}
						rows={2}
						placeholder="Ex. : 2 tranches le matin, baguette entière à midi..."
						class="resize-y"
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
</style>
