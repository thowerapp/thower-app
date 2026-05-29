<script lang="ts">
	let {
		currentStep,
		TOTAL_STEPS,
		stepLabels
	}: {
		currentStep: number;
		TOTAL_STEPS: number;
		progress?: number;
		stepLabels: string[];
	} = $props();

	const n = $derived(TOTAL_STEPS);
	const trackStart = $derived(n > 0 ? 50 / n : 0);
	const fillWidth = $derived(
		n > 1 ? Math.max(0, ((currentStep - 1) / (n - 1)) * (100 - 100 / n)) : 0
	);
</script>

<div class="wizard-timeline" aria-label="Progression du formulaire">
	<div class="timeline">
		<div class="timeline-track" style="left: {trackStart}%; right: {trackStart}%;"></div>
		<div class="timeline-fill" style="left: {trackStart}%; width: {fillWidth}%;"></div>
		{#each stepLabels as label, i (label)}
			{@const stepNum = i + 1}
			{@const isDone = stepNum < currentStep}
			{@const isActive = stepNum === currentStep}
			<div class="timeline-step">
				<div class="timeline-dot" class:dot-done={isDone} class:dot-active={isActive}>
					{#if isDone}
						<svg viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
							<polyline points="1.5,6 4.5,9.5 10.5,2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{/if}
				</div>
				<span class="timeline-label" class:label-active={isActive} class:label-done={isDone}>{label}</span>
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.wizard-timeline {
		background: #000;
		border-radius: 0.75rem;
		padding: 0.9rem 1rem 0.6rem;
		margin-bottom: 0;
	}

	.timeline {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding-bottom: 0.2rem;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		z-index: 2;
		gap: 0.3rem;
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

	@media (prefers-reduced-motion: reduce) {
		.timeline-fill { transition: none; }
		.timeline-dot { transition: none; }
	}

	@media (min-width: 640px) {
		:global(.wizard-header-inner) {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}
</style>
