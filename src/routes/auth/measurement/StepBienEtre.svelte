<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Textarea } from '$shadcn/textarea';
	import { Separator } from '$shadcn/separator';
	import { Slider } from '$shadcn/slider';
	import { Activity } from 'lucide-svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form, formData, initialData }: { form: any; formData: any; initialData: Record<string, unknown> } = $props();

	const sliderMeta = [
		{ question: 'Quel est ton niveau de stress actuel ?', low: 'Zen total', high: 'Surchargé' },
		{ question: 'Quelle est ta qualité de sommeil actuelle ?', low: 'Catastrophique', high: 'Parfait' },
		{ question: 'Comment tu te sens dans ton corps actuellement ?', low: 'Très mal', high: 'Très bien' },
		{ question: 'Comment tu notes ta digestion ?', low: 'Problèmes constants', high: 'Parfaite' },
		{ question: 'Tu estimes ton niveau de bonheur actuel à combien ?', low: 'Malheureux', high: 'Épanoui' },
		{ question: 'Sur une échelle de 1 à 10, à quel point es-tu prêt à changer ta vie ?', low: 'Pas du tout', high: 'Complètement' }
	];

	let sliderStress = $state(5);
	let sliderSleep = $state(5);
	let sliderBody = $state(5);
	let sliderDigestion = $state(5);
	let sliderHappiness = $state(5);
	let sliderReadiness = $state(5);

	$effect.pre(() => {
		sliderStress = Number(initialData.stressLevel) || 5;
		sliderSleep = Number(initialData.sleepQuality) || 5;
		sliderBody = Number(initialData.bodyConfidence) || 5;
		sliderDigestion = Number(initialData.digestionQuality) || 5;
		sliderHappiness = Number(initialData.happinessLevel) || 5;
		sliderReadiness = Number(initialData.readinessToChange) || 5;
	});

	$effect(() => { $formData.stressLevel = sliderStress; });
	$effect(() => { $formData.sleepQuality = sliderSleep; });
	$effect(() => { $formData.bodyConfidence = sliderBody; });
	$effect(() => { $formData.digestionQuality = sliderDigestion; });
	$effect(() => { $formData.happinessLevel = sliderHappiness; });
	$effect(() => { $formData.readinessToChange = sliderReadiness; });

	const sliderValues = $derived([sliderStress, sliderSleep, sliderBody, sliderDigestion, sliderHappiness, sliderReadiness]);
</script>

<div class="step-content">
	<div class="step-heading">
		<Activity class="step-icon" />
		<div>
			<h2 class="step-title">Bien-être & Addictions</h2>
			<p class="step-desc">Un snapshot honnête de où tu en es aujourd'hui.</p>
		</div>
	</div>

	<Card.Root class="meas-card">
		<Card.Content class="pt-5 pb-5 space-y-6">
			{#each sliderMeta as meta, i}
				{#if i > 0}<Separator />{/if}
				<div class="slider-block">
					<div class="flex items-start justify-between gap-3 mb-3">
						<p class="text-sm font-medium leading-tight">{meta.question}</p>
						<span class="slider-value shrink-0">
							{sliderValues[i]}<span class="slider-value-max">/10</span>
						</span>
					</div>
					{#if i === 0}
						<Slider type="single" bind:value={sliderStress} min={1} max={10} step={1} class="w-full" />
					{:else if i === 1}
						<Slider type="single" bind:value={sliderSleep} min={1} max={10} step={1} class="w-full" />
					{:else if i === 2}
						<Slider type="single" bind:value={sliderBody} min={1} max={10} step={1} class="w-full" />
					{:else if i === 3}
						<Slider type="single" bind:value={sliderDigestion} min={1} max={10} step={1} class="w-full" />
					{:else if i === 4}
						<Slider type="single" bind:value={sliderHappiness} min={1} max={10} step={1} class="w-full" />
					{:else}
						<Slider type="single" bind:value={sliderReadiness} min={1} max={10} step={1} class="w-full" />
					{/if}
					<div class="flex justify-between mt-1.5 text-xs text-muted-foreground">
						<span>{meta.low}</span>
						<span>{meta.high}</span>
					</div>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	<Card.Root class="meas-card mt-4">
		<Card.Content class="pt-5 pb-5">
			<Form.Field name="addictionsText" {form}>
				<Form.Control>
				<Form.Label class="meas-label font-medium">Addictions & substances</Form.Label>
					<p class="text-xs text-muted-foreground mb-2">Consommation d'alcool, tabac ou autres substances ? Si oui, lesquelles et à quelle fréquence ?</p>
					<Textarea
					class="meas-input resize-y"
					name="addictionsText"
					bind:value={$formData.addictionsText}
					rows={3}
					placeholder="Ex. : 1-2 verres de vin le soir, cigarette occasionnelle le week-end..."
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

	.slider-block {
		display: flex;
		flex-direction: column;
	}

	.slider-value {
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--primary);
		line-height: 1;
		white-space: nowrap;
	}

	.slider-value-max {
		font-size: 0.875rem;
		font-weight: 400;
		color: var(--muted-foreground);
	}
</style>
