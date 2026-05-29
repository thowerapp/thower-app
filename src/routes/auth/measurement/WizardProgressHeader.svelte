<script lang="ts">
	let {
		currentStep,
		TOTAL_STEPS,
		stepLabels,
		onstepselect
	}: {
		currentStep: number;
		TOTAL_STEPS: number;
		progress?: number;
		stepLabels: string[];
		onstepselect?: (step: number) => void;
	} = $props();

	const n = $derived(TOTAL_STEPS);
	const currentLabel = $derived(stepLabels[currentStep - 1] ?? '');
	const trackStart = $derived(n > 0 ? 50 / n : 0);
	const fillWidth = $derived(
		n > 1 ? Math.max(0, ((currentStep - 1) / (n - 1)) * (100 - 100 / n)) : 0
	);
</script>

<div class="wizard-timeline" aria-label="Progression du formulaire">
	<div class="timeline">
		<div class="timeline-track" style="left: {trackStart}%; right: {trackStart}%;"></div>
		<div class="timeline-fill" style="left: {trackStart}%; width: {fillWidth}%;"></div>
		{#each stepLabels as label, i (i)}
			{@const stepNum = i + 1}
			{@const isDone = stepNum < currentStep}
			{@const isActive = stepNum === currentStep}
			<button
				type="button"
				class="timeline-step"
				aria-current={isActive ? 'step' : undefined}
				aria-label={`Aller à l'étape ${stepNum}: ${label}`}
				onclick={() => onstepselect?.(stepNum)}
			>
				<div class="timeline-dot" class:dot-done={isDone} class:dot-active={isActive}>
					{#if isDone}
						<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
							<polyline points="1.5,6 4.5,9.5 10.5,2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{/if}
				</div>
				<span class="timeline-label" class:label-active={isActive} class:label-done={isDone}>{label}</span>
			</button>
		{/each}
	</div>
	<div class="current-step-pill" aria-live="polite">
		<span class="current-step-index">Étape {currentStep}/{TOTAL_STEPS}</span>
		<span class="current-step-separator" aria-hidden="true">·</span>
		<span class="current-step-label">{currentLabel}</span>
	</div>
</div>

<style lang="scss">
	.wizard-timeline {
		background: #000;
		border-radius: 0.75rem;
		padding: 0.85rem 0.75rem 0.75rem;
		margin-bottom: 0;
		overflow: hidden;
	}

	.timeline {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding-bottom: 0.2rem;
		min-width: 0;
	}

	.timeline-track,
	.timeline-fill {
		position: absolute;
		top: 0.625rem;
		height: 2px;
		pointer-events: none;
	}

	.timeline-track {
		background: #1a2a2a;
		z-index: 0;
	}

	.timeline-fill {
		background: #3ab8b8;
		z-index: 1;
		transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.timeline-step {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		z-index: 2;
		gap: 0.3rem;
		appearance: none;
		background: transparent;
		border: 0;
		color: inherit;
		cursor: pointer;
		font: inherit;
		padding: 0;
		text-align: center;
	}

	.timeline-step:focus-visible {
		outline: 2px solid #c9a84c;
		outline-offset: 0.2rem;
		border-radius: 0.75rem;
	}

	.timeline-dot {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		border: 2px solid #1a3a3a;
		background: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
	}

	.timeline-dot.dot-done {
		border-color: #3ab8b8;
		background: #3ab8b8;
		color: #000;
	}

	.timeline-dot.dot-active {
		border-color: #3ab8b8;
		background: rgba(58, 184, 184, 0.12);
		box-shadow: 0 0 0 3px rgba(58, 184, 184, 0.22);
	}

	.timeline-label {
		font-size: 0.5rem;
		color: #2a5a5a;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 2.8rem;
		line-height: 1.2;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		transition: color 0.2s;
	}

	.timeline-label.label-active {
		color: #3ab8b8;
		font-weight: 700;
	}

	.timeline-label.label-done {
		color: #3ab8b8;
		opacity: 0.6;
	}

	.current-step-pill {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		width: fit-content;
		max-width: 100%;
		margin: 0.55rem auto 0;
		padding: 0.3rem 0.65rem;
		border: 1px solid rgba(58, 184, 184, 0.28);
		border-radius: 999px;
		background: rgba(58, 184, 184, 0.08);
		color: #bdeeee;
		font-size: 0.72rem;
		line-height: 1.2;
		letter-spacing: 0.02em;
	}

	.current-step-index {
		flex-shrink: 0;
		color: #3ab8b8;
		font-weight: 700;
	}

	.current-step-separator {
		color: #3ab8b8;
		opacity: 0.75;
	}

	.current-step-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.timeline-fill { transition: none; }
		.timeline-dot { transition: none; }
	}

	@media (max-width: 639px) {
		.timeline-label {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
		}
	}

	@media (min-width: 640px) {
		:global(.wizard-header-inner) {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}

		.wizard-timeline {
			padding: 0.9rem 1rem 0.6rem;
			overflow: visible;
		}

		.timeline-step:focus-visible {
			outline-offset: 0.35rem;
		}

		.current-step-pill {
			display: none;
		}
	}
</style>
