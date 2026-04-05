<script lang="ts">
</script>

<div class="back-row">
	<a href="/user" class="back-link">
		<div class="back-arrow">←</div>
		<span class="back-txt">Accueil</span>
	</a>
	<div class="page-title">Nutrition</div>
</div>

<div class="menu-list">
	<a href="/user/nutrition/cadencier" class="menu-item">
		<div class="item-icon">■</div>
		<div class="item-body">
			<div class="item-title">Cadencier libre</div>
			<div class="item-sub">91 jours · 2 repas/jour · Génération automatique</div>
		</div>
		<div class="item-arrow">›</div>
	</a>

	<a href="/user/nutrition/courses" class="menu-item">
		<div class="item-icon">●</div>
		<div class="item-body">
			<div class="item-title">Liste de courses</div>
			<div class="item-sub">Générée depuis ton planning repas</div>
		</div>
		<div class="item-arrow">›</div>
	</a>

	<a href="/user/nutrition/recettes" class="menu-item">
		<div class="item-icon">●</div>
		<div class="item-body">
			<div class="item-title">Bibliothèque recettes</div>
			<div class="item-sub">Recettes Thower + Mes recettes</div>
		</div>
		<div class="item-arrow">›</div>
	</a>

	<a href="/user/nutrition/recettes" class="menu-item">
		<div class="item-icon">■</div>
		<div class="item-body">
			<div class="item-title">Créer une recette</div>
			<div class="item-sub">Recettes personnalisées</div>
		</div>
		<div class="item-arrow">›</div>
	</a>

	<a href="/user/nutrition/jeune" class="menu-item">
		<div class="item-icon">●</div>
		<div class="item-body">
			<div class="item-title">Jeûne intermittent</div>
			<div class="item-sub">50/50 · 30/35/35</div>
		</div>
		<div class="item-arrow">›</div>
	</a>
</div>

<style>
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #111;
		flex-shrink: 0;
		gap: 12px;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #888;
		font-size: 0.62rem;
		font-weight: 400;
	}

	.back-arrow {
		font-size: 0.75rem;
		color: #888;
	}

	.back-txt {
		font-weight: 400;
	}

	.page-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #fff;
		margin-left: auto;
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		background: #fff;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 16px;
		border-bottom: 1px solid #f0f0f0;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: all 0.1s;
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-item:active {
		background: #f8f8f8;
	}

	.item-icon {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #d5d5d5;
		font-size: 1rem;
		flex-shrink: 0;
		border-radius: 3px;
		color: #999;
	}

	.item-body {
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-size: 0.68rem;
		font-weight: 600;
		color: #222;
		letter-spacing: -0.01em;
	}

	.item-sub {
		font-size: 0.54rem;
		color: #888;
		margin-top: 3px;
		line-height: 1.3;
	}

	.item-arrow {
		font-size: 0.9rem;
		color: #ccc;
		flex-shrink: 0;
		font-weight: 300;
	}
</style>
