<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Textarea } from '$shadcn/textarea';
	import { Separator } from '$shadcn/separator';
	import { Dumbbell } from 'lucide-svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form, formData }: { form: any; formData: any } = $props();
</script>

<div class="step-content">
	<div class="step-heading">
		<Dumbbell class="step-icon" />
		<div>
			<h2 class="step-title">Sport & Contexte</h2>
			<p class="step-desc">Tout ce qui peut influencer la méthode au quotidien.</p>
		</div>
	</div>

	<Card.Root class="meas-card">
		<Card.Content class="pt-5 pb-5 space-y-4">
			<Form.Field name="sportActivity" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Activités sportives annexes</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">En dehors de la MT — foot le mardi, VTT le dimanche, course 10 km prévue le 12 jan, paddle 1x/sem...</p>
					<Textarea
					class="meas-input resize-y"
					name="sportActivity"
					bind:value={$formData.sportActivity}
					rows={4}
					placeholder="Décris tes activités sportives régulières ou ponctuelles..."
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Separator />
			<Form.Field name="contextParticular" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Contraintes & contexte particulier</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Tout ce qui peut influencer la méthode : travail de nuit, déplacements la semaine, resto tous les vendredis midi...</p>
					<Textarea
					class="meas-input resize-y"
					name="contextParticular"
					bind:value={$formData.contextParticular}
					rows={4}
					placeholder="Décris ton contexte de vie particulier..."
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
</style>
