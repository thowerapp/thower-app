<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	$: weekNum = Math.ceil((data.dayIndex || 5) / 7);
	$: today = data.dayIndex || 21;
	$: todayName = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][(today - 1) % 7];

	function getDayName(dayNum: number) {
		const names = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
		return names[(dayNum - 1) % 7];
	}

	function getDayNum(dayNum: number) {
		return ((dayNum - 1) % 7) + 1;
	}
</script>

<div class="back-row">
	<a href="/user" class="home-btn">← Accueil</a>
	<div class="page-title">Cadencier</div>
</div>

<div class="week-info">
	<div class="week-header">Semaine {weekNum} / 13</div>
	<div class="week-sub">91 jours · Appuie un jour pour planifier tes repas</div>
</div>

<div class="week-grid">
	{#each Array(7) as _, i}
		{@const dayNum = (weekNum - 1) * 7 + i + 1}
		<a href="/user/nutrition/cadencier/{dayNum}" class="day-btn" class:active={dayNum === today}>
			<div class="day-name">{getDayName(dayNum)}</div>
			<div class="day-num">{getDayNum(dayNum)}</div>
		</a>
	{/each}
</div>

<div class="today-section">
	<div class="today-header">{todayName} {getDayNum(today)}</div>
	<div class="today-sub">{data.todayMeals?.length || 2} repas</div>
</div>

<div class="meal-card">
	<div class="meal-label">Repas 1 — Déjeuner</div>
	<div class="meal-status">Salade niçoise revisitée</div>
	<a href="/user/nutrition/cadencier/{today}" class="meal-arrow">›</a>
</div>

<div class="meal-card">
	<div class="meal-label">Repas 2 — Dîner</div>
	<div class="meal-status">Non planifié — Appuyer pour choisir</div>
	<a href="/user/nutrition/cadencier/{today}" class="meal-arrow">›</a>
</div>

<style>
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 18px;
		background: #111;
		flex-shrink: 0;
		gap: 12px;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #aaa;
		font-size: 0.65rem;
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #fff;
		font-size: 0.7rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		transition: all 0.15s;
	}

	.home-btn:active {
		background: rgba(255, 255, 255, 0.2);
	}

	.back-arrow {
		font-size: 0.8rem;
	}

	.page-title {
		font-size: 0.75rem;
		font-weight: 700;
		color: #fff;
		margin-left: auto;
	}

	.week-info {
		padding: 14px 18px;
		background: #f5f5f5;
		border-bottom: 1px solid #eee;
	}

	.week-header {
		font-size: 0.7rem;
		font-weight: 600;
		color: #111;
	}

	.week-sub {
		font-size: 0.55rem;
		color: #888;
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
		background: #f5f5f5;
		border: 1px solid #ddd;
		border-radius: 4px;
		text-decoration: none;
		color: #111;
		cursor: pointer;
		transition: all 0.15s;
		font-weight: 500;
	}

	.day-btn:active {
		background: #eee;
	}

	.day-btn.active {
		background: #111;
		color: #fff;
		border-color: #111;
	}

	.day-name {
		font-size: 0.5rem;
		color: #666;
		margin-bottom: 2px;
	}

	.day-btn.active .day-name {
		color: #999;
	}

	.day-num {
		font-size: 0.75rem;
		font-weight: 700;
	}

	.today-section {
		padding: 14px 18px;
		background: #f9f9f9;
		border-bottom: 1px solid #eee;
	}

	.today-header {
		font-size: 0.7rem;
		font-weight: 600;
		color: #111;
	}

	.today-sub {
		font-size: 0.55rem;
		color: #888;
		margin-top: 2px;
	}

	.meal-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 18px;
		border-bottom: 1px solid #eee;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: all 0.15s;
	}

	.meal-card:active {
		background: #fafafa;
	}

	.meal-label {
		font-size: 0.65rem;
		font-weight: 500;
		color: #666;
	}

	.meal-status {
		flex: 1;
		font-size: 0.65rem;
		font-weight: 500;
		color: #111;
	}

	.meal-arrow {
		font-size: 1.2rem;
		color: #bbb;
		text-decoration: none;
	}
</style>
