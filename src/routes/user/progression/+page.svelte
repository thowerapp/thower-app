<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="sec-head">
	<div class="sh-title">Progression</div>
	<div class="sh-sub">Semaine 4 · Niveau 3</div>
</div>

<div class="stats-row">
	<div class="stat-box"><div class="sb-val">340</div><div class="sb-lbl">Points</div></div>
	<div class="stat-box"><div class="sb-val">12</div><div class="sb-lbl">Séances</div></div>
	<div class="stat-box"><div class="sb-val">87%</div><div class="sb-lbl">Score</div></div>
</div>

<style>
	.sec-head { padding: 12px 18px 8px; border-bottom: 1px solid rgba(201, 168, 76, 0.15); }
	.sh-title { font-size: 0.72rem; font-weight: 600; color: #f0ede8; font-family: 'Bebas Neue', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
	.sh-sub { font-size: 0.56rem; color: #c9a84c; margin-top: 2px; font-family: 'DM Sans', sans-serif; }

	.stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 12px 18px 6px; }
	.stat-box { background: rgba(201, 168, 76, 0.1); border: 1px solid #c9a84c; padding: 10px 6px; text-align: center; }
	.sb-val { font-size: 1rem; font-weight: 700; color: #f0ede8; }
	.sb-lbl { font-size: 0.5rem; color: #c9a84c; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-family: 'DM Sans', sans-serif; }
</style>
