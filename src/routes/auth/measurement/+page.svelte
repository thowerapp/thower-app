<script lang="ts">
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { toast } from 'svelte-sonner';
	import { measurementSchema } from '$lib/schema/measurement/measurementSchema';
	import type { PageProps } from './$types';
	import { wizardStepIn, wizardStepOut } from '$lib/animation/wizardStepTransition';
	import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-svelte';
	import { page } from '$app/stores';

	import WizardProgressHeader from './WizardProgressHeader.svelte';
	import StepVideoPresentation from './StepVideoPresentation.svelte';
	import StepPhotosReference from './StepPhotosReference.svelte';
	import StepBienvenue from './StepBienvenue.svelte';
	import StepMorphologie from './StepMorphologie.svelte';
	import StepLifestyle from './StepLifestyle.svelte';
	import StepSante from './StepSante.svelte';
	import StepObjectifs from './StepObjectifs.svelte';
	import StepAlimentation from './StepAlimentation.svelte';
	import StepSportContexte from './StepSportContexte.svelte';
	import MeasurementHistoryView from './MeasurementHistoryView.svelte';

	let { data }: PageProps = $props();

	// Detect if this is a new wizard flow from onboarding (not returning user)
	const isNewWizardFlow = $derived($page.url.searchParams.get('new') === '1');

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

	const INTRO_VIDEO_UID = '';
	const introVideoEmbedUrl = $derived(
		INTRO_VIDEO_UID ? `https://iframe.cloudflarestream.com/${INTRO_VIDEO_UID}` : null
	);
	const TOTAL_STEPS = 9;
	let currentStep = $state(1);
	let stepDir = $state<1 | -1>(1);
	const progress = $derived(((currentStep - 1) / (TOTAL_STEPS - 1)) * 100);

	function next() {
		if (currentStep === 4) {
			const d = $measurementData;
			if (
				!d.age ||
				!d.heightCm ||
				!d.weightKg ||
				!d.waistCm ||
				!d.chestCm ||
				!d.armCm ||
				!d.bodyFatPercent
			) {
				toast.error('Merci de remplir toutes les mensurations obligatoires avant de continuer.');
				return;
			}
		}
		if (currentStep < TOTAL_STEPS) {
			stepDir = 1;
			currentStep++;
		}
	}

	function prev() {
		if (currentStep > 1) {
			stepDir = -1;
			currentStep--;
		}
	}

	const stepLabels = [
		'Présentation',
		'Photos',
		'Bienvenue',
		'Morphologie',
		'Lifestyle',
		'Santé',
		'Objectifs',
		'Alimentation',
		'Sport'
	];

	let activeTab = $state<'wizard' | 'history'>('wizard');
</script>

