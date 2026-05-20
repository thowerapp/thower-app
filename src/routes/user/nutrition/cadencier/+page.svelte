<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { fireElement, registerSources } from '$lib/utils/particles';

	let { data }: { data: PageData } = $props();

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	/** null = utiliser defaultSelectedDay du serveur pour cette semaine */
	let userPickedDay = $state<number | null>(null);
	let syncedWeek = $state(-1);
	let jeuneOverrideByDay = $state<Record<number, boolean>>({});

	$effect.pre(() => {
		const w = data.selectedWeek;
		if (w !== syncedWeek) {
			syncedWeek = w;
			userPickedDay = null;
		}
	});

	const selectedDay = $derived(userPickedDay ?? data.defaultSelectedDay);

	const selectedDayData = $derived(
		data.weekDays.find((d) => d.dayIndex === selectedDay) ?? null
	);

	const jeuneActive = $derived(
		jeuneOverrideByDay[selectedDay] ?? selectedDayData?.intermittentFasting ?? false
	);

	function logJeuneState(trigger: string) {
		const rawMeals = selectedDayData?.meals ?? [];
		console.log(
			'[cadencier-jeune:client]',
			JSON.stringify({
				trigger,
				selectedDay,
				jeuneActive,
				override: jeuneOverrideByDay[selectedDay] ?? null,
				serverIntermittentFasting: selectedDayData?.intermittentFasting ?? null,
				rawMealCount: rawMeals.length,
				rawPositions: rawMeals.map((m) => m.position),
				hasBreakfastInDb: rawMeals.some((m) => m.position === 'BREAKFAST'),
				displayMealCount: displayMeals.length,
				displayPositions: displayMeals.map((m) => m.position)
			})
		);
	}

	const displayMeals = $derived(
		!selectedDayData
			? []
			: !jeuneActive
				? selectedDayData.meals
				: (() => {
						const meals = selectedDayData.meals;
						const noBreakfast = meals.filter((m) => m.position !== 'BREAKFAST');
						if (noBreakfast.length === 0) return [];
						const total = meals.reduce(
							(acc, m) => ({
								calories: acc.calories + m.calories,
								proteinG: acc.proteinG + m.proteinG,
								carbsG: acc.carbsG + m.carbsG,
								fatG: acc.fatG + m.fatG,
								fiberG: acc.fiberG + m.fiberG
							}),
							{ calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
						);
						const count = noBreakfast.length;
						const tKcal = data.targetKcal ?? total.calories;
						const tProt = data.targetProteinG ?? total.proteinG;
						const tFib = data.targetFiberG ?? total.fiberG;
						return noBreakfast.map((m, i) => ({
							...m,
							slotIndex: i + 1,
							label: `Repas ${i + 1} — ${m.position === 'LUNCH' ? 'Déjeuner' : m.position === 'DINNER' ? 'Dîner' : m.label.split('—')[1]?.trim() ?? m.label}`,
							calories: Math.round(tKcal / count),
							proteinG: Math.round((tProt / count) * 10) / 10,
							carbsG: Math.round((total.carbsG / count) * 10) / 10,
							fatG: Math.round((total.fatG / count) * 10) / 10,
							fiberG: Math.round((tFib / count) * 10) / 10
						}));
					})()
	);

	$effect(() => {
		logJeuneState('state-change');
	});

	function selectDay(e: MouseEvent & { currentTarget: HTMLButtonElement }, dayIndex: number) {
		userPickedDay = dayIndex;
		fireElement(e.currentTarget, e);
		setTimeout(() => registerSources(document.body), 40);
	}

	function changeWeek(week: number) {
		goto(`?semaine=${week}`, { invalidateAll: true, keepFocus: true });
	}

	function getDayName(dayIndex: number): string {
		return dayNames[(dayIndex - 1) % 7] ?? '—';
	}

	function getDayNumInWeek(dayIndex: number): number {
		return ((dayIndex - 1) % 7) + 1;
	}
</script>

<div class="u-back-row">
	<a href="/user/nutrition" class="u-back-lnk">
		<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
		<span class="u-back-lbl">Nutrition</span>
	</a>
	<div class="u-back-head">Cadencier</div>
</div>

<div class="week-info">
	<div class="week-header-row">
		<span class="week-header">Semaine {data.selectedWeek} / 13</span>
		<label class="week-switch">
			<span class="week-switch-lbl">Semaine</span>
			<select
				class="week-select"
				value={String(data.selectedWeek)}
				onchange={(e) => changeWeek(Number.parseInt(e.currentTarget.value, 10))}
				aria-label="Choisir la semaine du programme"
			>
				{#each Array(13) as _, i}
					<option value={String(i + 1)}>
						S. {i + 1}
						{i + 1 === data.currentWeek ? ' (en cours)' : ''}
					</option>
				{/each}
			</select>
		</label>
	</div>
	<div class="week-sub">
		91 jours · Jour programme : {data.currentDayIndex}
		{#if !data.hasProgramStart}
			· <span class="warn">Début de programme non défini — jour affiché comme J1</span>
		{/if}
	</div>
</div>

<!-- Toggle jeûne intermittent -->
<form
	method="POST"
	action="?/toggleJeuneDay"
	use:enhance={() => {
		const day = selectedDay;
		const nextActive = !jeuneActive;
		console.log(
			'[cadencier-jeune:client]',
			JSON.stringify({
				trigger: 'toggle-submit',
				day,
				fromJeuneActive: jeuneActive,
				toJeuneActive: nextActive,
				formActive: nextActive,
				beforeOverride: jeuneOverrideByDay[day] ?? null
			})
		);
		jeuneOverrideByDay = { ...jeuneOverrideByDay, [day]: nextActive };
		return async ({ result, update }) => {
			console.log(
				'[cadencier-jeune:client]',
				JSON.stringify({
					trigger: 'toggle-result',
					day,
					resultType: result.type,
					resultData: result.type === 'success' || result.type === 'failure' ? result.data : null
				})
			);
			await update({ invalidateAll: false });
			logJeuneState('after-update');
		};
	}}
>
	<input type="hidden" name="active" value={String(!jeuneActive)} />
	<input type="hidden" name="dayIndex" value={String(selectedDay)} />
	<button type="submit" class="jeune-toggle" class:jim-on={jeuneActive} disabled={!selectedDayData?.hasPlan}>
		<div class="jt-left">
			<div class="jt-label">Jeûne intermittent — Jour {selectedDay}</div>
			<div class="jt-sub">
				{#if jeuneActive}
					Actif · 2 repas équilibrés
				{:else}
					Inactif · 3 repas (Petit-déj. + Déjeuner + Dîner)
				{/if}
			</div>
		</div>
		<div class="jt-pill" class:on={jeuneActive}>
			<div class="jt-thumb"></div>
		</div>
	</button>
</form>

<div class="u-sport-week">
	{#each data.weekDays as d}
		<button
			type="button"
			class="u-sd"
			class:today={d.isToday && d.dayIndex !== selectedDay}
			class:active={d.dayIndex === selectedDay}
			class:pending={d.isToday && d.meals.length === 0}
			onclick={(e) => selectDay(e, d.dayIndex)}
		>
			<div class="u-sd-n">{d.dayName}</div>
			<div class="u-sd-d">{d.dayNumInWeek}</div>
			{#if d.isToday}
				<div class="u-sd-b" style="color:var(--cy);font-size:.375rem">Auj.</div>
			{:else}
				<div class="u-sd-b">{d.meals.length > 0 ? '●' : '·'}</div>
			{/if}
		</button>
	{/each}
</div>

<div class="meals-section">
	<div class="section-header">
		{getDayName(selectedDay).charAt(0).toUpperCase() + getDayName(selectedDay).slice(1)} · Jour {selectedDay}
	</div>

	{#if displayMeals.length > 0}
		<div class="meals-list">
			{#each displayMeals as meal (meal.id)}
				<a href="/user/nutrition/cadencier/{selectedDay}#{meal.position.toLowerCase()}" class="meal-item">
					<div class="meal-header-top">
						<div class="meal-time">{meal.label}</div>
						<div class="meal-time-clock">{meal.timeLabel}</div>
					</div>
					<div class="meal-name">{meal.recipeName}</div>
					<div class="meal-macros">
						<div class="macro-box">
							<div class="macro-val">{meal.calories}</div>
							<div class="macro-lbl">kcal</div>
						</div>
						<div class="macro-box">
							<div class="macro-val">{meal.proteinG}g</div>
							<div class="macro-lbl">P</div>
						</div>
						<div class="macro-box">
							<div class="macro-val">{meal.carbsG}g</div>
							<div class="macro-lbl">C</div>
						</div>
						<div class="macro-box">
							<div class="macro-val">{meal.fatG}g</div>
							<div class="macro-lbl">L</div>
						</div>
						<div class="macro-box">
							<div class="macro-val">{meal.fiberG}g</div>
							<div class="macro-lbl">F</div>
						</div>
					</div>
					<div class="meal-arrow">Fiche jour →</div>
				</a>
			{/each}
		</div>
	{:else}
		<p class="empty-msg">
			Aucun repas planifié pour ce jour. La génération du programme ou une mensuration peuvent être
			nécessaires.
		</p>
	{/if}
</div>

<style>
	.week-info {
		padding: 14px 18px;
		background: transparent;
		border-bottom: 1px solid var(--br);
	}
	.week-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.week-header {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--tx);
		font-family: var(--fb);
	}
	.week-switch { display: flex; align-items: center; gap: 8px; }
	.week-switch-lbl {
		font-size: 0.5rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-family: var(--fb);
	}
	.week-select {
		font-size: 0.5rem;
		padding: 5px 8px;
		border: 1px solid var(--br2);
		background: transparent;
		color: var(--tx);
		min-width: 110px;
		cursor: pointer;
		font-family: var(--fb);
		-webkit-appearance: none;
		appearance: none;
	}
	.week-sub {
		font-size: 0.5rem;
		color: var(--g);
		margin-top: 8px;
		line-height: 1.4;
		font-family: var(--fb);
	}
	.warn { color: rgba(255, 180, 120, 0.95); }

	/* ── Overrides spécifiques cadencier ── */
	/* Jour sélectionné (actif) */
	:global(.u-sd.active) {
		background: var(--s3);
		border-color: var(--g) !important;
		box-shadow: 0 0 6px rgba(201,168,78,.2);
	}
	:global(.u-sd.active .u-sd-d) { color: var(--g); }
	:global(.u-sd.active .u-sd-n) { color: rgba(201,168,78,.6); }

	.meals-section { padding: 12px 18px; }
	.section-header {
		font-family: var(--fh);
		font-size: 1rem;
		color: var(--g);
		margin-bottom: 10px;
		letter-spacing: -0.06em;
		text-transform: uppercase;
		font-weight: 800;
	}
	.empty-msg {
		font-size: 0.5rem;
		color: var(--txd);
		line-height: 1.5;
		margin: 0;
		font-family: var(--fb);
	}

	.meals-list { display: flex; flex-direction: column; gap: 16px; }
	.meal-item {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--br);
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}
	.meal-item:hover { border-color: var(--br2); }
	.meal-item:active { background: rgba(200, 164, 74, 0.05); }
	.meal-header-top { display: flex; justify-content: space-between; align-items: center; }
	.meal-time {
		font-size: 0.5rem;
		font-weight: 600;
		color: var(--tx);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--fb);
	}
	.meal-time-clock { font-size: 0.5rem; color: var(--txd); font-family: var(--fb); }
	.meal-name { font-size: 0.6875rem; color: var(--g); font-weight: 500; font-family: var(--fb); }

	.meal-macros { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
	.macro-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 5px 2px;
		border: 1px solid var(--br);
		background: transparent;
	}
	.macro-val { font-size: 0.6875rem; font-weight: 700; color: var(--cy); font-family: var(--fh); }
	.macro-lbl {
		font-size: 0.4375rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: var(--fb);
	}
	.meal-arrow {
		font-size: 0.5rem;
		font-weight: 600;
		color: var(--cy);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		align-self: flex-end;
		font-family: var(--fb);
	}

	/* ── Toggle jeûne ── */
	.jeune-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 11px 18px;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--br);
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
		gap: 12px;
		text-align: left;
	}
	.jeune-toggle:active { background: rgba(0,229,255,.03); }
	.jeune-toggle.jim-on .jt-label { color: var(--cy); }
	.jt-left { flex: 1; min-width: 0; }
	.jt-label { font-size: .625rem; font-weight: 600; color: var(--tx); font-family: var(--fb); }
	.jt-sub { font-size: .5rem; color: var(--txd); margin-top: 2px; font-family: var(--fb); line-height: 1.3; }
	.jt-sub strong { color: var(--g); font-weight: 700; }
	/* Pill toggle */
	.jt-pill {
		width: 34px; height: 18px;
		border-radius: 9px;
		background: var(--br2);
		border: 1px solid var(--br2);
		position: relative;
		transition: background .22s, border-color .22s;
		flex-shrink: 0;
	}
	.jt-pill.on { background: rgba(0,229,255,.15); border-color: var(--cy); }
	.jt-thumb {
		position: absolute;
		top: 2px; left: 2px;
		width: 12px; height: 12px;
		border-radius: 50%;
		background: var(--txd);
		transition: transform .22s, background .22s;
	}
	.jt-pill.on .jt-thumb { transform: translateX(16px); background: var(--cy); box-shadow: 0 0 6px rgba(0,229,255,.5); }
</style>
