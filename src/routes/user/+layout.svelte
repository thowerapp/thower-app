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

function handleNavClick(_e: MouseEvent) {
  // Nav clicks are navigation, not CTAs — no particle burst
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

// Les 4 tabs principaux n'ont pas besoin d'un bouton retour (on navigue via le bottom nav)
const rootTabs = new Set(['decouverte', 'journee', 'progression', 'parametres']);

const backInfo = $derived((() => {
  const path = $page.url.pathname.replace(/\/$/, '');
  const segs = path.split('/').filter(Boolean);
  if (segs.length <= 1) return null; // /user home
  if (segs.length === 2 && rootTabs.has(segs[1])) return null; // tabs principaux
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
    <a href="/user" class="home-btn" onclick={handleNavClick} aria-label="Accueil">
      <svg width="16" height="15" viewBox="0 0 20 18" fill="none">
        <polygon points="10,1 19,9 16,9 16,17 12,17 12,12 8,12 8,17 4,17 4,9 1,9" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
      </svg>
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
   DESIGN TOKENS — Palette cohérente pour /user/
   Couleur principale : Cyan (interactif)
   Accent rare : Doré (titres importants seulement)
   ═══════════════════════════════════════════════════════ */
:global(:root) {
  /* Couleur principale (UI, boutons, liens) */
  --cy:  #00E5FF; --cyg: rgba(0, 229, 255, 0.25);
  
  /* Accent doré (titres, rare) */
  --g:   #C9A84E; --gb: #D4AF37; --gg: rgba(201, 168, 78, 0.15);
  
  /* Surfaces & profondeur */
  --s1:  #0D0D0D; /* Fond principal */
  --s2:  #1A1A1A; /* Surface (cards, zones) */
  --s3:  #222222; /* Surface hover/active */
  --br:  #2A2A2A; /* Border subtile */
  --br2: #333333; /* Border moyenne */
  
  /* Texte & hiérarchie */
  --tx:  #EAEAEA; /* Texte principal (blanc cassé) */
  --tx2: rgba(234, 234, 234, 0.8);  /* Texte secondaire */
  --txd: rgba(255, 255, 255, 0.4);  /* Texte désactivé/label */
  --txm: #808080; /* Texte très discret */
  
  /* Typo */
  --fh:  'DM Sans',      sans-serif;
  --fh2: 'Bebas Neue',   sans-serif;
  --fb:  'Public Sans',  sans-serif;
}

/* ── Keyframes : glows subtils (pas d'animations frénétiques) ── */
:global {
  @keyframes cyPulse {
    0%,100% { box-shadow: 0 0 6px rgba(0, 229, 255, 0.3), 0 0 12px rgba(0, 229, 255, 0.1); }
    50%     { box-shadow: 0 0 10px rgba(0, 229, 255, 0.5), 0 0 18px rgba(0, 229, 255, 0.15); }
  }
  @keyframes cyGlow {
    0%,100% { box-shadow: 0 0 8px rgba(0, 229, 255, 0.4); }
  }
  @keyframes gGlow {
    0%,100% { box-shadow: 0 0 6px rgba(201, 168, 78, 0.3); }
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
  font-size: .5625rem; /* 9px */
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
  gap: 10px;
}
:global(.u-back-lnk) {
  display: flex;
  align-items: center;
  gap: 7px;
  -webkit-tap-highlight-color: transparent;
}
:global(.u-back-lbl) { font-size: .625rem; color: var(--txd); font-family: var(--fb); }
:global(.u-back-head) {
  font-family: var(--fh2);
  font-size: 1.5rem; /* 24px */
  color: var(--tx);
  letter-spacing: .06em;
  line-height: 1;
  font-weight: 700;
}

/* ── Section header ── */
:global(.u-sh) {
  padding: 12px 18px 8px;
  border-bottom: 1px solid var(--br);
  flex-shrink: 0;
}
:global(.u-sh-t) {
  font-family: var(--fh2);
  font-size: 1.125rem; /* 18px */
  color: var(--tx);
  letter-spacing: .05em;
  line-height: 1;
  font-weight: 700;
}
:global(.u-sh-s) {
  font-size: .5625rem; /* 9px */
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
:global(a.u-li:active, button.u-li:active) { background: rgba(0, 229, 255, 0.05); }
:global(.u-li-th) {
  width: 34px; height: 34px;
  background: var(--s3);
  border: 1px solid var(--br2);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
:global(.u-li-b) { flex: 1; min-width: 0; }
:global(.u-li-t) {
  font-size: .75rem; /* 12px */
  font-weight: 500;
  color: var(--tx);
  font-family: var(--fb);
}
:global(.u-li-s) {
  font-size: .5625rem; /* 9px */
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
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.15), transparent);
  opacity: .6;
}
:global(.u-sv) {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--cy);
  line-height: 1;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
  font-family: var(--fh);
}
:global(.u-sl) {
  font-size: .5625rem; /* 9px */
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
  border-left: 2px solid var(--cy);
  padding: 12px 13px;
  background: var(--s2);
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
:global(.u-notif-banner.pending) {
  animation: cyPulse 2s ease-in-out infinite;
}
:global(.u-notif-banner:active) { background: var(--s3); }
:global(.u-ndot) {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: var(--cy);
  animation: cyPulse 2s ease-in-out infinite;
  position: relative; z-index: 4;
  flex-shrink: 0;
}
:global(.u-nb) { flex: 1; position: relative; z-index: 4; }
:global(.u-nb-t) {
  font-size: .75rem; /* 12px */
  font-weight: 500;
  color: var(--tx);
  margin-bottom: 3px;
  font-family: var(--fb);
}
:global(.u-nb-s) {
  font-size: .5625rem;
  color: var(--txd);
  line-height: 1.4;
  font-family: var(--fb);
}
:global(.u-ncta) {
  font-size: .625rem; /* 10px */
  font-weight: 700;
  color: var(--cy);
  white-space: nowrap;
  letter-spacing: .04em;
  font-family: var(--fb);
  text-shadow: 0 0 6px rgba(0, 229, 255, 0.4);
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
  touch-action: manipulation;
  position: relative;
  overflow: hidden;
  transition: all .2s;
}
:global(.u-scard:active) { background: var(--s3); border-color: var(--cy); box-shadow: 0 0 8px rgba(0, 229, 255, 0.2); }
:global(.u-scard-lbl) {
  font-family: var(--fh2);
  font-size: 1.125rem; /* 18px */
  color: var(--tx);
  letter-spacing: .06em;
  line-height: 1;
}
:global(.u-scard-sub) {
  font-size: .5625rem;
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
  touch-action: manipulation;
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
  border-color: var(--br2);
}
:global(.u-cbox.done) {
  background: var(--cy);
  border-color: var(--cy);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.4), 0 0 12px rgba(0, 229, 255, 0.15);
  animation: none;
}
:global(.u-clbl) {
  font-size: .6875rem; /* 11px */
  color: var(--tx2);
  flex: 1;
  font-family: var(--fb);
  transition: color .2s;
}
:global(.u-clbl.done) { color: var(--txd); text-decoration: line-through; }
:global(.u-cpts) { font-size: .5625rem; color: var(--txd); flex-shrink: 0; font-family: var(--fb); }
:global(.u-cpts.earned) { color: var(--cy); font-weight: 700; text-shadow: 0 0 6px rgba(0, 229, 255, 0.4); }

/* ── Logo SVG helper ── */
:global(.u-logo-svg) { width: 40px; height: 34px; opacity: .5; flex-shrink: 0; }

/* ── Pill bouton hero ── */
:global(.u-hpill) {
  padding: 5px 11px;
  border: 1px solid var(--br2);
  color: var(--txd);
  background: transparent;
  font-size: .5625rem;
  font-weight: 600;
  letter-spacing: .04em;
  font-family: var(--fb);
  -webkit-tap-highlight-color: transparent;
  display: inline-block;
  transition: all .2s;
}
:global(.u-hpill:active) { background: rgba(0, 229, 255, 0.08); color: var(--cy); border-color: var(--cy); }
:global(.u-hpill.pending) { border-color: var(--cy); color: var(--cy); animation: cyPulse 1.5s ease-in-out infinite; }

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
:global(.u-sd-n) { font-size: .4375rem; color: var(--txd); text-transform: uppercase; font-family: var(--fb); font-weight: 600; }
:global(.u-sd-d) { font-size: .6875rem; font-weight: 700; color: var(--tx); font-family: var(--fh); }
:global(.u-sd-b) { font-size: .5625rem; font-weight: 700; margin-top: 1px; font-family: var(--fb); color: var(--txm); }
:global(.u-sd.done) { background: var(--s3); border-color: var(--cy); }
:global(.u-sd.done .u-sd-d) { color: var(--cy); }
:global(.u-sd.today) { border: 1.5px solid var(--cy); background: rgba(0, 229, 255, 0.05); }
:global(.u-sd.today .u-sd-d) { color: var(--cy); }
:global(.u-sd.placed) { background: var(--s2); border: 1px dashed var(--txd); }
:global(.u-sd.free) { opacity: .6; }

/* ── Pin-dot (gomette) ── */
:global(.pin-dot) {
  background: var(--cy) !important;
  animation: cyPulse 1.5s ease-in-out infinite !important;
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
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.15), transparent);
}
.ni {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  flex: 1;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: opacity .1s;
  position: relative;
}
.ni:active { opacity: .7; }
.ndot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--br2);
  transition: background .15s, box-shadow .15s;
}
.ni.on .ndot {
  background: var(--cy);
  animation: cyPulse 1.5s ease-in-out infinite;
}
/* Surcharge pour le pin-dot dans la nav */
.ndot.pin-dot {
  width: 7px !important;
  height: 7px !important;
  background: var(--cy) !important;
  animation: cyPulse 1.5s ease-in-out infinite !important;
}
.nlbl {
  font-size: .5625rem;
  color: var(--txd);
  text-transform: uppercase;
  letter-spacing: .06em;
  font-family: var(--fb);
  transition: color .22s;
  text-align: center;
  font-weight: 600;
}
.ni.on .nlbl { color: var(--cy); font-weight: 700; }
.nlbl-pending { color: var(--cy) !important; }
.nbar { width: 18px; height: 1.5px; background: transparent; transition: background .15s, box-shadow .15s; }
.ni.on .nbar { background: var(--cy); box-shadow: 0 0 6px rgba(0, 229, 255, 0.4); }

/* ── Bouton accueil ── */
.home-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px; height: 38px;
  border-radius: 8px;
  background: var(--s2);
  border: 1px solid var(--br2);
  color: var(--txd);
  align-self: center;
  margin: 6px auto 8px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background .15s, border-color .15s, color .15s;
}
.home-btn:active { background: var(--s3); border-color: var(--cy); color: var(--cy); }
</style>
