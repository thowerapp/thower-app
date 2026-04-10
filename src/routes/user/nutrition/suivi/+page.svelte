<script lang="ts">
</script>

<div class="back-row">
	<a href="/user/nutrition" class="back-link">
		<div class="back-arrow">←</div>
		<span class="back-txt">Nutrition</span>
	</a>
</div>

<div class="sec-head">
	<div class="sh-title">Suivi nutritionnel</div>
	<div class="sh-sub">Poids · Macros · Calories</div>
</div>

<div class="suivi-menu">
	<a href="/user/nutrition/suivi-poids" class="suivi-item">
		<div class="suivi-icon">⚖️</div>
		<div class="suivi-info">
			<div class="suivi-title">Suivi poids</div>
			<div class="suivi-sub">Enregistre ta progression</div>
		</div>
		<div class="suivi-arrow">→</div>
	</a>

	<a href="/user/nutrition/suivi-poids-historique" class="suivi-item">
		<div class="suivi-icon">📊</div>
		<div class="suivi-info">
			<div class="suivi-title">Historique poids</div>
			<div class="suivi-sub">Visualise ta courbe</div>
		</div>
		<div class="suivi-arrow">→</div>
	</a>

	<a href="/user/nutrition/suivi-macros" class="suivi-item">
		<div class="suivi-icon">🔥</div>
		<div class="suivi-info">
			<div class="suivi-title">Suivi Calories/Macros</div>
			<div class="suivi-sub">Analyse ta consommation</div>
		</div>
		<div class="suivi-arrow">→</div>
	</a>
</div>

<style>
	.back-row {
		display: flex;
		align-items: center;
		padding: 10px 18px;
		background: #f9f9f9;
		flex-shrink: 0;
		border-bottom: 1px solid #eee;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: #666;
	}

	.back-arrow {
		font-size: 0.7rem;
	}

	.back-txt {
		font-size: 0.65rem;
		font-weight: 500;
	}

	.sec-head {
		padding: 12px 18px 8px;
		background: #fafafa;
		border-bottom: 1px solid #eee;
	}

	.sh-title {
		font-size: 0.7rem;
		font-weight: 600;
		color: #111;
	}

	.sh-sub {
		font-size: 0.55rem;
		color: #999;
		margin-top: 2px;
	}

	.suivi-menu {
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	.suivi-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		border-bottom: 1px solid #eee;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.suivi-item:hover {
		background: #f9f9f9;
	}

	.suivi-icon {
		font-size: 1.2rem;
		flex-shrink: 0;
	}

	.suivi-info {
		flex: 1;
		min-width: 0;
	}

	.suivi-title {
		font-size: 0.65rem;
		font-weight: 600;
		color: #111;
	}

	.suivi-sub {
		font-size: 0.55rem;
		color: #999;
		margin-top: 2px;
	}

	.suivi-arrow {
		font-size: 0.7rem;
		color: #ccc;
		flex-shrink: 0;
	}
</style>
