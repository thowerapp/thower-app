<script lang="ts">
	import { Badge } from '$shadcn/badge';
	import { Progress } from '$shadcn/progress';
	import { browser } from '$app/environment';

	let {
		currentStep,
		TOTAL_STEPS,
		progress,
		stepLabels
	}: {
		currentStep: number;
		TOTAL_STEPS: number;
		progress: number;
		stepLabels: string[];
	} = $props();

	function portal(node: HTMLElement) {
		if (!browser) return {};
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}
</script>

<div class="wizard-header-spacer" aria-hidden="true"></div>
<header use:portal class="wizard-header-fixed" aria-label="Progression du formulaire">
	<div class="wizard-header-inner">
		<div class="step-meta">
			<span class="step-label">{stepLabels[currentStep - 1]}</span>
			<Badge variant="secondary" class="step-badge">
				{currentStep - 1} / {TOTAL_STEPS - 1}
			</Badge>
		</div>
		<Progress value={progress} class="h-2 mt-2" />
		<div class="step-dots" aria-hidden="true">
			{#each Array.from({ length: TOTAL_STEPS - 1 }, (_, i) => i + 2) as step}
				<span
					class="step-dot-shell"
					class:step-dot-shell-active={step === currentStep}
					class:step-dot-shell-done={step < currentStep}
				>
					{#if step === currentStep}
						<span class="step-dot-pill" aria-hidden="true"></span>
					{/if}
					<span class="step-dot-core"></span>
				</span>
			{/each}
		</div>
	</div>
</header>

<style lang="scss">
	.wizard-header-spacer {
		height: calc(5.35rem + env(safe-area-inset-top, 0px));
		margin-bottom: 1rem;
		flex-shrink: 0;
	}

	:global(.wizard-header-fixed) {
		position: fixed !important;
		top: 0;
		left: 0;
		right: 0;
		z-index: 9980;
		padding-top: env(safe-area-inset-top, 0px);
		padding-bottom: 0.65rem;
		background: color-mix(in oklch, var(--background) 88%, transparent);
		backdrop-filter: blur(14px) saturate(1.25);
		-webkit-backdrop-filter: blur(14px) saturate(1.25);
		border-bottom: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
		box-shadow: 0 4px 20px color-mix(in oklch, var(--foreground) 5%, transparent);
	}

	:global(.wizard-header-inner) {
		max-width: 560px;
		margin: 0 auto;
		padding: 0.5rem 1rem 0;
	}

	.step-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.step-label {
		font-size: 0.9rem;
		font-weight: 600;
	}

	:global(.step-badge) {
		font-size: 0.75rem;
	}

	.step-dots {
		display: flex;
		gap: 0.35rem;
		margin-top: 0.75rem;
		justify-content: center;
		align-items: center;
	}

	.step-dot-shell {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.step-dot-pill {
		position: absolute;
		inset: 0;
		border-radius: 10px;
		background: color-mix(in oklch, var(--primary) 14%, transparent);
		animation: wizard-step-pill-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes wizard-step-pill-in {
		from { transform: scale(0.5); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.step-dot-pill {
			animation: none;
			opacity: 1;
			transform: scale(1);
		}
		.step-dot-shell-active .step-dot-core {
			transform: scale(1);
		}
	}

	.step-dot-core {
		position: relative;
		z-index: 1;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--border);
		transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
	}

	.step-dot-shell-done .step-dot-core {
		background: var(--primary);
		opacity: 0.4;
	}

	.step-dot-shell-active .step-dot-core {
		background: var(--primary);
		opacity: 1;
		transform: scale(1.35);
	}

	@media (min-width: 640px) {
		:global(.wizard-header-inner) {
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}
</style>
