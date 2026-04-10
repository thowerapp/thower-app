<script lang="ts">
import type { PageData } from './$types';
import { fireElement } from '$lib/utils/particles';
let { data } = $props<{ data: PageData }>();
function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement); }
</script>

<div class="u-back-row">
  <a href="/user" class="u-back-lnk" onclick={fire}>
    <svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="u-back-lbl">Accueil</span>
  </a>
  <div class="u-back-head">Sport</div>
</div>

<div class="u-sh"><div class="u-sh-t">Semaine 4</div><div class="u-sh-s">3 séances A→B→C</div></div>

<div class="u-sport-week">
  <div class="u-sd done"><div class="u-sd-n">Lun</div><div class="u-sd-d">18</div><div class="u-sd-b" style="color:var(--g)">A✓</div></div>
  <div class="u-sd done"><div class="u-sd-n">Mar</div><div class="u-sd-d">19</div><div class="u-sd-b" style="color:var(--g)">B✓</div></div>
  <div class="u-sd" style="opacity:.3"><div class="u-sd-n">Mer</div><div class="u-sd-d" style="color:var(--txd)">20</div><div class="u-sd-b" style="color:var(--txd)">—</div></div>
  <!-- Aujourd'hui = pending, el reçoit les flammes -->
  <a href="/user/sport/seance" class="u-sd today pending" onclick={fire}>
    <div class="u-sd-n" style="color:var(--txd)">Jeu</div>
    <div class="u-sd-d">21</div>
    <!-- pin-dot gomette sur la cellule du jour -->
    <div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
  </a>
  <div class="u-sd placed"><div class="u-sd-n">Ven</div><div class="u-sd-d">22</div><div class="u-sd-b" style="color:var(--txd)">★</div></div>
  <div class="u-sd free"><div class="u-sd-n">Sam</div><div class="u-sd-d">23</div><div class="u-sd-b" style="color:var(--txm)">+</div></div>
  <div class="u-sd free"><div class="u-sd-n">Dim</div><div class="u-sd-d">24</div><div class="u-sd-b" style="color:var(--txm)">+</div></div>
</div>

<div class="u-sh"><div class="u-sh-t">Séances semaine 4</div></div>

<div class="u-li" style="opacity:.4">
  <div class="u-li-th" style="background:var(--gd)"><span style="font-size:.625rem;font-weight:700;color:var(--gb);font-family:var(--fh2)">A</span></div>
  <div class="u-li-b"><div class="u-li-t">Séance A — Lundi 18</div><div class="u-li-s" style="color:var(--g)">Validée ✓ · +50 pts</div></div>
</div>
<div class="u-li" style="opacity:.4">
  <div class="u-li-th" style="background:var(--gd)"><span style="font-size:.625rem;font-weight:700;color:var(--gb);font-family:var(--fh2)">B</span></div>
  <div class="u-li-b"><div class="u-li-t">Séance B — Mardi 19</div><div class="u-li-s" style="color:var(--g)">Validée ✓ · +50 pts</div></div>
</div>
<!-- Séance C = pending, flammes + glow -->
<a href="/user/sport/seance" class="u-li li-cta pending" onclick={fire}>
  <div class="u-li-th" style="background:var(--g)"><span style="font-size:.625rem;font-weight:700;color:var(--s1);font-family:var(--fh2)">C</span></div>
  <div class="u-li-b"><div class="u-li-t">Séance C — Aujourd'hui</div><div class="u-li-s">+50 pts à gagner</div></div>
  <div class="u-li-r"><div class="u-arr"></div></div>
</a>

<style>
/* Surcharges spécifiques sport */
.u-sd.today { animation: gpulse 2.5s ease-in-out infinite; }
.li-cta { border-left: 2px solid var(--g); }
</style>

