<script lang="ts">
import { fireElement } from '$lib/utils/particles';
function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement, e); }
</script>

<div class="u-back-row">
	<a href="/user" class="u-back-lnk" onclick={fire}>
		<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
		<span class="u-back-lbl">Accueil</span>
	</a>
	<div class="u-back-head">Nutrition</div>
</div>

<div class="u-hero">
	<div class="u-hero-top">
		<div>
			<div class="u-hero-title">Nutrition</div>
			<div class="u-hero-sub">Cadencier · Recettes · Courses</div>
		</div>
		<svg class="u-logo-svg" viewBox="0 0 44 38" fill="none">
			<polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
			<polygon points="22,2 42,36 22,24" fill="#3A2810"/>
		</svg>
	</div>
</div>

<a href="/user/nutrition/cadencier" class="u-li" onclick={fire}>
	<div class="u-li-th"><div style="width:10px;height:10px;background:var(--g)"></div></div>
	<div class="u-li-b"><div class="u-li-t">Cadencier libre</div><div class="u-li-s">91 jours · 3 repas/jour · Génération automatique</div></div>
	<div class="u-li-r"><div class="u-arr"></div></div>
</a>

<a href="/user/nutrition/courses" class="u-li" onclick={fire}>
	<div class="u-li-th"><div style="width:10px;height:10px;border-radius:50%;background:var(--cy)"></div></div>
	<div class="u-li-b"><div class="u-li-t">Liste de courses</div><div class="u-li-s">Générée depuis ton planning repas</div></div>
	<div class="u-li-r"><div class="u-arr"></div></div>
</a>

<a href="/user/nutrition/recettes" class="u-li" onclick={fire}>
	<div class="u-li-th"><div style="width:10px;height:10px;border-radius:50%;background:var(--cy)"></div></div>
	<div class="u-li-b"><div class="u-li-t">Bibliothèque recettes</div><div class="u-li-s">Recettes Thower + Mes recettes</div></div>
	<div class="u-li-r"><div class="u-arr"></div></div>
</a>

<a href="/user/nutrition/recettes/create" class="u-li" onclick={fire}>
	<div class="u-li-th"><div style="width:10px;height:10px;background:var(--cy)"></div></div>
	<div class="u-li-b"><div class="u-li-t">Créer une recette</div><div class="u-li-s">Ajoute ta propre recette personnalisée</div></div>
	<div class="u-li-r"><div class="u-arr"></div></div>
</a>
