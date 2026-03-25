<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as RadioGroup from '$shadcn/radio-group';
	import { Moon, Briefcase, PersonStanding, Zap, CheckCircle2 } from 'lucide-svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let { form: _form, formData }: { form: any; formData: any } = $props();

	const activityLevels = [
		{
			value: 'SEDENTARY',
			label: 'Sédentaire',
			desc: 'Travail de bureau, déplacements en voiture, peu de marche.',
			icon: Briefcase
		},
		{
			value: 'ACTIVE',
			label: 'Modéré',
			desc: 'Professeur, vendeur, travail debout fréquent, marche un peu.',
			icon: PersonStanding
		},
		{
			value: 'ATHLETE',
			label: 'Très actif',
			desc: 'Métier physique (BTP, serveur, infirmier), bouge toute la journée.',
			icon: Zap
		}
	];

	const intermittentValue = $derived(
		$formData.intermittentFastingMorning === true ? 'on' : 'off'
	);

	function setIntermittent(val: string) {
		$formData.intermittentFastingMorning = val === 'on';
	}
</script>

<div class="step-content">
	<div class="step-heading">
		<Moon class="step-icon" />
		<div>
			<h2 class="step-title">Lifestyle & Activité</h2>
			<p class="step-desc">Ton rythme de vie pour calibrer la méthode.</p>
		</div>
	</div>

	<!-- Jeûne intermittent -->
	<Card.Root>
		<Card.Header class="pb-3">
			<Card.Title class="text-sm font-semibold">Jeûne intermittent le matin</Card.Title>
			<Card.Description class="text-xs leading-relaxed">
				C'est un des très gros hacks de la Méthode Thower pour booster ton système hormonal, gérer ton insuline et bénéficier de l'autophagie. Tu peux le faire ?
			</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5">
			<RadioGroup.Root
				value={intermittentValue}
				onValueChange={(v) => setIntermittent(v ?? 'off')}
				class="grid grid-cols-2 gap-3"
			>
				{#each [{ value: 'off', label: 'Non' }, { value: 'on', label: 'Oui' }] as opt}
					<label
						class="radio-card"
						class:radio-card-selected={intermittentValue === opt.value}
					>
						<RadioGroup.Item value={opt.value} class="sr-only" />
						<span class="font-medium">{opt.label}</span>
						{#if intermittentValue === opt.value}
							<CheckCircle2 class="h-4 w-4 ml-auto" />
						{/if}
					</label>
				{/each}
			</RadioGroup.Root>
		</Card.Content>
	</Card.Root>

	<!-- Niveau d'activité -->
	<Card.Root class="mt-4">
		<Card.Header class="pb-3">
			<Card.Title class="text-sm font-semibold">Niveau d'activité actuel</Card.Title>
			<Card.Description class="text-xs">Basé sur ton quotidien professionnel et personnel — pas ton sport.</Card.Description>
		</Card.Header>
		<Card.Content class="pb-5 space-y-3">
			{#each activityLevels as level}
				<button
					type="button"
					class="activity-card"
					class:activity-card-selected={$formData.activityLevel === level.value}
					onclick={() => { $formData.activityLevel = level.value; }}
					aria-pressed={$formData.activityLevel === level.value}
				>
					<input type="radio" name="activityLevel" value={level.value} checked={$formData.activityLevel === level.value} class="sr-only" />
					<div class="activity-icon-wrap">
						<level.icon class="h-5 w-5" />
					</div>
					<div class="flex-1 text-left">
						<p class="font-semibold text-sm">{level.label}</p>
						<p class="activity-card-desc text-xs text-muted-foreground mt-0.5 leading-relaxed">{level.desc}</p>
					</div>
					{#if $formData.activityLevel === level.value}
						<CheckCircle2 class="h-5 w-5 shrink-0 text-primary-foreground" />
					{/if}
				</button>
			{/each}
		</Card.Content>
	</Card.Root>
</div>

<style lang="scss">
	.step-content { display: flex; flex-direction: column; gap: 1rem; }
	.step-heading { display: flex; align-items: flex-start; gap: 0.75rem; }
	:global(.step-icon) { width: 1.5rem; height: 1.5rem; color: var(--primary); flex-shrink: 0; margin-top: 0.1rem; }
	.step-title { font-size: 1.25rem; font-weight: 700; margin: 0; line-height: 1.2; }
	.step-desc { font-size: 0.875rem; color: var(--muted-foreground); margin: 0.2rem 0 0; line-height: 1.4; }

	.radio-card {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		border: 2px solid var(--border);
		border-radius: 10px;
		background: var(--card);
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: border-color 0.15s, background 0.15s, color 0.15s;

		&:hover { border-color: var(--primary); }
	}

	.radio-card-selected {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.activity-card {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
		padding: 0.875rem 1rem;
		border: 2px solid var(--border);
		border-radius: 10px;
		background: var(--card);
		cursor: pointer;
		width: 100%;
		text-align: left;
		font: inherit;
		color: inherit;
		transition: border-color 0.15s, background 0.15s, color 0.15s;

		&:hover:not(.activity-card-selected) {
			border-color: var(--foreground);
			background: color-mix(in oklch, var(--foreground) 11%, var(--card));
			color: var(--foreground);

			.activity-card-desc {
				color: color-mix(in oklch, var(--muted-foreground) 35%, var(--foreground));
			}

			.activity-icon-wrap {
				background: color-mix(in oklch, var(--foreground) 14%, var(--muted));
			}
		}
	}

	.activity-card-selected {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);

		&:hover {
			background: color-mix(in oklch, var(--primary) 82%, black);
			border-color: color-mix(in oklch, var(--primary) 82%, black);
		}

		.activity-icon-wrap {
			background: rgba(255, 255, 255, 0.2);
		}
	}

	.activity-icon-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 8px;
		background: var(--muted);
		flex-shrink: 0;
	}
</style>
