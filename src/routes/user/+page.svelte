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

<!-- Hero -->
<div class="u-hero">
  <div class="u-hero-top">
    <div>
      <div class="u-hero-title">Thower</div>
      <div class="u-hero-sub">Semaine 4 · Jour {data?.currentDayIndex ?? 21}</div>
    </div>
    <div class="hero-right">
      <svg class="u-logo-svg" viewBox="0 0 44 38" fill="none">
        <polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
        <polygon points="22,2 42,36 22,24" fill="#3A2810"/>
      </svg>
      <a href="/user/parametres" class="pbtn" onclick={fire}>
        <div class="pbtn-sq"></div>
        <div class="npip"></div>
      </a>
    </div>
  </div>
  <div class="hero-pills">
    <a href="/user/journee" class="u-hpill" class:pending={pending.journee} onclick={fire}>Aujourd'hui</a>
    <a href="/user/parametres" class="u-hpill" onclick={fire}>Profil</a>
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
<a href="/user/sport" class="u-notif-banner" onclick={fire}>
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
<a href="/user/decouverte" class="u-li" onclick={fire}>
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
.hero-right { display:flex; align-items:flex-start; gap:8px; }
.pbtn { width:32px; height:32px; background:var(--s2); border:1px solid var(--br2); display:flex; align-items:center; justify-content:center; position:relative; -webkit-tap-highlight-color:transparent; }
.pbtn:active { border-color:var(--g); }
.pbtn-sq { width:11px; height:11px; background:var(--txd); }
.npip { position:absolute; top:-3px; right:-3px; width:7px; height:7px; border-radius:50%; background:var(--cy); border:1.5px solid var(--s1); animation:npip 2s ease-in-out infinite; }
.hero-pills { display:flex; gap:5px; flex-wrap:wrap; }
</style>

