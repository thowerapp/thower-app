<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="hero">
	<div class="hero-brand">
		<div class="hero-title">Progression</div>
		<div class="hero-sub">Semaine 4 · Niveau 3</div>
	</div>
</div>

<div class="stats-row">
	<div class="stat-box">
		<div class="sb-val">340</div>
		<div class="sb-lbl">Points</div>
	</div>
	<div class="stat-box">
		<div class="sb-val">12</div>
		<div class="sb-lbl">Séances</div>
	</div>
	<div class="stat-box">
		<div class="sb-val">87%</div>
		<div class="sb-lbl">Score</div>
	</div>
</div>

<div class="sec-head">
	<div class="sh-title">Statut actuel</div>
	<div class="sh-sub">Basé sur 87% des points obtenus</div>
</div>

<div class="bilan-card">
	<div style="font-size: 0.62rem; font-weight: 700; color: #111; letter-spacing: 0.04em; text-transform: uppercase;">Bambou Furieux</div>
	<div style="font-size: 0.52rem; color: #aaa; margin-top: 4px;">86% → 90% des points possibles · Prochain : Guerrier en devenir</div>
	<div style="margin-top: 10px; height: 4px; background: #e8e8e8;">
		<div style="height: 4px; background: #111; width: 72%;"></div>
	</div>
	<div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.46rem; color: #bbb;">
		<span>86%</span>
		<span style="color: #111; font-weight: 600;">87% (toi)</span>
		<span>90%</span>
	</div>
</div>

<div class="sec-head">
	<div class="sh-title">Mes badges</div>
	<div class="sh-sub">2 obtenus · 3 en cours</div>
</div>

<div class="list-item">
	<div class="li-thumb" style="background: #111;">
		<div style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #555;"></div>
	</div>
	<div class="li-body">
		<div class="li-title">7 jours sans rater une séance</div>
		<div class="li-sub">6 / 7 — Plus qu'un jour !</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb" style="background: #111;">
		<div style="width: 14px; height: 14px; border: 2px solid #555;"></div>
	</div>
	<div class="li-body">
		<div class="li-title">21 respirations faites d'affilée</div>
		<div class="li-sub">Obtenu ✓</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb">
		<div style="width: 14px; height: 14px; border-radius: 50%; background: #ccc;"></div>
	</div>
	<div class="li-body">
		<div class="li-title" style="color: #bbb;">3 semaines sans soda</div>
		<div class="li-sub">En cours · Semaine 2/3</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<style>
	.hero {
		background: #111;
		padding: 20px 18px;
	}

	.hero-brand {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.hero-title {
		font-size: 1.6rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.hero-sub {
		font-size: 0.6rem;
		color: #666;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.stats-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
		padding: 12px 18px 6px;
	}

	.stat-box {
		background: #f5f5f5;
		border: 1px solid #eee;
		padding: 10px 6px;
		text-align: center;
	}

	.sb-val {
		font-size: 1rem;
		font-weight: 700;
		color: #111;
	}

	.sb-lbl {
		font-size: 0.5rem;
		color: #aaa;
		margin-top: 2px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sec-head {
		padding: 12px 18px 8px;
		border-bottom: 1px solid #eee;
	}

	.sh-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #111;
	}

	.sh-sub {
		font-size: 0.56rem;
		color: #aaa;
		margin-top: 2px;
	}

	.bilan-card {
		margin: 12px 18px;
		padding: 14px;
		background: #f5f5f5;
		border: 1px solid #eee;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 18px;
		border-bottom: 1px solid #f0f0f0;
		cursor: pointer;
		transition: background 0.1s;
	}

	.list-item:hover {
		background: #fafafa;
	}

	.li-thumb {
		width: 36px;
		height: 36px;
		background: #e8e8e8;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.li-body {
		flex: 1;
		min-width: 0;
	}

	.li-title {
		font-size: 0.7rem;
		font-weight: 500;
		color: #111;
	}

	.li-sub {
		font-size: 0.55rem;
		color: #aaa;
		margin-top: 2px;
	}

	.li-right {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.arrow-right {
		width: 6px;
		height: 6px;
		border-right: 1.5px solid #bbb;
		border-top: 1.5px solid #bbb;
		transform: rotate(45deg);
	}
</style>
