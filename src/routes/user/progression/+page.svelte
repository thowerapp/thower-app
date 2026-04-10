<script lang="ts">
import { fireElement } from '$lib/utils/particles';
function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement); }
</script>

<div class="u-back-row">
  <a href="/user" class="u-back-lnk">
    <svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="u-back-lbl">Accueil</span>
  </a>
  <div class="u-back-head">Progression</div>
</div>

<div class="u-hero">
  <div class="u-hero-top">
    <div>
      <div class="u-hero-title">Progression</div>
      <div class="u-hero-sub">Semaine 4 · Niveau 3</div>
    </div>
    <svg class="logo-svg" viewBox="0 0 44 38" fill="none">
      <polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
      <polygon points="22,2 42,36 22,24" fill="#3A2810"/>
    </svg>
  </div>
</div>

<div class="u-stats-row">
  <div class="u-sbox"><div class="u-sv">340</div><div class="u-sl">Points</div></div>
  <div class="u-sbox"><div class="u-sv">12</div><div class="u-sl">Séances</div></div>
  <div class="u-sbox"><div class="u-sv">87%</div><div class="u-sl">Score</div></div>
</div>

<div class="status-card">
  <div class="stat-name">Bambou Furieux</div>
  <div class="stat-sub">86% → 90% · Prochain : Guerrier en devenir</div>
  <div class="progbar"><div class="progfill"></div></div>
  <div class="prog-labels">
    <span>86%</span>
    <span class="prog-you">87% — toi</span>
    <span>90%</span>
  </div>
</div>

<div class="u-sh"><div class="u-sh-t">Mes badges</div><div class="u-sh-s">2 obtenus · 3 en cours</div></div>

<button type="button" class="u-li" onclick={fire}>
  <div class="u-li-th" style="border-color:var(--g)"><div style="width:9px;height:9px;border-radius:50%;border:1.5px solid var(--g)"></div></div>
  <div class="u-li-b"><div class="u-li-t">7 jours sans rater</div><div class="u-li-s">6 / 7 — Plus qu'un jour !</div></div>
  <div class="u-li-r"><div class="u-arr"></div></div>
</button>
<button type="button" class="u-li" onclick={fire}>
  <div class="u-li-th" style="background:var(--gd)"><div style="width:9px;height:9px;border:1.5px solid var(--gb)"></div></div>
  <div class="u-li-b"><div class="u-li-t">21 respirations d'affilée</div><div class="u-li-s" style="color:var(--g)">Obtenu ✓</div></div>
</button>
<button type="button" class="u-li" style="opacity:.5" onclick={fire}>
  <div class="u-li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
  <div class="u-li-b"><div class="u-li-t">3 semaines sans soda</div><div class="u-li-s">En cours · Semaine 2/3</div></div>
  <div class="u-li-r"><div class="u-arr"></div></div>
</button>

<div class="u-sh"><div class="u-sh-t">Photos du mois</div></div>
<div class="photo-grid">
  <!-- Face déjà prise -->
  <button type="button" class="pcell filled" onclick={fire}>
    <div class="pc-plus" style="color:var(--g)">+</div>
    <div class="pc-lbl" style="color:var(--g)">Face ✓</div>
  </button>
  <!-- Profil + Dos = manquantes → pending flames -->
  <button type="button" class="pcell pending" onclick={fire}>
    <div class="pc-plus">+</div>
    <div class="pc-lbl">Profil</div>
  </button>
  <button type="button" class="pcell pending" onclick={fire}>
    <div class="pc-plus">+</div>
    <div class="pc-lbl">Dos</div>
  </button>
</div>

<style>
.logo-svg { width:40px; height:34px; opacity:.5; flex-shrink:0; }

/* Carte de statut / progression — unique à cette page */
.status-card { margin:10px 18px; padding:13px; background:var(--s2); border:1px solid var(--br2); animation:gbtn 2.5s ease-in-out infinite; }
.stat-name { font-family:var(--fh2); font-size:1.25rem; color:var(--gb); letter-spacing:.06em; text-shadow:0 0 10px var(--gg); }
.stat-sub { font-size:.5rem; color:var(--txd); margin-top:3px; font-family:var(--fb); }
.progbar { margin-top:10px; height:3px; background:var(--br2); }
.progfill { height:3px; background:linear-gradient(90deg,var(--gd),var(--gb)); width:72%; box-shadow:0 0 8px var(--gg); }
.prog-labels { display:flex; justify-content:space-between; margin-top:4px; font-size:.44rem; color:var(--txd); font-family:var(--fb); }
.prog-you { color:var(--g); font-weight:600; }

/* Grille photos — unique à cette page */
.photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; padding:10px 18px 20px; }
.pcell { aspect-ratio:3/4; background:var(--s2); border:1px dashed var(--br2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; -webkit-tap-highlight-color:transparent; cursor:pointer; }
.pcell:active { background:var(--s3); border-color:var(--gd); }
.pcell.filled { border:1px solid var(--br2); }
.pc-plus { font-size:.85rem; color:var(--txd); }
.pc-lbl { font-size:.44rem; color:var(--txd); text-align:center; font-family:var(--fb); }
</style>
