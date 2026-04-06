<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="sec-head">
	<div class="sh-title">Sport</div>
	<div class="sh-sub">Calendrier · Séances</div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-circle-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Semaine 4</div>
		<div class="li-sub">Jour 21 / 91</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<style>
	.sec-head { padding: 12px 18px 8px; border-bottom: 1px solid rgba(201, 168, 76, 0.15); }
	.sh-title { font-size: 0.72rem; font-weight: 600; color: #f0ede8; font-family: 'Bebas Neue', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; }
	.sh-sub { font-size: 0.56rem; color: #c9a84c; margin-top: 2px; font-family: 'DM Sans', sans-serif; }

	.list-item { display: flex; align-items: center; gap: 12px; padding: 11px 18px; border-bottom: 1px solid rgba(240, 237, 232, 0.08); cursor: pointer; }
	.li-thumb { width: 36px; height: 36px; background: rgba(201, 168, 76, 0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
	.li-body { flex: 1; min-width: 0; }
	.li-title { font-size: 0.7rem; font-weight: 500; color: #f0ede8; }
	.li-sub { font-size: 0.55rem; color: rgba(240, 237, 232, 0.5); margin-top: 2px; }
	.li-right { flex-shrink: 0; display: flex; align-items: center; }
	.arrow-right { width: 6px; height: 6px; border-right: 1.5px solid #c9a84c; border-top: 1.5px solid #c9a84c; transform: rotate(45deg); }
	.shape-circle-sm { width: 14px; height: 14px; border-radius: 50%; background: #c9a84c; flex-shrink: 0; }
</style>
