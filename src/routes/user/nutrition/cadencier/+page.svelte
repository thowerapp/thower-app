<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { fireElement, registerSources } from '$lib/utils/particles';

	let { data }: { data: PageData } = $props();

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	/** null = utiliser defaultSelectedDay du serveur pour cette semaine */
	let userPickedDay = $state<number | null>(null);
	let syncedWeek = $state(-1);

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

	function selectDay(e: MouseEvent & { currentTarget: HTMLButtonElement }, dayIndex: number) {
		userPickedDay = dayIndex;
		fireElement(e.currentTarget);
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

<div class="week-grid">
	{#each data.weekDays as d (d.dayIndex)}
		<button
			type="button"
			class="day-btn"
			class:active={d.dayIndex === selectedDay}
			class:today={d.isToday}
			class:pending={d.isToday && d.meals.length === 0}
			onclick={(e) => selectDay(e, d.dayIndex)}
		>
			<div class="day-name">{d.dayName}</div>
			<div class="day-num">{d.dayNumInWeek}</div>
			{#if d.isToday}
				<div class="today-pill">Auj.</div>
			{/if}
		</button>
	{/each}
</div>

<div class="meals-section">
	<div class="section-header">
		{getDayName(selectedDay).charAt(0).toUpperCase() + getDayName(selectedDay).slice(1)} · Jour {selectedDay}
	</div>

	{#if selectedDayData && selectedDayData.meals.length > 0}
		<div class="meals-list">
			{#each selectedDayData.meals as meal (meal.id)}
				<a href="/user/nutrition/cadencier/{selectedDay}" class="meal-item">
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
		background: rgba(200, 164, 74, 0.08);
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
		padding: 6px 10px;
		border: 1px solid rgba(200, 164, 74, 0.35);
		background: var(--s1);
		color: var(--tx);
		min-width: 120px;
		cursor: pointer;
		font-family: var(--fb);
	}
	.week-sub {
		font-size: 0.5rem;
		color: var(--g);
		margin-top: 8px;
		line-height: 1.4;
		font-family: var(--fb);
	}
	.warn { color: rgba(255, 180, 120, 0.95); }

	.week-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		padding: 10px 12px;
	}
	.day-btn {
		position: relative;
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(237, 229, 208, 0.05);
		border: 1px solid rgba(200, 164, 74, 0.2);
		color: var(--tx);
		cursor: pointer;
		transition: border-color 0.15s;
		font-weight: 500;
		-webkit-tap-highlight-color: transparent;
	}
	.day-btn:active { background: rgba(237, 229, 208, 0.08); }
	.day-btn.active { background: var(--g); color: var(--s1); border-color: var(--g); }
	.day-btn.today:not(.active) {
		border-color: rgba(0, 212, 232, 0.55);
		box-shadow: 0 0 0 1px rgba(0, 212, 232, 0.2);
	}
	.day-name {
		font-size: 0.4375rem;
		color: var(--txd);
		margin-bottom: 2px;
		font-family: var(--fb);
	}
	.day-btn.active .day-name { color: rgba(13, 10, 5, 0.5); }
	.day-num { font-size: 0.6875rem; font-weight: 700; font-family: var(--fh); }
	.today-pill {
		position: absolute;
		bottom: 3px;
		font-size: 0.4375rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--cy);
		font-family: var(--fb);
	}
	.day-btn.active .today-pill { color: rgba(13, 10, 5, 0.65); }

	.meals-section { padding: 12px 18px; }
	.section-header {
		font-family: var(--fh2);
		font-size: 1rem;
		color: var(--g);
		margin-bottom: 10px;
		letter-spacing: 0.05em;
	}
	.empty-msg {
		font-size: 0.5rem;
		color: var(--txd);
		line-height: 1.5;
		margin: 0;
		font-family: var(--fb);
	}

	.meals-list { display: flex; flex-direction: column; gap: 8px; }
	.meal-item {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		background: rgba(200, 164, 74, 0.08);
		border: 1px solid var(--br2);
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}
	.meal-item:active { background: rgba(200, 164, 74, 0.12); }
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

	.meal-macros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
	.macro-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 4px;
		background: rgba(0, 212, 232, 0.12);
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
</style>
