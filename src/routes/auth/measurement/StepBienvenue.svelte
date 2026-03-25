<script lang="ts">
	import * as Card from '$shadcn/card';
	import { Badge } from '$shadcn/badge';
	import { Separator } from '$shadcn/separator';
	import { Button } from '$shadcn/button';
	import { Activity, ArrowRight } from 'lucide-svelte';

	type MeasurementEntry = {
		id: string;
		createdAt: string | Date;
		weightKg?: number | null;
		heightCm?: number | null;
		waistCm?: number | null;
	};

	let {
		bodyMeasurements,
		stepLabels,
		onnext
	}: {
		bodyMeasurements: MeasurementEntry[];
		stepLabels: string[];
		onnext: () => void;
	} = $props();
</script>

<div class="step-intro">
	<h1 class="titleHome">Mon profil<br />physique</h1>

	<Card.Root class="intro-card mt-6">
		<Card.Content class="pt-6 pb-6 space-y-4">
			<p class="intro-quote">
				Ce formulaire n'est pas un interrogatoire de police, c'est le <strong>point de départ de ta nouvelle vie.</strong>
			</p>
			<Separator />
			<p class="text-sm text-muted-foreground leading-relaxed">
				Sois <strong>100% cash et honnête</strong> : plus tu es vrai avec moi, plus la Méthode Thower sera une machine de guerre pour transformer ton corps et ton énergie.
			</p>
			<div class="intro-steps-preview">
				{#each stepLabels.slice(1) as label, i}
					<div class="intro-step-item">
						<span class="intro-step-num">{i + 1}</span>
						<span class="text-sm">{label}</span>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	{#if bodyMeasurements?.length > 0}
		<Card.Root class="mt-4 border-dashed">
			<Card.Header class="pb-2">
				<Card.Title class="flex items-center gap-2 text-sm font-medium">
					<Activity class="h-4 w-4 text-primary" />
					Dernière mise à jour
				</Card.Title>
			</Card.Header>
			<Card.Content class="pb-4">
				{#each bodyMeasurements.slice(0, 1) as m}
					<div class="flex flex-wrap gap-3 text-sm">
						<span class="text-muted-foreground">
							{new Date(m.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
						</span>
						{#if m.weightKg != null}<Badge variant="outline">{m.weightKg} kg</Badge>{/if}
						{#if m.heightCm != null}<Badge variant="outline">{m.heightCm} cm</Badge>{/if}
						{#if m.waistCm != null}<Badge variant="outline">Taille {m.waistCm} cm</Badge>{/if}
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<Button type="button" size="lg" class="w-full mt-6 gap-2" onclick={onnext}>
		Commencer
		<ArrowRight class="h-4 w-4" />
	</Button>
</div>

<style lang="scss">
	.step-intro {
		display: flex;
		flex-direction: column;
	}

	.titleHome {
		font-family: 'Open Sans Variable', sans-serif;
		font-style: italic;
		font-size: clamp(2rem, 8vw, 3.5rem);
		-webkit-text-stroke: 1px var(--foreground);
		color: transparent;
		text-transform: uppercase;
		font-weight: 900;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	:global(.intro-card) {
		border-left: 3px solid var(--primary);
	}

	.intro-quote {
		font-size: 1rem;
		line-height: 1.6;
	}

	.intro-steps-preview {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.intro-step-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		background: var(--muted);
		font-size: 0.8rem;
	}

	.intro-step-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.7rem;
		font-weight: 700;
		flex-shrink: 0;
	}
</style>
