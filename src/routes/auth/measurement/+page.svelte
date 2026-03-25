<script lang="ts">
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { toast } from 'svelte-sonner';
	import { measurementSchema } from '$lib/schema/measurement/measurementSchema';
	import type { PageProps } from './$types';
	import { wizardStepIn, wizardStepOut } from '$lib/animation/wizardStepTransition';
	import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-svelte';

	import WizardProgressHeader from './WizardProgressHeader.svelte';
	import StepBienvenue from './StepBienvenue.svelte';
	import StepMorphologie from './StepMorphologie.svelte';
	import StepLifestyle from './StepLifestyle.svelte';
	import StepSante from './StepSante.svelte';
	import StepObjectifs from './StepObjectifs.svelte';
	import StepAlimentation from './StepAlimentation.svelte';
	import StepSportContexte from './StepSportContexte.svelte';
	import StepBienEtre from './StepBienEtre.svelte';
	import MeasurementHistoryView from './MeasurementHistoryView.svelte';

	let { data }: PageProps = $props();

	// ── Formulaire ────────────────────────────────────────────
	const formOptions = {
		validators: zodClient(measurementSchema),
		id: 'measurementForm',
		dataType: 'json' as const
	};

	const measurementForm = $derived.by(() => superForm(data.measurementForm, formOptions));
	const {
		form: measurementData,
		enhance: measurementEnhance,
		message: measurementMessage
	} = $derived(measurementForm);

	$effect(() => {
		if ($measurementMessage) toast.success($measurementMessage);
	});

	// ── Navigation wizard ─────────────────────────────────────
	const TOTAL_STEPS = 8;
	let currentStep = $state(1);
	let stepDir = $state<1 | -1>(1);
	const progress = $derived(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);

	function next() { if (currentStep < TOTAL_STEPS) { stepDir = 1; currentStep++; } }
	function prev() { if (currentStep > 1) { stepDir = -1; currentStep--; } }

	const stepLabels = [
		'Bienvenue', 'Morphologie', 'Lifestyle', 'Santé',
		'Objectifs', 'Alimentation', 'Sport', 'Bien-être'
	];

	// ── Onglets ───────────────────────────────────────────────
	let activeTab = $state<'wizard' | 'history'>('wizard');
</script>

<div class="wizard-page">

	<!-- ── Onglets Formulaire / Historique ───────────── -->
	<div class="page-tab-bar" role="tablist">
		<button
			role="tab"
			type="button"
			class="page-tab"
			class:page-tab-active={activeTab === 'wizard'}
			onclick={() => { activeTab = 'wizard'; }}
			aria-selected={activeTab === 'wizard'}
		>
			Formulaire
		</button>
		<button
			role="tab"
			type="button"
			class="page-tab"
			class:page-tab-active={activeTab === 'history'}
			onclick={() => { activeTab = 'history'; }}
			aria-selected={activeTab === 'history'}
		>
			Historique
			{#if data.bodyMeasurements.length > 0}
				<span class="tab-count">{data.bodyMeasurements.length}</span>
			{/if}
		</button>
	</div>

	{#if activeTab === 'wizard'}

		{#if currentStep > 1}
			<WizardProgressHeader {currentStep} {TOTAL_STEPS} {progress} {stepLabels} />
		{/if}

		<form method="POST" action="?/save" use:measurementEnhance class="wizard-form">
			<div class="step-viewport">
				{#key currentStep}
					<div in:wizardStepIn={{ stepDir }} out:wizardStepOut={{ stepDir }} class="step-frame">
						{#if currentStep === 1}
							<StepBienvenue
								bodyMeasurements={data.bodyMeasurements}
								{stepLabels}
								onnext={next}
							/>
						{:else if currentStep === 2}
							<StepMorphologie form={measurementForm} formData={measurementData} />
						{:else if currentStep === 3}
							<StepLifestyle form={measurementForm} formData={measurementData} />
						{:else if currentStep === 4}
							<StepSante form={measurementForm} formData={measurementData} />
						{:else if currentStep === 5}
							<StepObjectifs form={measurementForm} formData={measurementData} />
						{:else if currentStep === 6}
							<StepAlimentation form={measurementForm} formData={measurementData} />
						{:else if currentStep === 7}
							<StepSportContexte form={measurementForm} formData={measurementData} />
						{:else if currentStep === 8}
							<StepBienEtre
								form={measurementForm}
								formData={measurementData}
								initialData={data.measurementForm.data as Record<string, unknown>}
							/>
						{/if}
					</div>
				{/key}
			</div>

			<div class="wizard-nav">
				{#if currentStep > 1}
					<Button type="button" variant="outline" onclick={prev} class="nav-btn gap-2">
						<ArrowLeft class="h-4 w-4" />
						Précédent
					</Button>
				{:else}
					<div></div>
				{/if}

				{#if currentStep < TOTAL_STEPS}
					<Button type="button" onclick={next} class="nav-btn gap-2">
						Suivant
						<ArrowRight class="h-4 w-4" />
					</Button>
				{:else}
					<Button type="submit" class="nav-btn gap-2 font-semibold">
						<CheckCircle2 class="h-4 w-4" />
						Enregistrer mon profil
					</Button>
				{/if}
			</div>
		</form>

	{:else}

		<MeasurementHistoryView
			bodyMeasurements={data.bodyMeasurements}
			onswitch={() => { activeTab = 'wizard'; }}
		/>

	{/if}

</div>

<style lang="scss">
	.wizard-page {
		max-width: 560px;
		margin: 0 auto;
		padding: 1.5rem 1rem 7rem;
	}

	/* ── Onglets page ─────────────────────────── */
	.page-tab-bar {
		display: flex;
		gap: 0;
		background: var(--muted);
		border-radius: 10px;
		padding: 3px;
		margin-bottom: 1.5rem;
	}

	.page-tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		border: none;
		background: transparent;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		color: var(--muted-foreground);
		transition: background 0.18s, color 0.18s, box-shadow 0.18s;

		&:hover:not(.page-tab-active) { color: var(--foreground); }
	}

	.page-tab-active {
		background: var(--background);
		color: var(--foreground);
		box-shadow: 0 1px 4px color-mix(in oklch, var(--foreground) 10%, transparent);
	}

	.tab-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.3rem;
		border-radius: 9999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.7rem;
		font-weight: 700;
		line-height: 1;
	}

	/* ── Wizard form ──────────────────────────── */
	.wizard-form {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.step-viewport {
		overflow: clip;
		position: relative;
		contain: layout style;
	}

	.step-frame {
		transform: translateZ(0);
		backface-visibility: hidden;
		will-change: transform, opacity;
	}

	/* ── Navigation ───────────────────────────── */
	.wizard-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1.5rem;
		gap: 1rem;
	}

	:global(.nav-btn) {
		min-width: 130px;
	}

	@media (min-width: 640px) {
		.wizard-page {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}
</style>
