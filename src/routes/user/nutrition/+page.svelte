<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<div class="sec-head">
	<div class="sh-title">Nutrition</div>
	<div class="sh-sub">Cadencier · Recettes</div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-square-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Cadencier libre</div>
		<div class="li-sub">91 jours · 2 repas/jour</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-circle-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Recettes</div>
		<div class="li-sub">Bibliothèque · Préférées</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<style>
	.sec-head { padding: 12px 18px 8px; border-bottom: 1px solid #eee; }
	.sh-title { font-size: 0.72rem; font-weight: 600; color: #111; }
	.sh-sub { font-size: 0.56rem; color: #aaa; margin-top: 2px; }

	.list-item { display: flex; align-items: center; gap: 12px; padding: 11px 18px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
	.li-thumb { width: 36px; height: 36px; background: #e8e8e8; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
	.li-body { flex: 1; min-width: 0; }
	.li-title { font-size: 0.7rem; font-weight: 500; color: #111; }
	.li-sub { font-size: 0.55rem; color: #aaa; margin-top: 2px; }
	.li-right { flex-shrink: 0; display: flex; align-items: center; }
	.arrow-right { width: 6px; height: 6px; border-right: 1.5px solid #bbb; border-top: 1.5px solid #bbb; transform: rotate(45deg); }
	.shape-circle-sm { width: 14px; height: 14px; border-radius: 50%; background: #555; flex-shrink: 0; }
	.shape-square-sm { width: 13px; height: 13px; background: #555; flex-shrink: 0; }
</style>