<div class="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
	{#if activeTab === 'wizard' && currentStep === 1}
		<div class="mb-6 sm:mb-8">
			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold font-['DM_Sans'] text-yellow-500 mb-2 tracking-wide">
				Mon Profil Physique
			</h1>
			<p class="text-sm sm:text-base font-['Public_Sans'] font-light text-white/50 leading-relaxed">
				Renseignez vos informations pour débloquer le paiement et l'accès complet à l'application.
			</p>
		</div>
	{/if}

	<div class="flex gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
		{#if !isNewWizardFlow}
			<button
				type="button"
				onclick={() => (activeTab = 'wizard')}
				class={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-['DM_Sans'] text-xs sm:text-sm font-medium tracking-widest uppercase transition-all duration-200 border ${
					activeTab === 'wizard'
						? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
						: 'bg-white/5 text-white/50 border-white/10'
				}`}
			>
				Création
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'history')}
				class={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-['DM_Sans'] text-xs sm:text-sm font-medium tracking-widest uppercase transition-all duration-200 relative border ${
					activeTab === 'history'
						? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
						: 'bg-white/5 text-white/50 border-white/10'
				}`}
			>
				<span>Historique</span>
				{#if data.bodyMeasurements.length > 0}
					<span class="absolute -top-2 -right-2 w-5 h-5 bg-cyan-400 text-black text-xs font-bold rounded-full flex items-center justify-center">
						{data.bodyMeasurements.length}
					</span>
				{/if}
			</button>
		{/if}
	</div>

	{#if activeTab === 'wizard'}
		<form method="POST" action="?/save" use:measurementEnhance class="space-y-4 sm:space-y-6">
			<div class="overflow-hidden rounded-lg bg-black">
				{#key currentStep}
					<div in:wizardStepIn={{ stepDir }} out:wizardStepOut={{ stepDir }} class="p-4 sm:p-6">
						{#if currentStep === 1}
							<StepVideoPresentation videoUrl={introVideoEmbedUrl ?? ''} onnext={next} />
						{:else if currentStep === 2}
							<StepPhotosReference formData={measurementData} onnext={next} />
						{:else if currentStep === 3}
							<StepBienvenue
								bodyMeasurements={data.bodyMeasurements}
								{stepLabels}
								onnext={next}
							/>
						{:else if currentStep === 4}
							<StepMorphologie form={measurementForm} formData={measurementData} />
						{:else if currentStep === 5}
							<StepLifestyle form={measurementForm} formData={measurementData} />
						{:else if currentStep === 6}
							<StepSante form={measurementForm} formData={measurementData} />
						{:else if currentStep === 7}
							<StepObjectifs form={measurementForm} formData={measurementData} />
						{:else if currentStep === 8}
							<StepAlimentation form={measurementForm} formData={measurementData} />
						{:else if currentStep === 9}
							<StepSportContexte form={measurementForm} formData={measurementData} />
						{/if}
					</div>
				{/key}
			</div>

			<WizardProgressHeader {currentStep} {TOTAL_STEPS} {stepLabels} />

			<div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-between sm:items-center mt-4 sm:mt-6">
				{#if currentStep > 1}
					<Button
						type="button"
						variant="outline"
						onclick={prev}
						class="w-full sm:w-auto gap-2 font-['DM_Sans'] font-medium btn-prev"
					>
						<ArrowLeft class="h-4 w-4" />
						<span class="hidden sm:inline">Précédent</span>
						<span class="sm:hidden">Retour</span>
					</Button>
				{:else}
					<div class="hidden sm:block"></div>
				{/if}

				{#if currentStep < TOTAL_STEPS && currentStep > 3}
					<Button
						type="button"
						onclick={next}
						class="w-full sm:w-auto gap-2 font-['DM_Sans'] font-medium bg-cyan-400 hover:bg-cyan-500 text-black"
					>
						<span class="hidden sm:inline">Suivant</span>
						<span class="sm:hidden">Continuer</span>
						<ArrowRight class="h-4 w-4" />
					</Button>
				{:else if currentStep === TOTAL_STEPS}
					<Button
						type="submit"
						class="w-full sm:w-auto gap-2 font-['DM_Sans'] font-bold bg-yellow-500 hover:bg-yellow-600 text-black uppercase tracking-widest"
					>
						<CheckCircle2 class="h-4 w-4" />
						<span>Enregistrer</span>
					</Button>
				{/if}
			</div>
		</form>
	{:else}
		<MeasurementHistoryView
			bodyMeasurements={data.bodyMeasurements}
			onswitch={() => {
				activeTab = 'wizard';
			}}
		/>
	{/if}
</div>

<style lang="postcss">
	:global(h1, h2, h3) {
		font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: #f0ede8;
	}

	:global(h2, h3) {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1.5rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	:global(p, label, span, body) {
		font-family: 'Public Sans', system-ui, -apple-system, sans-serif;
		font-weight: 400;
		line-height: 1.6;
		color: #f0ede8;
	}

	:global(label, .form-label) {
		font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #c9a84c;
		background: transparent;
		border: none;
	}

	:global(.detail, .info-text, .text-detail) {
		color: #3ab8b8;
		font-weight: 500;
	}

	:global(svg) {
		color: #3ab8b8;
	}

	:global([data-state='outline']) {
		background: #0a0a0a;
		border: 1px solid #c9a84c;
		color: #c9a84c;
	}

	:global([data-state='outline']:hover) {
		background: rgba(201, 168, 76, 0.1);
		border-color: #c9a84c;
	}

	:global(.step-icon) {
		color: #3ab8b8 !important;
	}

	:global(.step-desc) {
		color: #3ab8b8 !important;
	}

	:global(input[type='text'],
	input[type='email'],
	input[type='password'],
	input[type='number'],
	textarea,
	select) {
		background: #0a0a0a;
		border: 1px solid rgba(240, 237, 232, 0.15);
		color: #f0ede8;
		font-family: 'Public Sans', system-ui, -apple-system, sans-serif;
		font-size: 0.9375rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
	}

	:global(input[type='text']:focus,
	input[type='email']:focus,
	input[type='password']:focus,
	input[type='number']:focus,
	textarea:focus,
	select:focus) {
		outline: none;
		border-color: #3ab8b8;
		background: #0a0a0a;
		box-shadow: 0 0 0 3px rgba(58, 184, 184, 0.15);
	}

	@media (max-width: 640px) {
		:global(h1) {
			font-size: 1.5rem;
		}
		:global(h2) {
			font-size: 1.25rem;
		}
		:global(p) {
			font-size: 0.9375rem;
		}
	}

	@media (min-width: 768px) {
		:global(h1) {
			font-size: 2rem;
		}
		:global(h2) {
			font-size: 1.5rem;
		}
	}

	/* Measurement form styling with meas-* classes */
	:global(.meas-card) {
		background: #0a0a0a;
		border: 1px solid rgba(240, 237, 232, 0.1);
	}

	:global(.meas-label) {
		color: #c9a84c !important;
		background: transparent !important;
		border: none !important;
		font-family: 'DM Sans', system-ui, -apple-system, sans-serif !important;
		font-size: 0.8rem !important;
		font-weight: 500 !important;
		letter-spacing: 0.12em !important;
		text-transform: uppercase !important;
	}

	:global(.meas-input) {
		background: #0a0a0a !important;
		border: 1px solid rgba(240, 237, 232, 0.15) !important;
		border-radius: 0.5rem !important;
		color: #f0ede8 !important;
		padding: 0.75rem 1rem !important;
		transition: all 0.2s ease !important;
		font-family: 'Public Sans', system-ui, -apple-system, sans-serif !important;
		font-size: 0.9375rem !important;
	}

	:global(.meas-input:focus) {
		border-color: #3ab8b8 !important;
		box-shadow: 0 0 0 3px rgba(58, 184, 184, 0.15) !important;
	}

	:global(.meas-btn-primary) {
		background: #3ab8b8 !important;
		color: #0a0a0a !important;
		border: none !important;
		font-family: 'DM Sans', system-ui, -apple-system, sans-serif !important;
		font-weight: 600 !important;
	}

	:global(.meas-btn-primary:hover) {
		background: #2a9a9a !important;
	}

	:global(.meas-btn-primary svg) {
		color: #0a0a0a !important;
	}

	:global(.meas-btn-secondary) {
		background: #0a0a0a !important;
		border: 1px solid #c9a84c !important;
		color: #c9a84c !important;
		font-family: 'DM Sans', system-ui, -apple-system, sans-serif !important;
		font-weight: 500 !important;
	}

	:global(.meas-btn-secondary:hover) {
		background: rgba(201, 168, 76, 0.1) !important;
	}

	:global(.meas-btn-secondary svg) {
		color: #c9a84c !important;
	}

	/* Checkboxes : fond noir, bordure cyan */
	:global([data-slot='checkbox']) {
		background: #000 !important;
		border-color: #3ab8b8 !important;
		border-radius: 4px !important;
	}
	:global([data-slot='checkbox'][data-state='checked']) {
		background: #3ab8b8 !important;
		border-color: #3ab8b8 !important;
		color: #000 !important;
	}

	/* Chips : fond noir, bordure cyan sombre, label cyan */
	:global(.objective-chip),
	:global(.equipment-chip),
	:global(.allergen-chip) {
		background: #000 !important;
		border-color: #1a3a3a !important;
		color: #3ab8b8 !important;
	}
	:global(.objective-chip:hover),
	:global(.equipment-chip:hover),
	:global(.allergen-chip:hover) {
		border-color: #3ab8b8 !important;
		background: rgba(58, 184, 184, 0.08) !important;
	}
	:global(.objective-chip.selected),
	:global(.equipment-chip.selected),
	:global(.allergen-chip.selected) {
		background: rgba(58, 184, 184, 0.15) !important;
		border-color: #3ab8b8 !important;
		color: #3ab8b8 !important;
	}

	:global(.btn-prev) {
		background: #0a0a0a !important;
		border: 1px solid #c9a84c !important;
		color: #c9a84c !important;
	}

	:global(.btn-prev:hover) {
		background: rgba(201, 168, 76, 0.1) !important;
	}

	:global(.btn-prev svg) {
		color: #c9a84c !important;
	}
</style>
