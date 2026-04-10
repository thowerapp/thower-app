<script lang="ts">
import { page } from '$app/stores';
import type { LayoutData } from './$types';
import { fireElement, registerSources } from '$lib/utils/particles';
import { onMount } from 'svelte';

let { data } = $props<{ data: LayoutData }>();

let currentTab = $derived(getTabFromRoute($page.url.pathname));

function getTabFromRoute(pathname: string): string {
  if (pathname.includes('/decouverte')) return 'decouverte';
  if (pathname.includes('/journee'))    return 'journee';
  if (pathname.includes('/progression')) return 'progression';
  if (pathname.includes('/parametres')) return 'parametres';
  return 'home';
}

// Re-scan les sources .pending + indicateurs après chaque transition page
$effect(() => {
  const _ = $page.url.pathname;
  if (typeof window === 'undefined') return;
  setTimeout(() => registerSources(document.body), 100);
});

function handleNavClick(e: MouseEvent) {
  fireElement(e.currentTarget as HTMLElement);
}

// Les données de pending viennent du layout server
const pending = $derived(data?.pending ?? { seance: false, tasks: 0, repas: false, photos: false, journee: false });

// ── Bouton retour bas de page, calculé depuis l'URL ──
const sectionLabels: Record<string, string> = {
  user:           'Accueil',
  nutrition:      'Nutrition',
  sport:          'Sport',
  decouverte:     'Découverte',
  journee:        'Journée',
  progression:    'Progression',
  parametres:     'Paramètres',
  cadencier:      'Cadencier',
  courses:        'Courses',
  recettes:       'Recettes',
  suivi:          'Suivi',
  'suivi-poids':  'Suivi poids',
  'suivi-macros': 'Suivi macros',
  'suivi-poids-historique': 'Historique',
  defis:          'Défis',
  'defi-30-jours': '30 jours',
  jeune:          'Jeûne',
  mindset:        'Mindset',
  meditation:     'Méditation',
  breathwork:     'Breathwork',
};

const backInfo = $derived((() => {
  const path = $page.url.pathname.replace(/\/$/, '');
  const segs = path.split('/').filter(Boolean);
  if (segs.length <= 1) return null; // on est sur /user (home)
  const parentSegs = segs.slice(0, -1);
  const parentHref = '/' + parentSegs.join('/');
  const parentKey  = parentSegs[parentSegs.length - 1];
  return {
    href:  parentHref,
    label: sectionLabels[parentKey] ?? parentKey.replace(/-/g, ' '),
  };
})());
</script>

