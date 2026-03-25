<script lang="ts">
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import { Calendar } from '$shadcn/calendar';
	import { Checkbox } from '$shadcn/checkbox';
	import type { UserSelected } from '../types';
	import { fmtDate } from '../types';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import Copy from 'lucide-svelte/icons/copy';
	import Download from 'lucide-svelte/icons/download';
	import { CalendarDate, getLocalTimeZone } from '@internationalized/date';

	/** Résumé 90 jours : sport + nutrition par jour (source unique pour le calendrier et l’export JSON). */
	export type ProgramDaySummary = {
		dayIndex: number;
		sport: { session: { name: string }; completedAt?: string | null } | null;
		nutrition: {
			meals: Array<{
				position: string;
				recipe: { name: string } | null;
				mealId?: string;
				eatenAt?: string | null;
			}>;
		};
	};

	export type ProgramSummary = { days: ProgramDaySummary[] };

	const MS_PER_DAY = 24 * 60 * 60 * 1000;

	let { userSelected }: { userSelected: UserSelected } = $props();

	/** Date du jour N du programme (N = 1, 2, … 90) à partir de programStart. */
	function programDayToDate(programStart: Date, dayIndex: number): Date {
		return new Date(programStart.getTime() + (dayIndex - 1) * MS_PER_DAY);
	}

	function dateToCalendarDate(d: Date): CalendarDate {
		return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
	}

	function calendarDateToDate(c: CalendarDate): Date {
		return c.toDate(getLocalTimeZone());
	}

	/** Calcule le dayIndex (1–90) pour une date donnée par rapport à programStart ; 0 si hors plage. */
	function dateToDayIndex(programStart: Date, date: Date): number {
		const t0 = new Date(programStart.getFullYear(), programStart.getMonth(), programStart.getDate()).getTime();
		const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
		const days = Math.round((t - t0) / MS_PER_DAY) + 1;
		if (days < 1 || days > 90) return 0;
		return days;
	}

	const MEAL_POSITION_LABELS: Record<string, string> = {
		BREAKFAST: 'Petit-déj',
		LUNCH: 'Déjeuner',
		DINNER: 'Dîner'
	};

	function formatMealLine(position: string, recipeName: string | null | undefined): string {
		const label = MEAL_POSITION_LABELS[position] ?? position;
		return `${label}: ${recipeName ?? '—'}`;
	}

	/** Résumé 90 jours (sport + nutrition) — source unique pour le calendrier et l’export JSON. */
	const programSummary = $derived.by((): ProgramSummary => {
		const totalDays = 90;
		const workoutDays = userSelected.workoutDays ?? [];
		const nutritionDays = userSelected.nutritionDays ?? [];
		const workoutByDay = new Map<number, (typeof workoutDays)[0]>();
		for (const w of workoutDays) {
			workoutByDay.set(w.dayIndex, w);
		}
		const nutritionByDay = new Map<number, (typeof nutritionDays)[0]>();
		for (const n of nutritionDays) {
			nutritionByDay.set(n.dayIndex, n);
		}
		const days: ProgramDaySummary[] = [];
		for (let dayIndex = 1; dayIndex <= totalDays; dayIndex++) {
			const w = workoutByDay.get(dayIndex);
			const nd = nutritionByDay.get(dayIndex);
			const rawMeals = nd?.meals ?? [];
			const meals = rawMeals.map((m) => {
				const raw = m as { id?: string; eatenAt?: string | Date | null; position?: string; recipe?: { name?: string } | null };
				const eatenAtStr =
					raw.eatenAt instanceof Date ? raw.eatenAt.toISOString() : typeof raw.eatenAt === 'string' ? raw.eatenAt : null;
				return {
					position: (raw.position ?? '') as string,
					recipe: raw.recipe?.name ? { name: raw.recipe.name } : null,
					mealId: raw.id,
					eatenAt: eatenAtStr ?? null
				};
			});
			const completedAt = (w as { completedAt?: string | Date | null })?.completedAt;
			const completedAtStr =
				completedAt instanceof Date ? completedAt.toISOString() : typeof completedAt === 'string' ? completedAt : null;
			days.push({
				dayIndex,
				sport: w?.session?.name
					? { session: { name: w.session.name }, completedAt: completedAtStr ?? null }
					: null,
				nutrition: { meals }
			});
		}
		return { days };
	});

	const programStart = $derived(
		userSelected.programStartDate ? new Date(userSelected.programStartDate) : null
	);

	/** Valeur initiale du calendrier : premier jour du programme ou aujourd’hui. */
	const initialCalendarDate = $derived.by((): CalendarDate => {
		if (programStart) return dateToCalendarDate(programStart);
		const today = new Date();
		return new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
	});

	/** Bornes du calendrier pour les 90 jours (optionnel : limiter la sélection au programme). */
	const minValue = $derived.by((): CalendarDate | undefined => {
		if (!programStart) return undefined;
		return dateToCalendarDate(programStart);
	});
	const maxValue = $derived.by((): CalendarDate | undefined => {
		if (!programStart) return undefined;
		return dateToCalendarDate(programDayToDate(programStart, 90));
	});

	let selectedValue = $state<CalendarDate | undefined>(undefined);

	/** Au premier rendu, initialiser la sélection si on a un programme (pour afficher le détail du jour 1). */
	$effect(() => {
		if (programStart && selectedValue === undefined && initialCalendarDate) {
			selectedValue = initialCalendarDate;
		}
	});

	/** Jour du programme correspondant à la date sélectionnée (1–90), 0 si hors programme. */
	const selectedDayIndex = $derived.by((): number => {
		if (!selectedValue || !programStart) return 0;
		const d = calendarDateToDate(selectedValue);
		return dateToDayIndex(programStart, d);
	});

	/** Infos du jour sélectionné (sport + nutrition) pour le panneau détail. */
	const selectedDayInfo = $derived.by((): ProgramDaySummary | null => {
		if (selectedDayIndex < 1 || selectedDayIndex > 90) return null;
		return programSummary.days[selectedDayIndex - 1] ?? null;
	});

	async function copyProgramSummaryJson() {
		try {
			const json = JSON.stringify(programSummary, null, 2);
			await navigator.clipboard.writeText(json);
			toast.success('Résumé 90 jours copié dans le presse-papier');
		} catch (e) {
			toast.error('Copie impossible');
			console.error(e);
		}
	}

	let workoutToggling = $state(false);
	let mealToggling = $state<string | null>(null);

	async function toggleWorkout(completed: boolean) {
		if (!userSelected?.id || selectedDayIndex < 1 || workoutToggling) return;
		workoutToggling = true;
		try {
			const res = await fetch(`/admin/users/${userSelected.id}/calendar/complete-workout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ dayIndex: selectedDayIndex, completed })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error(data.error ?? 'Erreur lors de la mise à jour');
				return;
			}
			await invalidateAll();
		} finally {
			workoutToggling = false;
		}
	}

	async function toggleMeal(mealId: string | undefined, eaten: boolean) {
		if (!userSelected?.id || !mealId || mealToggling) return;
		mealToggling = mealId;
		try {
			const res = await fetch(`/admin/users/${userSelected.id}/calendar/complete-meal`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mealId, eaten })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error(data.error ?? 'Erreur lors de la mise à jour');
				return;
			}
			await invalidateAll();
		} finally {
			mealToggling = null;
		}
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Calendrier — 90 jours programme</Card.Title>
			<Card.Description class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<span class="basis-full sm:basis-auto"
					>Cliquez sur une date pour afficher le sport et les repas du jour. Les 90 jours du programme sont affichés.</span
				>
				{#if userSelected?.id}
					<span class="flex items-center gap-2 shrink-0">
						<Button variant="outline" size="sm" onclick={copyProgramSummaryJson}>
							<Copy class="mr-1.5 size-4" />
							Copier résumé 90j (JSON)
						</Button>
						<a
							href="/admin/users/{userSelected.id}/program-summary"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button variant="outline" size="sm" type="button">
								<Download class="mr-1.5 size-4" />
								Télécharger JSON
							</Button>
						</a>
					</span>
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6 lg:flex-row">
			<div class="rounded-lg border bg-card shadow-sm">
				<Calendar
					type="single"
					bind:value={selectedValue}
					placeholder={initialCalendarDate}
					numberOfMonths={3}
					pagedNavigation
					weekdayFormat="short"
					locale="fr-FR"
					{minValue}
					{maxValue}
					class="rounded-lg border-0"
				/>
			</div>

			<!-- Panneau détail du jour sélectionné -->
			<div class="min-w-[280px] flex-1 rounded-lg border bg-muted/30 p-4">
				{#if selectedValue}
					<p class="mb-3 text-sm font-medium text-muted-foreground">
						{selectedValue.toDate(getLocalTimeZone()).toLocaleDateString('fr-FR', {
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})}
					</p>
					{#if selectedDayInfo && selectedDayIndex >= 1}
						<div class="space-y-4">
							<div>
								<h4 class="mb-1.5 text-sm font-semibold">Jour {selectedDayIndex} du programme</h4>
								{#if selectedDayInfo.sport}
									<div class="flex items-start gap-3 rounded-md border bg-card p-3">
										<Checkbox
											checked={!!selectedDayInfo.sport.completedAt}
											disabled={workoutToggling}
											onCheckedChange={(v) => toggleWorkout(!!v)}
											aria-label="Séance complétée"
										/>
										<div class="flex-1 min-w-0">
											<p class="font-medium text-foreground">{selectedDayInfo.sport.session.name}</p>
											{#if selectedDayInfo.sport.completedAt}
												<p class="mt-1 text-sm text-muted-foreground">
													Complété le {fmtDate(selectedDayInfo.sport.completedAt)}
												</p>
											{:else}
												<p class="mt-1 text-sm text-muted-foreground">À faire</p>
											{/if}
										</div>
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">Pas de séance ce jour-là.</p>
								{/if}
							</div>
							<div>
								<h4 class="mb-1.5 text-sm font-semibold">Repas</h4>
								{#if selectedDayInfo.nutrition.meals.length > 0}
									<ul class="space-y-2 rounded-md border bg-card p-3 text-sm">
										{#each selectedDayInfo.nutrition.meals as m}
											<li class="flex items-center gap-3">
												<Checkbox
													checked={!!m.eatenAt}
													disabled={mealToggling !== null}
													onCheckedChange={(v) => toggleMeal(m.mealId, !!v)}
													aria-label={formatMealLine(m.position, m.recipe?.name ?? null)}
												/>
												<span class={m.eatenAt ? 'text-muted-foreground line-through' : ''}>
													{formatMealLine(m.position, m.recipe?.name ?? null)}
												</span>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="text-sm text-muted-foreground">Aucun repas planifié.</p>
								{/if}
							</div>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">
							Cette date est hors des 90 jours du programme (début : {programStart
								? programStart.toLocaleDateString('fr-FR')
								: '—'}).
						</p>
					{/if}
				{:else}
					<p class="text-sm text-muted-foreground">Sélectionnez une date pour afficher les informations du jour.</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
</div>
