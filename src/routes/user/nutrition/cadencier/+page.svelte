<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	$: weekNum = Math.ceil((data.dayIndex || 5) / 7);
	$: today = data.dayIndex || 21;
	$: todayName = dayNames[(today - 1) % 7];

	let selectedDay = 21; // Default to day 21

	function getDayName(dayNum: number): string {
		return dayNames[(dayNum - 1) % 7];
	}

	function getDayNum(dayNum: number): number {
		return ((dayNum - 1) % 7) + 1;
	}

	function selectDay(dayNum: number) {
		selectedDay = dayNum;
	}

	// Mock data for meals
	const meals = {
		1: {
			name: 'Salade niçoise revisitée',
			time: '12h30',
			macros: { calories: 380, protein: 32, carbs: 18, fat: 14 }
		},
		2: {
			name: 'Non planifié',
			time: '19h00',
			macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
		}
	};
</script>

<div class="back-row">
	<a href="/user" class="home-btn">← Accueil</a>
	<div class="page-title">Cadencier</div>
</div>

<div class="week-info">
	<div class="week-header">Semaine {weekNum} / 13</div>
	<div class="week-sub">91 jours · Sélectionne un jour pour voir les repas</div>
</div>

<div class="week-grid">
	{#each Array(7) as _, i}
		{@const dayNum = (weekNum - 1) * 7 + i + 1}
		<button 
			type="button"
			class="day-btn" 
			class:active={dayNum === selectedDay}
			onclick={() => selectDay(dayNum)}
		>
			<div class="day-name">{getDayName(dayNum)}</div>
			<div class="day-num">{getDayNum(dayNum)}</div>
		</button>
	{/each}
</div>

<div class="meals-section">
	<div class="section-header">
		{getDayName(selectedDay).charAt(0).toUpperCase() + getDayName(selectedDay).slice(1)} {getDayNum(selectedDay)}
	</div>

	<div class="meals-list">
		<a href="/user/nutrition/cadencier/{selectedDay}/edit-meal/1" class="meal-item">
			<div class="meal-header-top">
				<div class="meal-time">Repas 1 — Déjeuner</div>
				<div class="meal-time-clock">12h30</div>
			</div>
			<div class="meal-name">{meals[1].name}</div>
			
			<div class="meal-macros">
				<div class="macro-box">
					<div class="macro-val">{meals[1].macros.calories}</div>
					<div class="macro-lbl">kcal</div>
				</div>
				<div class="macro-box">
					<div class="macro-val">{meals[1].macros.protein}g</div>
					<div class="macro-lbl">P</div>
				</div>
				<div class="macro-box">
					<div class="macro-val">{meals[1].macros.carbs}g</div>
					<div class="macro-lbl">C</div>
				</div>
				<div class="macro-box">
					<div class="macro-val">{meals[1].macros.fat}g</div>
					<div class="macro-lbl">L</div>
				</div>
			</div>
			<div class="meal-arrow">Modifier →</div>
		</a>

		<a href="/user/nutrition/cadencier/{selectedDay}/edit-meal/2" class="meal-item">
			<div class="meal-header-top">
				<div class="meal-time">Repas 2 — Dîner</div>
				<div class="meal-time-clock">19h00</div>
			</div>
			<div class="meal-name">{meals[2].name}</div>
			
			<div class="meal-macros">
				<div class="macro-box">
					<div class="macro-val">{meals[2].macros.calories}</div>
					<div class="macro-lbl">kcal</div>
				</div>
				<div class="macro-box">
					<div class="macro-val">{meals[2].macros.protein}g</div>
					<div class="macro-lbl">P</div>
				</div>
				<div class="macro-box">
					<div class="macro-val">{meals[2].macros.carbs}g</div>
					<div class="macro-lbl">C</div>
				</div>
				<div class="macro-box">
					<div class="macro-val">{meals[2].macros.fat}g</div>
					<div class="macro-lbl">L</div>
				</div>
			</div>
			<div class="meal-arrow">Modifier →</div>
		</a>
	</div>
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

	.week-header {
		font-size: 0.7rem;
		font-weight: 600;
		color: #f0ede8;
	}

	.week-sub {
		font-size: 0.55rem;
		color: #c9a84c;
		margin-top: 2px;
	}

	.week-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		padding: 10px 12px;
	}

	.day-btn {
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