<div class="screen">
  <div class="sbar"></div>
  <div class="screen-body">
    <slot />
  </div>
  {#if backInfo}
    <a href={backInfo.href} class="btm-back" onclick={handleNavClick}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      {backInfo.label}
    </a>
  {/if}

  <nav class="bottom-nav">
    <a href="/user/decouverte" class="ni" class:on={currentTab === 'decouverte'} onclick={handleNavClick}>
      <div class="ndot"></div>
      <div class="nlbl">Découverte</div>
      <div class="nbar"></div>
    </a>
    <a href="/user/journee" class="ni" class:on={currentTab === 'journee'} onclick={handleNavClick}>
      <!-- pin-dot quand des tâches ou la séance sont en attente -->
      <div class="ndot" class:pin-dot={pending.journee}></div>
      <div class="nlbl" class:nlbl-pending={pending.journee && currentTab !== 'journee'}>Journée</div>
      <div class="nbar"></div>
    </a>
    <a href="/user/progression" class="ni" class:on={currentTab === 'progression'} onclick={handleNavClick}>
      <div class="ndot" class:pin-dot={pending.photos}></div>
      <div class="nlbl">Progression</div>
      <div class="nbar"></div>
    </a>
    <a href="/user/parametres" class="ni" class:on={currentTab === 'parametres'} onclick={handleNavClick}>
      <div class="ndot"></div>
      <div class="nlbl">Paramètres</div>
      <div class="nbar"></div>
    </a>
  </nav>
</div>

<style>
/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — partagés entre toutes les routes /user
   ═══════════════════════════════════════════════════════ */
:global(:root) {
  --g:   #C8A44A; --gb: #F0C040; --gd: #5C4A1A; --gg: rgba(200,130,20,.32);
  --cy:  #00D4E8; --cyd: #004D58; --cyg: rgba(0,200,220,.35);
  --s1:  #0D0A05; --s2: #141008;  --s3:  #1C1609;
  --tx:  #EDE5D0; --txd: #6A5E48; --txm: #2E2618;
  --br:  #1E1608; --br2: #2A1E0C;
  --fh:  'DM Sans',      sans-serif;
  --fh2: 'Bebas Neue',   sans-serif;
  --fb:  'Public Sans',  sans-serif;
}

/* ── Keyframes ── */
:global {
  @keyframes gpulse {
    0%,100% { box-shadow: 0 0 4px 1px rgba(200,130,20,.45), 0 0 10px 2px var(--gg); }
    50%      { box-shadow: 0 0 8px 3px rgba(240,192,64,.6),  0 0 18px 5px rgba(200,130,20,.35); }
  }
  @keyframes cpulse {
    0%,100% { box-shadow: 0 0 4px 1px rgba(0,200,220,.4); }
    50%     { box-shadow: 0 0 8px 3px rgba(0,220,240,.65); }
  }
  @keyframes checkIdle {
    0%,100% { border-color: rgba(92,74,26,.8); }
    50%     { box-shadow: 0 0 7px 2px rgba(200,130,20,.45); border-color: rgba(200,164,74,1); }
  }
  @keyframes gbtn {
    0%,100% { box-shadow: 0 0 12px var(--gg); }
    50%     { box-shadow: 0 0 22px rgba(240,192,64,.65); }
  }
  @keyframes npip {
    0%,100% { box-shadow: 0 0 3px 1px rgba(0,200,220,.5); }
    50%     { box-shadow: 0 0 7px 3px rgba(0,220,240,.7); }
  }
}

/* ── Base ── */
:global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(body) {
  font-family: var(--fb);
  background: var(--s1);
  color: var(--tx);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
:global(a) { color: inherit; text-decoration: none; }
:global(button) { font-family: inherit; }

/* ═══════════════════════════════════════════════════════
   COMPOSANTS PARTAGÉS — toutes les routes /user/
   Typographie harmonisée sur une grille 8px.
   ═══════════════════════════════════════════════════════ */

/* ── Hero header ── */
:global(.u-hero) {
  background: var(--s1);
  padding: 14px 18px 20px;
  border-bottom: 1px solid var(--br);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}
:global(.u-hero::after) {
  content: '';
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gd), transparent);
  opacity: .7;
}
:global(.u-hero-top) {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
:global(.u-hero-title) {
  font-family: var(--fh2);
  font-size: 2.375rem; /* 38px */
  color: var(--gb);
  letter-spacing: -.02em;
  line-height: .95;
  text-shadow: 0 0 22px var(--gg), 0 0 45px rgba(200,130,20,.12);
}
:global(.u-hero-sub) {
  font-size: .5rem; /* 8px */
  color: var(--txd);
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-top: 5px;
  font-family: var(--fb);
}

/* ── Back row (pages secondaires) ── */
:global(.u-back-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 18px;
  background: var(--s1);
  border-bottom: 1px solid var(--br);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}
:global(.u-back-lnk) {
  display: flex;
  align-items: center;
  gap: 7px;
  -webkit-tap-highlight-color: transparent;
}
:global(.u-back-lbl) { font-size: .5rem; color: var(--txd); font-family: var(--fb); }
:global(.u-back-head) {
  font-family: var(--fh2);
  font-size: 1.375rem; /* 22px */
  color: var(--gb);
  letter-spacing: .06em;
  line-height: 1;
  text-shadow: 0 0 10px var(--gg);
}

/* ── Section header ── */
:global(.u-sh) {
  padding: 12px 18px 8px;
  border-bottom: 1px solid var(--br);
  flex-shrink: 0;
}
:global(.u-sh-t) {
  font-family: var(--fh2);
  font-size: 1rem; /* 16px */
  color: var(--tx);
  letter-spacing: .05em;
  line-height: 1;
}
:global(.u-sh-s) {
  font-size: .5rem; /* 8px */
  color: var(--txd);
  margin-top: 3px;
  font-family: var(--fb);
}

/* ── Liste item ── */
:global(.u-li) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--br);
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
:global(a.u-li:active, button.u-li:active) { background: rgba(200,130,20,.05); }
:global(.u-li-th) {
  width: 34px; height: 34px;
  background: var(--s2);
  border: 1px solid var(--br2);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
:global(.u-li-b) { flex: 1; min-width: 0; }
:global(.u-li-t) {
  font-size: .6875rem; /* 11px */
  font-weight: 500;
  color: var(--tx);
  font-family: var(--fb);
}
:global(.u-li-s) {
  font-size: .5rem; /* 8px */
  color: var(--txd);
  margin-top: 2px;
  font-family: var(--fb);
}
:global(.u-li-r) { flex-shrink: 0; }
:global(.u-arr) {
  width: 5px; height: 5px;
  border-right: 1.5px solid var(--txd);
  border-top: 1.5px solid var(--txd);
  transform: rotate(45deg);
}

/* ── Stats row ── */
:global(.u-stats-row) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 10px 18px 6px;
}
:global(.u-sbox) {
  background: var(--s2);
  border: 1px solid var(--br2);
  padding: 11px 6px;
  text-align: center;
  position: relative;
}
:global(.u-sbox::before) {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gd), transparent);
  opacity: .5;
}
:global(.u-sv) {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gb);
  line-height: 1;
  text-shadow: 0 0 10px var(--gg);
  font-family: var(--fh);
}
:global(.u-sl) {
  font-size: .4375rem; /* 7px */
  color: var(--txd);
  text-transform: uppercase;
  letter-spacing: .1em;
  margin-top: 4px;
  font-family: var(--fb);
}

