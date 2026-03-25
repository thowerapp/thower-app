<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Ruler } from 'lucide-svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form, formData }: { form: any; formData: any } = $props();
</script>

<div class="step-content">
	<div class="step-heading">
		<Ruler class="step-icon" />
		<div>
			<h2 class="step-title">Morphologie</h2>
			<p class="step-desc">Âge, taille, poids et tours. Ces données alimentent les calculs de la méthode.</p>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="pt-5 pb-5">
			<div class="measures-grid">
				<Form.Field name="age" {form}>
					<Form.Control>
						<Form.Label>Âge</Form.Label>
						<div class="input-unit-wrap">
							<Input type="number" name="age" bind:value={$formData.age} min={10} max={120} placeholder="25" />
							<span class="unit">ans</span>
						</div>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="heightCm" {form}>
					<Form.Control>
						<Form.Label>Taille</Form.Label>
						<div class="input-unit-wrap">
							<Input type="number" name="heightCm" bind:value={$formData.heightCm} min={100} max={250} placeholder="175" step="0.1" />
							<span class="unit">cm</span>
						</div>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="weightKg" {form}>
					<Form.Control>
						<Form.Label>Poids</Form.Label>
						<div class="input-unit-wrap">
							<Input type="number" name="weightKg" bind:value={$formData.weightKg} min={30} max={300} placeholder="70" step="0.1" />
							<span class="unit">kg</span>
						</div>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="waistCm" {form}>
					<Form.Control>
						<Form.Label>Tour de taille</Form.Label>
						<div class="input-unit-wrap">
							<Input type="number" name="waistCm" bind:value={$formData.waistCm} min={50} max={200} placeholder="80" step="0.1" />
							<span class="unit">cm</span>
						</div>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="chestCm" {form}>
					<Form.Control>
						<Form.Label>Tour de torse</Form.Label>
						<div class="input-unit-wrap">
							<Input type="number" name="chestCm" bind:value={$formData.chestCm} min={50} max={200} placeholder="100" step="0.1" />
							<span class="unit">cm</span>
						</div>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="armCm" {form}>
					<Form.Control>
						<Form.Label>Tour de bras</Form.Label>
						<div class="input-unit-wrap">
							<Input type="number" name="armCm" bind:value={$formData.armCm} min={15} max={80} placeholder="32" step="0.1" />
							<span class="unit">cm</span>
						</div>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<style lang="scss">
	.step-content { display: flex; flex-direction: column; gap: 1rem; }
	.step-heading { display: flex; align-items: flex-start; gap: 0.75rem; }
	:global(.step-icon) { width: 1.5rem; height: 1.5rem; color: var(--primary); flex-shrink: 0; margin-top: 0.1rem; }
	.step-title { font-size: 1.25rem; font-weight: 700; margin: 0; line-height: 1.2; }
	.step-desc { font-size: 0.875rem; color: var(--muted-foreground); margin: 0.2rem 0 0; line-height: 1.4; }

	.measures-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.25rem;
	}

	@media (min-width: 640px) {
		.measures-grid {
			grid-template-columns: repeat(3, 1fr);
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
</style>
