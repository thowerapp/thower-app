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
	.sec-head { padding: 12px 18px 8px; border-bottom: 1px solid #eee; }
	.sh-title { font-size: 0.72rem; font-weight: 600; color: #111; }
	.sh-sub { font-size: 0.56rem; color: #aaa; margin-top: 2px; }

	.stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 12px 18px 6px; }
	.stat-box { background: #f5f5f5; border: 1px solid #eee; padding: 10px 6px; text-align: center; }
	.sb-val { font-size: 1rem; font-weight: 700; color: #111; }
	.sb-lbl { font-size: 0.5rem; color: #aaa; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
