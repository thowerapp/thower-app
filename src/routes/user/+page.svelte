<script lang="ts">
import type { PageData, LayoutData } from './$types';
import EmberCanvas from '$lib/components/EmberCanvas.svelte';
import { fireElement } from '$lib/utils/particles';
import { page } from '$app/stores';

let { data } = $props<{ data: PageData }>();

// Récupère les pending depuis le layout (passés via $page.data)
const pending = $derived(($page.data as { pending?: LayoutData['pending'] })?.pending ?? { seance: false, tasks: 0, repas: false, photos: false, journee: false });

function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement); }
</script>

<!-- Hero immersif -->
<div class="home-hero">
  <EmberCanvas active={pending.journee || pending.seance} />
  <!-- Fond de profondeur : triangles flous -->
  <div class="hh-depth" aria-hidden="true">
    <svg class="hh-tri1" viewBox="0 0 44 38" fill="none"><polygon points="22,2 42,36 2,36" fill="rgba(201,168,78,0.07)"/></svg>
    <svg class="hh-tri2" viewBox="0 0 44 38" fill="none"><polygon points="22,2 42,36 22,24" fill="rgba(201,168,78,0.04)"/></svg>
  </div>
  <div class="hh-inner">
    <div class="hh-top">
      <div>
        <div class="hh-eyebrow">Jour {data?.currentDayIndex ?? 21} / 91</div>
        <div class="hh-title">Thower</div>
        <div class="hh-sub">Semaine 4 · Programme Méthode</div>
      </div>
      <a href="/user/parametres/profil" class="pbtn">
        <div class="pbtn-sq"></div>
        <div class="npip"></div>
      </a>
    </div>
    <div class="hh-pills">
      <a href="/user/journee" class="u-hpill" class:pending={pending.journee}>Aujourd'hui</a>
    </div>
  </div>
</div>

<!-- Notification séance -->
{#if pending.seance}
<a href="/user/sport" class="u-notif-banner pending" onclick={fire}>
  <EmberCanvas active={true} />
  <div class="u-ndot"></div>
  <div class="u-nb">
    <div class="u-nb-t">Séance du jour en attente</div>
    <div class="u-nb-s">Muscu · Corps entier · 30 min</div>
  </div>
  <div class="u-ncta">Commencer →</div>
</a>
{:else}
<a href="/user/sport" class="u-notif-banner">
  <div class="u-ndot" style="background:var(--g);animation:none;opacity:.4"></div>
  <div class="u-nb">
    <div class="u-nb-t">Séance du jour validée ✓</div>
    <div class="u-nb-s">Bravo ! · +50 pts gagnés</div>
  </div>
  <div class="u-ncta" style="color:var(--g)">Voir →</div>
</a>
{/if}

<div class="u-sh"><div class="u-sh-t">Mon programme</div><div class="u-sh-s">Jour {data?.currentDayIndex ?? 21} / 91</div></div>

<div class="u-split-cards">
  <a href="/user/sport" class="u-scard" class:pending={pending.seance} onclick={fire}>
    <div class="scard-circle" style="width:18px;height:18px;border-radius:50%;background:var(--gd);box-shadow:0 0 6px var(--gg);margin-bottom:12px"></div>
    <div class="u-scard-lbl">Sport</div>
    <div class="u-scard-sub">{pending.seance ? 'Séance en attente' : 'Calendrier · Séances'}</div>
  </a>
  <a href="/user/nutrition" class="u-scard" class:pending={pending.repas} onclick={fire}>
    <div style="width:16px;height:16px;background:var(--cyd);box-shadow:0 0 6px var(--cyg);margin-bottom:12px"></div>
    <div class="u-scard-lbl">Nutrition</div>
    <div class="u-scard-sub">{pending.repas ? 'Repas non planifié' : 'Cadencier · Recettes'}</div>
  </a>
</div>

<div class="u-sh"><div class="u-sh-t">À la une</div></div>
<a href="/user/decouverte" class="u-li">
  <div class="u-li-th"><div style="width:11px;height:11px;border-radius:50%;background:var(--gd)"></div></div>
  <div class="u-li-b"><div class="u-li-t">La méthode Thower</div><div class="u-li-s">Vidéo principale</div></div>
  <div class="u-li-r"><div class="u-arr"></div></div>
</a>
<div class="u-li">
  <div class="u-li-th"><div style="width:10px;height:10px;background:var(--cyd)"></div></div>
  <div class="u-li-b"><div class="u-li-t">Élastiques &amp; Matériel</div><div class="u-li-s">Partenaires · Achats</div></div>
  <div class="u-li-r"><div class="u-arr"></div></div>
</div>

<style>
/* ── Home Hero ── */
.home-hero {
  position: relative;
  overflow: hidden;
  background: var(--s1);
  padding: 20px 18px 22px;
  border-bottom: 1px solid var(--br);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  flex-shrink: 0;
}
.home-hero::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,229,255,.15), transparent);
}
.hh-depth { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.hh-tri1 { position: absolute; right: -20px; top: -10px; width: 160px; height: 140px; filter: blur(2px); }
.hh-tri2 { position: absolute; right: 20px; bottom: 30px; width: 90px; height: 78px; filter: blur(1px); opacity: .6; }
.hh-inner { position: relative; z-index: 4; }
.hh-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.hh-eyebrow { font-size: .4375rem; color: var(--txd); letter-spacing: .14em; text-transform: uppercase; font-family: var(--fb); margin-bottom: 4px; }
.hh-title {
  font-family: var(--fh2);
  font-size: 3.25rem;
  color: var(--gb);
  letter-spacing: -.02em;
  line-height: .88;
  text-shadow: 0 0 28px rgba(201,168,78,.3), 0 0 60px rgba(201,168,78,.1);
}
.hh-sub { font-size: .5rem; color: var(--txd); letter-spacing: .08em; text-transform: uppercase; margin-top: 5px; font-family: var(--fb); }
.hh-pills { display: flex; gap: 5px; flex-wrap: wrap; }

/* Bouton paramètres */
.pbtn { width:32px; height:32px; background:transparent; border:1px solid var(--br2); display:flex; align-items:center; justify-content:center; position:relative; -webkit-tap-highlight-color:transparent; transition: border-color .2s; }
.pbtn:active { border-color:var(--g); }
.pbtn-sq { width:11px; height:11px; background:var(--txd); }
.npip { position:absolute; top:-3px; right:-3px; width:7px; height:7px; border-radius:50%; background:var(--cy); border:1.5px solid var(--s1); animation:cyPulse 2s ease-in-out infinite; }
</style>

