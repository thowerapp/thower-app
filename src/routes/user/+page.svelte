<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<!-- Notif séance -->
<div class="notif-banner">
	<div class="notif-dot"></div>
	<div class="notif-body">
		<div class="notif-title">Séance du jour en attente</div>
		<div class="notif-sub">Muscu · Corps entier · 30 min — pas encore validée aujourd'hui</div>
	</div>
	<div class="notif-cta">Commencer</div>
</div>

<!-- Programme -->
<div class="sec-head" style="margin-top: 4px">
	<div class="sh-title">Mon programme</div>
	<div class="sh-sub">Jour 21 / 91</div>
</div>
<div class="split-cards">
	<a href="/user/sport" class="split-card">
		<div class="sc-shape"><div class="shape-circle"></div></div>
		<div class="sc-label">Sport</div>
		<div class="sc-sub">Calendrier · Séances</div>
	</a>
	<a href="/user/nutrition" class="split-card">
		<div class="sc-shape"><div class="shape-square"></div></div>
		<div class="sc-label">Nutrition</div>
		<div class="sc-sub">Cadencier · Recettes</div>
	</a>
</div>

<!-- À la une -->
<div class="sec-head">
	<div class="sh-title">À la une</div>
</div>
<div class="list-item">
	<div class="li-thumb"><div class="shape-circle-sm"></div></div>
	<div class="li-body">
		<div class="li-title">La méthode Thower</div>
		<div class="li-sub">Vidéo principale</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>
<div class="list-item">
	<div class="li-thumb"><div class="shape-square-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Élastiques &amp; Matériel</div>
		<div class="li-sub">Partenaires · Achats</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<style>
	.notif-banner {
		margin: 10px 18px 0;
		border: 1px solid #111;
		padding: 10px 12px;
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
	}
	.notif-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #111;
		flex-shrink: 0;
	}
	.notif-body {
		flex: 1;
	}
	.notif-title {
		font-size: 0.65rem;
		font-weight: 600;
		color: #111;
	}
	.notif-sub {
		font-size: 0.55rem;
		color: #666;
		margin-top: 2px;
		line-height: 1.4;
	}
	.notif-cta {
		font-size: 0.58rem;
		font-weight: 600;
		color: #111;
		text-decoration: underline;
		white-space: nowrap;
		flex-shrink: 0;
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

	.split-cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding: 12px 18px;
	}
	.split-card {
		background: #f5f5f5;
		border: 1px solid #e0e0e0;
		padding: 16px 14px;
		cursor: pointer;
		transition: background 0.12s;
		text-decoration: none;
		color: inherit;
		display: block;
	}
	.split-card:hover {
		background: #ebebeb;
	}
	.sc-shape {
		margin-bottom: 12px;
	}
	.sc-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: #111;
	}
	.sc-sub {
		font-size: 0.56rem;
		color: #aaa;
		margin-top: 4px;
	}

	.shape-circle {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #111;
	}
	.shape-square {
		width: 18px;
		height: 18px;
		background: #111;
	}
	.shape-circle-sm {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #555;
		flex-shrink: 0;
	}
	.shape-square-sm {
		width: 13px;
		height: 13px;
		background: #555;
		flex-shrink: 0;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 18px;
		border-bottom: 1px solid #f0f0f0;
		cursor: pointer;
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
