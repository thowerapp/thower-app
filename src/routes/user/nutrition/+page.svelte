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
		background: #0a0a0a;
		flex-shrink: 0;
		gap: 12px;
		border-bottom: 1px solid rgba(201, 168, 76, 0.15);
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #c9a84c;
		font-size: 0.62rem;
		font-weight: 400;
	}

	.back-arrow {
		font-size: 0.75rem;
		color: #c9a84c;
	}

	.back-txt {
		font-weight: 400;
	}

	.page-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #f0ede8;
		margin-left: auto;
		font-family: 'Bebas Neue', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		background: #0a0a0a;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px 16px;
		border-bottom: 1px solid rgba(240, 237, 232, 0.08);
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		transition: all 0.1s;
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-item:active {
		background: rgba(201, 168, 76, 0.08);
	}

	.item-icon {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #c9a84c;
		font-size: 1rem;
		flex-shrink: 0;
		border-radius: 3px;
		color: #0a0a0a;
	}

	.item-body {
		flex: 1;
		min-width: 0;
	}

	.item-title {
		font-size: 0.68rem;
		font-weight: 600;
		color: #f0ede8;
		letter-spacing: -0.01em;
	}

	.item-sub {
		font-size: 0.54rem;
		color: rgba(240, 237, 232, 0.5);
		margin-top: 3px;
		line-height: 1.3;
	}

	.item-arrow {
		font-size: 0.9rem;
		color: #c9a84c;
		flex-shrink: 0;
		font-weight: 300;
	}
</style>
