<script lang="ts">
import type { PageData, LayoutData } from './$types';
import EmberCanvas from '$lib/components/EmberCanvas.svelte';
import DailyChecklist from '$lib/components/DailyChecklist.svelte';
import ProgramStartCountdown from '$lib/components/ProgramStartCountdown.svelte';
import { fireElement } from '$lib/utils/particles';
import { page } from '$app/stores';

let { data } = $props<{ data: PageData }>();

const pending = $derived(($page.data as { pending?: LayoutData['pending'] })?.pending ?? { seance: false, tasks: 0, repas: false, photos: false, journee: false });

/** Droits selon les offres payées (`offerSlugs` sur les transactions). */
const access = $derived(data.programAccess ?? { nutrition: true, sport: true });
const checklistValidated = $derived(data.validated);
const totalPointsValue = $derived(data.totalPoints ?? 0);
const levelPercentValue = $derived(data.levelPercent ?? 0);
const programAwaitingStart = $derived(data.programAwaitingStart === true);
const programStartsAt = $derived(data.programStartsAt ?? null);

const currentDayIndex = $derived(
	($page.data as { currentDayIndex?: number }).currentDayIndex ?? 0
);
const currentWeekNum = $derived(Math.min(13, Math.max(1, Math.ceil(currentDayIndex / 7))));

// ── Progression logo (0 = jour 1, 1 = jour 91) ────────────────────────────
const logoProgress = $derived(Math.max(0, Math.min(1, (currentDayIndex - 1) / 90)));

const logoStyle = $derived((() => {
  const t = logoProgress;
  const opacity   = 0.13 + t * 0.42;                        // 0.13 → 0.55
  const scale     = 1    + t * 0.7;                          // 1.0  → 1.7
  const saturate  = t;                                       // 0    → 1
  const sepia     = t;                                       // 0    → 1
  const hueRot    = t * 145;                                 // 0°   → 145° (cyan)
  const brightness = 2 - t * 1.1;                           // 2    → 0.9
  return [
    `opacity:${opacity.toFixed(3)}`,
    `transform:translate(-50%,-50%) scale(${scale.toFixed(3)})`,
    `filter:saturate(${saturate.toFixed(2)}) sepia(${sepia.toFixed(2)}) hue-rotate(${hueRot.toFixed(1)}deg) brightness(${brightness.toFixed(2)})`,
  ].join(';');
})());

function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement, e); }

// ── Checklist ─────────────────────────────────────────────────────────────
type VideoInfo = { id: string; title: string; cloudflareUid: string; thumbnailUrl: string | null; durationSeconds: number | null; category: string };
type Task = { id: string; label: string; points: number; order: number; completed: boolean; type?: 'STANDARD' | 'VIDEO'; video?: VideoInfo | null };

const checklistItems = $derived(
  (data.tasks as Task[]).map((t) => ({
    id: t.id,
    label: t.label,
    pts: t.points,
    done: t.completed,
    type: (t.type ?? 'STANDARD') as 'STANDARD' | 'VIDEO',
    video: t.video ?? null
  }))
);

let earnedFeedback = $state<number | null>(null);

const checklistPending = $derived(!checklistValidated);
const sportPending = $derived(access.sport && pending.seance);
const dailyCtaActive = $derived(checklistPending || sportPending);
const dailyCtaHref = $derived(checklistPending ? '/user/journee' : '/user/sport');
const dailyCtaTitle = $derived(
  checklistPending && sportPending
    ? 'Complète ta journée'
    : checklistPending
      ? 'Valide ta checklist du jour'
      : sportPending
        ? 'Lance ta séance du jour'
        : 'Journée complétée'
);
const dailyCtaSubtitle = $derived(
  checklistPending && sportPending
    ? 'Checklist quotidienne + séance sport à compléter'
    : checklistPending
      ? 'Checklist à valider · finalise ta journée'
      : sportPending
        ? 'Programme sport en attente · ouvre ta séance'
        : `Checklist et sport validés pour aujourd'hui`
);
const dailyCtaLabel = $derived(dailyCtaActive ? 'Compléter →' : 'Bravo →');

function handleChecklistSuccess(pts: number) {
  earnedFeedback = pts;
  setTimeout(() => { earnedFeedback = null; }, 3200);
  animateValue((v) => { animatedTotal = v; }, animatedTotal, data.totalPoints ?? 0, 950);
  animateValue((v) => { animatedBar = v; }, animatedBar, data.levelPercent ?? 0, 700);
}

// ── Animation score / barre de niveau ─────────────────────────────────────
let animatedTotal = $state(0);
let animatedBar = $state(0); // démarre à 0 pour animer à l'entrée

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