/* ── Notif banner ── */
:global(.u-notif-banner) {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 10px 18px 0;
  border: 1px solid var(--br2);
  border-left: 2px solid var(--g);
  padding: 12px 13px;
  background: var(--s2);
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
:global(.u-notif-banner.pending) {
  animation: gbtn 2.5s ease-in-out infinite;
}
:global(.u-notif-banner:active) { background: var(--s3); }
:global(.u-ndot) {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--g);
  animation: gpulse 2.5s ease-in-out infinite;
  position: relative; z-index: 4;
  flex-shrink: 0;
}
:global(.u-nb) { flex: 1; position: relative; z-index: 4; }
:global(.u-nb-t) {
  font-size: .6875rem; /* 11px */
  font-weight: 500;
  color: var(--tx);
  margin-bottom: 3px;
  font-family: var(--fb);
}
:global(.u-nb-s) {
  font-size: .5rem;
  color: var(--txd);
  line-height: 1.4;
  font-family: var(--fb);
}
:global(.u-ncta) {
  font-size: .5625rem; /* 9px */
  font-weight: 600;
  color: var(--cy);
  white-space: nowrap;
  letter-spacing: .04em;
  font-family: var(--fb);
  text-shadow: 0 0 8px var(--cyg);
  position: relative; z-index: 4;
}

/* ── Split cards ── */
:global(.u-split-cards) {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 18px;
}
:global(.u-scard) {
  background: var(--s2);
  border: 1px solid var(--br2);
  padding: 16px 14px;
  display: block;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}
:global(.u-scard:active) { background: var(--s3); border-color: var(--gd); }
:global(.u-scard-lbl) {
  font-family: var(--fh2);
  font-size: 1.125rem; /* 18px */
  color: var(--tx);
  letter-spacing: .06em;
  line-height: 1;
}
:global(.u-scard-sub) {
  font-size: .5rem;
  color: var(--txd);
  margin-top: 4px;
  font-family: var(--fb);
}

