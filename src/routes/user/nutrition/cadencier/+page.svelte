<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

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

	function selectDay(dayIndex: number) {
		userPickedDay = dayIndex;
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

<div class="back-row">
	<a href="/user/nutrition" class="home-btn">← Nutrition</a>
	<div class="page-title">Cadencier</div>
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
			onclick={() => selectDay(d.dayIndex)}
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
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		background: #0a0a0a;
		flex-shrink: 0;
		gap: 12px;
		border-bottom: 1px solid rgba(201, 168, 76, 0.15);
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #c9a84c;
		font-size: 0.7rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		background: rgba(201, 168, 76, 0.1);
		transition: all 0.15s;
	}

	.home-btn:active {
		background: rgba(201, 168, 76, 0.2);
	}

	.page-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: #f0ede8;
		margin-left: auto;
		font-family: 'Bebas Neue', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.week-info {
		padding: 14px 18px;
		background: rgba(201, 168, 76, 0.08);
		border-bottom: 1px solid rgba(201, 168, 76, 0.15);
	}

	.week-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.week-header {
		font-size: 0.7rem;
		font-weight: 600;
		color: #f0ede8;
	}

	.week-switch {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.week-switch-lbl {
		font-size: 0.55rem;
		color: rgba(240, 237, 232, 0.55);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.week-select {
		font-size: 0.62rem;
		padding: 6px 10px;
		border-radius: 4px;
		border: 1px solid rgba(201, 168, 76, 0.35);
		background: #0a0a0a;
		color: #f0ede8;
		min-width: 120px;
		cursor: pointer;
	}

	.week-sub {
		font-size: 0.55rem;
		color: #c9a84c;
		margin-top: 8px;
		line-height: 1.4;
	}

	.warn {
		color: rgba(255, 180, 120, 0.95);
	}

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
		background: rgba(240, 237, 232, 0.05);
		border: 1px solid rgba(201, 168, 76, 0.2);
		border-radius: 4px;
		text-decoration: none;
		color: #f0ede8;
		cursor: pointer;
		transition: all 0.15s;
		font-weight: 500;
	}

	.day-btn:active {
		background: rgba(240, 237, 232, 0.08);
	}

	.day-btn.active {
		background: #c9a84c;
		color: #0a0a0a;
		border-color: #c9a84c;
	}

	.day-btn.today:not(.active) {
		border-color: rgba(58, 184, 184, 0.55);
		box-shadow: 0 0 0 1px rgba(58, 184, 184, 0.25);
	}

	.day-name {
		font-size: 0.5rem;
		color: rgba(240, 237, 232, 0.4);
		margin-bottom: 2px;
	}

	.day-btn.active .day-name {
		color: rgba(10, 10, 10, 0.5);
	}

	.day-num {
		font-size: 0.75rem;
		font-weight: 700;
	}

	.today-pill {
		position: absolute;
		bottom: 3px;
		font-size: 0.42rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #3ab8b8;
	}

	.day-btn.active .today-pill {
		color: rgba(10, 10, 10, 0.65);
	}

	.meals-section {
		padding: 12px 18px;
	}

	.section-header {
		font-size: 0.75rem;
		font-weight: 700;
		color: #c9a84c;
		margin-bottom: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-family: 'Bebas Neue', sans-serif;
	}

	.empty-msg {
		font-size: 0.62rem;
		color: rgba(240, 237, 232, 0.45);
		line-height: 1.5;
		margin: 0;
	}

	.meals-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.meal-item {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
		background: rgba(201, 168, 76, 0.08);
		border: 1px solid rgba(201, 168, 76, 0.15);
		border-radius: 6px;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.meal-item:active {
		background: rgba(201, 168, 76, 0.12);
	}

	.meal-header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.meal-time {
		font-size: 0.62rem;
		font-weight: 600;
		color: #f0ede8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: 'DM Sans', sans-serif;
	}

	.meal-time-clock {
		font-size: 0.56rem;
		color: rgba(240, 237, 232, 0.6);
		font-family: 'DM Sans', sans-serif;
	}

	.meal-name {
		font-size: 0.65rem;
		color: #c9a84c;
		font-weight: 500;
	}

	.meal-macros {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}

	.macro-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 6px 4px;
		background: rgba(58, 184, 184, 0.15);
		border-radius: 3px;
	}

	.macro-val {
		font-size: 0.72rem;
		font-weight: 700;
		color: #3ab8b8;
	}

	.macro-lbl {
		font-size: 0.46rem;
		color: rgba(240, 237, 232, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 500;
		font-family: 'DM Sans', sans-serif;
	}

	.meal-arrow {
		font-size: 0.58rem;
		font-weight: 600;
		color: #3ab8b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		align-self: flex-end;
	}
</style>