function animateValue(
  setter: (v: number) => void,
  from: number,
  to: number,
  duration = 900
) {
  const start = performance.now();
  function step(now: number) {
    const p = Math.min((now - start) / duration, 1);
    setter(Math.round(from + (to - from) * easeOut(p)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Remplissage initial de la barre au montage (délai pour que la transition CSS joue)
$effect(() => {
  const pct = levelPercentValue;
  const total = totalPointsValue;
  setTimeout(() => {
    animatedBar = pct;
    animatedTotal = total;
  }, 120);
});
</script>

<!-- Hero immersif -->
<div class="home-hero">
  <EmberCanvas active={!programAwaitingStart && dailyCtaActive} />
  <!-- Logo centré en background avec glow doré -->
  <div class="hh-depth" aria-hidden="true">
    <img class="hh-logo" src="/logo-app.png" alt="" style={logoStyle} />
    <div class="hh-logo-glow"></div>
  </div>
  <div class="hh-inner">
    <div class="hh-top">
      <div>
        {#if programAwaitingStart && programStartsAt}
          <ProgramStartCountdown startsAt={programStartsAt} />
        {:else}
          <div class="hh-eyebrow">Jour {currentDayIndex} / 91</div>
          <div class="hh-title">Tho<span class="hh-title-white">wer</span></div>
          <div class="hh-sub">Semaine {currentWeekNum} · Programme Méthode</div>
        {/if}
      </div>
      <a href="/user/parametres/profil" class="pbtn" aria-label="Ouvrir le profil">
        <div class="pbtn-sq"></div>
        <div class="npip"></div>
      </a>
    </div>
  </div>
</div>

<!-- CTA quotidien piloté par sport + checklist -->
{#if programAwaitingStart}
<div class="u-notif-banner daily-cta daily-cta-wait">
  <div class="u-ndot" style:background="var(--g)" style:animation="none" style:opacity=".4"></div>
  <div class="u-nb">
    <div class="u-nb-t">Le programme démarre lundi</div>
    <div class="u-nb-s">Tu peux déjà explorer le sport, la nutrition et la méthode</div>
  </div>
</div>
{:else}
<a
  href={!access.sport && !checklistPending ? '/auth/subscription' : dailyCtaHref}
  class="u-notif-banner daily-cta"
  class:pending={dailyCtaActive}
  class:program-locked={!access.sport && sportPending}
  onclick={fire}
>
  {#if dailyCtaActive}
    <EmberCanvas active={true} />
  {/if}
  <div class="u-ndot" style:background={dailyCtaActive ? undefined : 'var(--g)'} style:animation={dailyCtaActive ? undefined : 'none'} style:opacity={dailyCtaActive ? undefined : '.4'}></div>
  <div class="u-nb">
    <div class="u-nb-t">{dailyCtaTitle}</div>
    <div class="u-nb-s">{dailyCtaSubtitle}</div>
  </div>
  <div class="u-ncta" style:color={!dailyCtaActive ? 'var(--g)' : undefined}>{dailyCtaLabel}</div>
</a>
{/if}

<div class="u-sh">
  <div class="u-sh-t">Mon programme</div>
  <div class="u-sh-s">{programAwaitingStart ? 'Démarre lundi' : `Jour ${currentDayIndex} / 91`}</div>
</div>

<div class="u-split-cards">
  <a
    href={access.sport ? '/user/sport' : '/auth/subscription'}
    class="u-scard"
    class:pending={access.sport && pending.seance}
    class:program-locked={!access.sport}
    onclick={fire}
  >
    <div class="scard-circle" style="width:18px;height:18px;border-radius:50%;background:var(--gd);box-shadow:0 0 6px var(--gg);margin-bottom:12px"></div>
    <div class="u-scard-lbl">Sport</div>
    <div class="u-scard-sub">
      {#if !access.sport}
        Non inclus · Souscrire
      {:else}
        {pending.seance ? 'Séance en attente' : 'Calendrier · Séances'}
      {/if}
    </div>
  </a>
  <a
    href={access.nutrition ? '/user/nutrition' : '/auth/subscription'}
    class="u-scard"
    class:pending={access.nutrition && pending.repas}
    class:program-locked={!access.nutrition}
    onclick={fire}
  >
    <div style="width:16px;height:16px;background:var(--cyd);box-shadow:0 0 6px var(--cyg);margin-bottom:12px"></div>
    <div class="u-scard-lbl">Nutrition</div>
    <div class="u-scard-sub">
      {#if !access.nutrition}
        Non inclus · Souscrire
      {:else}
        {pending.repas ? 'Repas non planifié' : 'Cadencier · Recettes'}
      {/if}
    </div>
  </a>
</div>

<!-- ── Checklist journalière ──────────────────────────────────────────── -->
{#if data.tasks.length > 0}
<div class="u-sh">
  <div class="u-sh-t">Checklist du jour</div>
  <div class="u-sh-s">
    {#if data.validated}
      <span class="ck-badge ck-done">Validée ✓</span>
    {:else}
      <span class="ck-pts-live">À valider</span>
    {/if}
  </div>
</div>

<div class="ck-card" class:ck-locked={data.validated}>
  <DailyChecklist
    items={checklistItems}
    validated={data.validated}
    pointsEarned={data.pointsEarned}
    resetAction="?/resetChecklist"
    onSuccess={handleChecklistSuccess}
  />

  <!-- Score animé + barre de niveau -->
  <div class="ck-score-row">
    <div class="ck-score-inner">
      <span class="ck-score-lbl">{data.levelData?.name ?? ''}</span>
      <span class="ck-score-pts">{animatedTotal} pts</span>
    </div>
    <div class="ck-lvl-track">
      <div class="ck-lvl-fill" style="width:{animatedBar}%"></div>
    </div>
  </div>

  {#if earnedFeedback !== null}
    <div class="ck-earned-popup">+{earnedFeedback} pts !</div>
  {/if}
</div>
{/if}

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
/* Offre nutrition / sport non achetée */
:global(.u-notif-banner.program-locked),
:global(.u-scard.program-locked) {
  opacity: 0.5;
  filter: grayscale(1);
}
:global(.u-scard.program-locked.pending) {
  filter: grayscale(1);
  opacity: 0.55;
}
.daily-cta {
  overflow: hidden;
  position: relative;
}

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
.hh-depth { position: absolute; inset: 0; z-index: 1; pointer-events: none; display: flex; align-items: center; justify-content: center; }
.hh-logo {
  position: absolute;
  width: 120px; height: auto;
  object-fit: contain;
  left: 50%; top: 50%;
  transform-origin: center;
  will-change: transform, opacity, filter;
}
.hh-logo-glow {
  position: absolute;
  width: 200px; height: 200px;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, var(--gg) 0%, transparent 70%);
  filter: blur(20px);
}
.hh-inner { position: relative; z-index: 4; }
.hh-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px; }
.hh-top > div:first-child { flex: 1; min-width: 0; }
.hh-eyebrow { font-size: .4375rem; color: var(--txd); letter-spacing: .14em; text-transform: uppercase; font-family: var(--fb); margin-bottom: 4px; }
.hh-title {
  font-family: var(--fh);
  font-size: 3.25rem;
  color: var(--gb);
  letter-spacing: -0.1em;
  line-height: .88;
  text-transform: uppercase;
  font-weight: 800;
  text-shadow: 0 0 28px var(--gg), 0 0 60px var(--gg);
}
.hh-title-white {
  color: #f0ede8;
  text-shadow: 0 0 28px var(--gg), 0 0 60px var(--gg);
}
.hh-sub { font-size: .5rem; color: var(--txd); letter-spacing: .08em; text-transform: uppercase; margin-top: 5px; font-family: var(--fb); }
.hh-pills { display: flex; gap: 5px; flex-wrap: wrap; }

/* Bouton paramètres */
.pbtn { width:32px; height:32px; background:transparent; border:1px solid var(--br2); display:flex; align-items:center; justify-content:center; position:relative; -webkit-tap-highlight-color:transparent; transition: border-color .2s; }
.pbtn:active { border-color:var(--g); }
.pbtn-sq { width:11px; height:11px; background:var(--txd); }
.npip { position:absolute; top:-3px; right:-3px; width:7px; height:7px; border-radius:50%; background:var(--cy); border:1.5px solid var(--s1); animation:cyPulse 2s ease-in-out infinite; }

/* ── Checklist journalière ── */
.ck-card {
  margin: 0 14px 18px;
  background: var(--s1);
  border: 1px solid var(--br2);
  border-radius: var(--br2);
  overflow: hidden;
  position: relative;
}
.ck-card.ck-locked { opacity: .85; }

/* header badges */
.ck-badge { font-size: .4375rem; font-family: var(--fb); letter-spacing: .06em; padding: 2px 7px; border-radius: 10px; }
.ck-done { background: rgba(201,168,78,.12); color: var(--g); border: 1px solid rgba(201,168,78,.3); }
.ck-pts-live { font-size: .4375rem; color: var(--cy); font-family: var(--fb); }

/* score row + niveau bar */
.ck-score-row {
  padding: 10px 14px 12px;
  border-top: 1px solid var(--br);
  display: flex; flex-direction: column; gap: 6px;
}
.ck-score-inner {
  display: flex; justify-content: space-between; align-items: baseline;
}
.ck-score-lbl { font-size: .4375rem; color: var(--txd); font-family: var(--fb); letter-spacing: .08em; text-transform: uppercase; }
.ck-score-pts { font-family: var(--fh2); font-size: .875rem; color: var(--g); letter-spacing: -.01em; transition: color .2s; }
.ck-lvl-track {
  height: 3px;
  background: var(--br2);
  border-radius: 2px;
  overflow: hidden;
}
.ck-lvl-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--g), var(--gb));
  border-radius: 2px;
  transition: width .8s cubic-bezier(.22,1,.36,1);
}

/* earned popup */
.ck-earned-popup {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fh2); font-size: 1.5rem; color: var(--cy);
  text-shadow: 0 0 20px rgba(0,229,255,.5);
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  animation: ckPop .3s ease-out, ckFade 2.7s 0.3s forwards;
  pointer-events: none;
  border-radius: var(--br2);
}
@keyframes ckPop { from { transform: scale(.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes ckFade { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
</style>