/* ── Checklist ── */
:global(.u-citem) {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 18px;
  border: none;
  border-bottom: 1px solid var(--br);
  background: transparent;
  width: 100%;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
:global(.u-citem:active) { background: rgba(200,130,20,.05); }
:global(.u-cbox) {
  width: 17px; height: 17px;
  border: 1.5px solid var(--br2);
  background: transparent;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all .22s;
}
:global(.u-cbox.idle) {
  border-color: var(--gd);
  animation: checkIdle 3s ease-in-out infinite;
}
:global(.u-cbox.done) {
  background: var(--g);
  border-color: var(--gb);
  box-shadow: 0 0 8px 2px rgba(240,192,64,.5), 0 0 18px 4px var(--gg);
  animation: none;
}
:global(.u-clbl) {
  font-size: .625rem; /* 10px */
  color: var(--tx);
  flex: 1;
  font-family: var(--fb);
  transition: color .2s;
}
:global(.u-clbl.done) { color: var(--txd); text-decoration: line-through; }
:global(.u-cpts) { font-size: .5rem; color: var(--txd); flex-shrink: 0; font-family: var(--fb); }
:global(.u-cpts.earned) { color: var(--g); font-weight: 600; text-shadow: 0 0 5px var(--gg); }

/* ── Logo SVG helper ── */
:global(.u-logo-svg) { width: 40px; height: 34px; opacity: .5; flex-shrink: 0; }

/* ── Pill bouton hero ── */
:global(.u-hpill) {
  padding: 5px 11px;
  border: 1px solid var(--br2);
  color: var(--txd);
  background: transparent;
  font-size: .5625rem;
  letter-spacing: .04em;
  font-family: var(--fb);
  -webkit-tap-highlight-color: transparent;
  display: inline-block;
}
:global(.u-hpill:active) { background: rgba(200,130,20,.08); color: var(--g); border-color: var(--gd); }
:global(.u-hpill.pending) { border-color: var(--g); color: var(--g); animation: gbtn 2.5s ease-in-out infinite; }

/* ── Grille sport semaine ── */
:global(.u-sport-week) {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  padding: 8px 18px;
}
:global(.u-sd) {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  border: 1px solid var(--br2);
  gap: 2px;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}
:global(.u-sd-n) { font-size: .375rem; color: var(--txd); text-transform: uppercase; font-family: var(--fb); }
:global(.u-sd-d) { font-size: .6875rem; font-weight: 700; color: var(--tx); font-family: var(--fh); }
:global(.u-sd-b) { font-size: .5rem; font-weight: 700; margin-top: 1px; font-family: var(--fb); }
:global(.u-sd.done) { background: var(--s3); border-color: var(--gd); }
:global(.u-sd.done .u-sd-d) { color: var(--gb); }
:global(.u-sd.today) { border: 1.5px solid var(--g); }
:global(.u-sd.today .u-sd-d) { color: var(--gb); }
:global(.u-sd.placed) { background: var(--s2); border: 1px dashed var(--txd); }
:global(.u-sd.free) { opacity: .6; }

/* ── Pin-dot (gomette) ── */
:global(.pin-dot) {
  background: var(--g) !important;
  animation: gpulse 2.5s ease-in-out infinite !important;
  width: 7px !important;
  height: 7px !important;
}

/* ── Screen ── */
.screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: var(--s1);
  overflow: hidden;
}
.sbar {
  padding: 26px 18px 0;
  flex-shrink: 0;
  height: 28px;
  background: var(--s1);
}
.screen-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: var(--s1);
  scrollbar-width: none;
}
.screen-body::-webkit-scrollbar { display: none; }

/* ── Bottom nav ── */
.bottom-nav {
  display: flex;
  align-items: center;
  padding: 7px 0 calc(13px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--br);
  background: var(--s1);
  flex-shrink: 0;
  position: relative;
}
.bottom-nav::before {
  content: '';
  position: absolute;
  top: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200,130,20,.28), transparent);
}
.ni {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  flex: 1;
  -webkit-tap-highlight-color: transparent;
  transition: opacity .12s;
  position: relative;
}
.ni:active { opacity: .7; }
.ndot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--br2);
  transition: background .22s, box-shadow .22s;
}
.ni.on .ndot {
  background: var(--cy);
  animation: cpulse 2s ease-in-out infinite;
}
/* Surcharge pour le pin-dot dans la nav */
.ndot.pin-dot {
  width: 7px !important;
  height: 7px !important;
  background: var(--g) !important;
  animation: gpulse 2.5s ease-in-out infinite !important;
}
.nlbl {
  font-size: .4375rem;
  color: var(--txd);
  text-transform: uppercase;
  letter-spacing: .06em;
  font-family: var(--fb);
  transition: color .22s;
  text-align: center;
}
.ni.on .nlbl { color: var(--cy); font-weight: 600; }
.nlbl-pending { color: var(--g) !important; }
.nbar { width: 18px; height: 1.5px; background: transparent; transition: background .22s, box-shadow .22s; }
.ni.on .nbar { background: var(--cy); box-shadow: 0 0 4px var(--cyg); }

/* ── Bouton retour ── */
.btm-back {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 18px 10px;
  padding: 10px 16px;
  background: var(--s2);
  border: 1.5px solid var(--g);
  color: var(--gb);
  font-family: var(--fh2);
  font-size: .9375rem;
  letter-spacing: .08em;
  text-shadow: 0 0 10px var(--gg);
  box-shadow: 0 0 12px var(--gg);
  align-self: flex-start;
  -webkit-tap-highlight-color: transparent;
}
.btm-back:active { background: var(--s3); }
</style>
