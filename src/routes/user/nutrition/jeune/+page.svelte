<script lang="ts">
</script>

<div class="back-row">
	<a href="/user/nutrition" class="back-link">
		<div class="back-arrow">←</div>
		<span class="back-txt">Nutrition</span>
	</a>
</div>

<div class="content">
	<div class="empty-state">
		<div class="icon">⏱</div>
		<div class="title">Jeûne intermittent</div>
		<div class="subtitle">Configuration de tes périodes de jeûne</div>
	</div>
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

	.content {
		padding: 40px 18px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
		padding: 60px 20px;
	}

	.icon {
		font-size: 48px;
		opacity: 0.3;
	}

	.title {
		font-size: 0.7rem;
		font-weight: 500;
		color: #111;
	}

	.subtitle {
		font-size: 0.55rem;
		color: #aaa;
		text-align: center;
	}
</style>
