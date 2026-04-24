<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Textarea } from '$shadcn/textarea';
	import { Heart } from 'lucide-svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form, formData }: { form: any; formData: any } = $props();
</script>

<div class="step-content">
	<div class="step-heading">
		<Heart class="step-icon" />
		<div>
			<h2 class="step-title">Santé</h2>
			<p class="step-desc">Ces informations permettent d'adapter la méthode à ta situation physique réelle.</p>
		</div>
	</div>

	<Card.Root class="meas-card">
		<Card.Content class="pt-5 pb-5 space-y-4">
			<Form.Field name="painsPathologies" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Douleurs & pathologies</Form.Label>
					<p class="text-xs text-muted-foreground mb-2 leading-relaxed">
						Réponds à chacune de ces questions :<br />
						• Douleurs physiques particulières ?<br />
						• Pathologies physiques particulières ?<br />
						• Contre-indications à l'activité physique ?<br />
						• Traitement médical en cours ?
					</p>
					<Textarea
					name="painsPathologies"
					bind:value={$formData.painsPathologies}
					rows={6}
					placeholder="Ex. : mal de dos chronique, hypertension, prise de bêtabloquants, pas de contre-indication régime..."
					class="meas-input resize-y"
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
