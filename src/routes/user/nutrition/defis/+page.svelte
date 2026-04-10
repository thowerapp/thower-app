<script lang="ts">
</script>

<div class="back-row">
	<a href="/user/nutrition" class="back-link">
		<div class="back-arrow">←</div>
		<span class="back-txt">Nutrition</span>
	</a>
</div>

<div class="sec-head">
	<div class="sh-title">Défis & Objectifs</div>
	<div class="sh-sub">Suive ton progrès</div>
</div>

<div class="defis-menu">
	<a href="/user/nutrition/defi-30-jours" class="defi-item">
		<div class="defi-icon">🏆</div>
		<div class="defi-info">
			<div class="defi-title">Défi 30 jours</div>
			<div class="defi-progress">Jour 5 / 30</div>
		</div>
		<div class="defi-bar">
			<div class="defi-fill" style="width: 17%"></div>
		</div>
		<div class="defi-arrow">→</div>
	</a>

	<a href="/user/nutrition/jeune" class="defi-item">
		<div class="defi-icon">⏱</div>
		<div class="defi-info">
			<div class="defi-title">Jeûne intermittent</div>
			<div class="defi-progress">Configuration</div>
		</div>
		<div class="defi-bar"></div>
		<div class="defi-arrow">→</div>
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

	.defis-menu {
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	.defi-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		border-bottom: 1px solid #eee;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.defi-item:hover {
		background: #f9f9f9;
	}

	.defi-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.defi-info {
		flex: 1;
		min-width: 0;
	}

	.defi-title {
		font-size: 0.65rem;
		font-weight: 600;
		color: #111;
	}

	.defi-progress {
		font-size: 0.55rem;
		color: #999;
		margin-top: 2px;
	}

	.defi-bar {
		width: 40px;
		height: 4px;
		background: #ddd;
		border-radius: 2px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.defi-fill {
		height: 100%;
		background: #333;
		border-radius: 2px;
	}

	.defi-arrow {
		font-size: 0.7rem;
		color: #ccc;
		flex-shrink: 0;
	}
</style>
