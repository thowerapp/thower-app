<script lang="ts">
import type { PageData } from './$types';
import EmberCanvas from '$lib/components/EmberCanvas.svelte';
import { fireElement } from '$lib/utils/particles';

let { data } = $props<{ data: PageData }>();

function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement, e); }

const activityLabels: Record<string, string> = {
  SEDENTARY: 'Sédentaire',
  ACTIVE: 'Actif',
  ATHLETE: 'Athlète',
};

function scoreBar(val: number | null | undefined): string {
  if (!val) return '—';
  return '▮'.repeat(val) + '▯'.repeat(10 - val);
}

function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

// Animation barre de niveau et score au montage
let barPct = $state(0);
let displayedPts = $state(0);

$effect(() => {
  const target = data.levelPercent ?? 0;
  const pts = data.totalPoints ?? 0;
  setTimeout(() => {
    barPct = target;
    // Count-up score
    const duration = 900;
    const start = performance.now();
    function step(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      displayedPts = Math.round(pts * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, 120);
});
</script>

<div class="u-back-row">
  <a href="/user/parametres" class="u-back-lnk">
    <svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="u-back-lbl">Paramètres</span>
  </a>
  <div class="u-back-head">Profil</div>
</div>

<!-- Hero type accueil -->
<div class="profil-hero">
  <EmberCanvas active={true} />
  <div class="ph-depth" aria-hidden="true">
    <img class="ph-logo" src="/logo-app.png" alt="" />
    <div class="ph-logo-glow"></div>
  </div>
  <div class="ph-inner">
    <div class="ph-top-row">
      <div class="ph-avatar">{(data.user?.name ?? data.user?.email ?? '?')[0].toUpperCase()}</div>
      <div class="ph-level-block">
        <div class="ph-level-name">{data.levelData.name}</div>
        <div class="ph-level-num">Niveau {data.levelData.num}</div>
        <!-- Barre de progression niveau -->
        <div class="ph-bar-wrap">
          <div class="ph-bar"><div class="ph-fill" style="width:{barPct}%"></div></div>
          <div class="ph-bar-pct">{barPct}%</div>
        </div>
      </div>
    </div>
    <div class="ph-name">{data.user?.name ?? data.user?.username ?? 'Utilisateur'}</div>
    <div class="ph-email">{data.user?.email ?? ''}</div>
    <div class="ph-stats-row">
      {#if data.user?.programStartDate}
        <div class="ph-stat"><span class="ph-sv">Jour {daysSince(data.user.programStartDate ?? null) ?? '—'}</span><span class="ph-sl">/ 91</span></div>
      {/if}
      <div class="ph-stat"><span class="ph-sv" style="color:var(--cy)">{displayedPts}</span><span class="ph-sl">pts</span></div>
      {#if data.badgesCount > 0}
        <div class="ph-stat"><span class="ph-sv" style="color:var(--g)">{data.badgesCount}</span><span class="ph-sl">badge{data.badgesCount > 1 ? 's' : ''}</span></div>
      {/if}
    </div>
    {#if data.latestBadge}
      <div class="ph-latest-badge">★ {data.latestBadge}</div>
    {/if}
  </div>
</div>

<!-- ── Accordions ── -->

<details class="acc" open>
  <summary class="acc-sum">
    <span class="acc-title">Mensurations</span>
    <span class="acc-sub">{data.measurements ? new Date(data.measurements.createdAt).toLocaleDateString('fr-FR') : 'Non renseigné'}</span>
    <span class="acc-arr"></span>
  </summary>
  <div class="acc-body">
    {#if data.measurements}
      <div class="u-stats-row">
        <div class="u-sbox"><div class="u-sv">{data.measurements.weightKg ?? '—'}<span class="unit">kg</span></div><div class="u-sl">Poids</div></div>
        <div class="u-sbox"><div class="u-sv">{data.measurements.heightCm ?? '—'}<span class="unit">cm</span></div><div class="u-sl">Taille</div></div>
        <div class="u-sbox"><div class="u-sv">{data.measurements.age ?? '—'}<span class="unit">ans</span></div><div class="u-sl">Âge</div></div>
      </div>
      <div class="u-stats-row" style="margin-top:4px">
        <div class="u-sbox"><div class="u-sv">{data.measurements.waistCm ?? '—'}<span class="unit">cm</span></div><div class="u-sl">Tour taille</div></div>
        <div class="u-sbox"><div class="u-sv">{data.measurements.chestCm ?? '—'}<span class="unit">cm</span></div><div class="u-sl">Poitrine</div></div>
        <div class="u-sbox"><div class="u-sv">{data.measurements.armCm ?? '—'}<span class="unit">cm</span></div><div class="u-sl">Bras</div></div>
      </div>
    {:else}
      <div class="empty-row">Aucune mensuration enregistrée</div>
    {/if}
  </div>
</details>

<details class="acc">
  <summary class="acc-sum">
    <span class="acc-title">Objectifs &amp; Activité</span>
    <span class="acc-sub">{data.profile?.objectives?.length ?? 0} objectif{(data.profile?.objectives?.length ?? 0) > 1 ? 's' : ''}</span>
    <span class="acc-arr"></span>
  </summary>
  <div class="acc-body">
    {#if data.profile?.objectives && data.profile.objectives.length > 0}
      {#each data.profile.objectives as obj}
        <div class="u-li">
          <div class="u-li-th"><div style="width:7px;height:7px;border-radius:50%;background:var(--g)"></div></div>
          <div class="u-li-b"><div class="u-li-t">{obj}</div></div>
        </div>
      {/each}
    {:else}
      <div class="empty-row">Non renseigné</div>
    {/if}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Niveau d'activité</div><div class="u-li-t">{activityLabels[data.profile?.activityLevel ?? ''] ?? '—'}</div></div>
    </div>
    {#if data.profile?.sportActivity}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Sport pratiqué</div><div class="u-li-t">{data.profile.sportActivity}</div></div>
    </div>
    {/if}
    {#if data.profile?.bodyFatPercent}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Masse grasse estimée</div><div class="u-li-t">{data.profile.bodyFatPercent}%</div></div>
    </div>
    {/if}
    {#if data.profile?.weightLossGoalKg}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Objectif perte de poids</div><div class="u-li-t">−{data.profile.weightLossGoalKg} kg</div></div>
    </div>
    {/if}
    {#if data.profile?.painsPathologies}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Douleurs / pathologies</div><div class="u-li-t detail">{data.profile.painsPathologies}</div></div>
    </div>
    {/if}
  </div>
</details>

<details class="acc">
  <summary class="acc-sum">
    <span class="acc-title">Alimentation</span>
    <span class="acc-sub">{data.profile?.breakfastEnabled ? 'Petit déj. activé' : 'Sans petit déj.'}</span>
    <span class="acc-arr"></span>
  </summary>
  <div class="acc-body">
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Petit déjeuner</div><div class="u-li-t">{data.profile?.breakfastEnabled ? 'Activé' : 'Désactivé'}</div></div>
    </div>
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Jeûne intermittent (matin)</div><div class="u-li-t">{data.profile?.intermittentFastingMorning === true ? 'Activé' : data.profile?.intermittentFastingMorning === false ? 'Désactivé' : '—'}</div></div>
    </div>
    {#if data.profile?.allergens && data.profile.allergens.length > 0}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Allergènes</div><div class="u-li-t">{data.profile.allergens.join(', ')}</div></div>
    </div>
    {/if}
    {#if data.profile?.coffeePerDay != null}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Café / jour</div><div class="u-li-t">{data.profile.coffeePerDay} tasse{data.profile.coffeePerDay > 1 ? 's' : ''}</div></div>
    </div>
    {/if}
  </div>
</details>

{#if data.profile?.stressLevel || data.profile?.sleepQuality || data.profile?.happinessLevel}
<details class="acc">
  <summary class="acc-sum">
    <span class="acc-title">Bien-être (saisie initiale)</span>
    <span class="acc-sub">Stress · Sommeil · Humeur</span>
    <span class="acc-arr"></span>
  </summary>
  <div class="acc-body">
    {#if data.profile?.stressLevel}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Niveau de stress</div><div class="score-row"><span class="score-bar">{scoreBar(data.profile.stressLevel)}</span><span class="score-val">{data.profile.stressLevel}/10</span></div></div>
    </div>
    {/if}
    {#if data.profile?.sleepQuality}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Qualité du sommeil</div><div class="score-row"><span class="score-bar">{scoreBar(data.profile.sleepQuality)}</span><span class="score-val">{data.profile.sleepQuality}/10</span></div></div>
    </div>
    {/if}
    {#if data.profile?.happinessLevel}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Humeur générale</div><div class="score-row"><span class="score-bar">{scoreBar(data.profile.happinessLevel)}</span><span class="score-val">{data.profile.happinessLevel}/10</span></div></div>
    </div>
    {/if}
    {#if data.profile?.bodyConfidence}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Confiance en son corps</div><div class="score-row"><span class="score-bar">{scoreBar(data.profile.bodyConfidence)}</span><span class="score-val">{data.profile.bodyConfidence}/10</span></div></div>
    </div>
    {/if}
  </div>
</details>
{/if}

<details class="acc">
  <summary class="acc-sum">
    <span class="acc-title">Programme</span>
    <span class="acc-sub">{data.user?.programStartDate ? 'Démarré le ' + new Date(data.user.programStartDate).toLocaleDateString('fr-FR') : 'Non démarré'}</span>
    <span class="acc-arr"></span>
  </summary>
  <div class="acc-body">
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Début du programme</div><div class="u-li-t">{data.user?.programStartDate ? new Date(data.user.programStartDate).toLocaleDateString('fr-FR') : '—'}</div></div>
    </div>
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Jours nutrition alloués</div><div class="u-li-t">{data.user?.nutritionDaysAllocated ?? 0} jours</div></div>
    </div>
    {#if data.user?.subscriptionEndsAt}
    <div class="u-li">
      <div class="u-li-b"><div class="u-li-s">Abonnement jusqu'au</div><div class="u-li-t">{new Date(data.user.subscriptionEndsAt).toLocaleDateString('fr-FR')}</div></div>
    </div>
    {/if}
  </div>
</details>

<div style="height:24px"></div>

<style>
/* ── Hero Profil ── */
.profil-hero {
  position: relative;
  overflow: hidden;
  background: var(--s1);
  padding: 28px 18px 22px;
  border-bottom: 1px solid var(--br);
  flex-shrink: 0;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.profil-hero::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gb), transparent);
  opacity: .4;
}
.ph-depth { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.ph-logo {
  position: absolute;
  width: 110px; height: auto;
  object-fit: contain;
  opacity: .11;
  filter: saturate(0) brightness(2);
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
}
.ph-logo-glow {
  position: absolute;
  width: 150px; height: 150px;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201,168,78,.15) 0%, rgba(201,168,78,.05) 45%, transparent 70%);
  filter: blur(16px);
}
.ph-inner { position: relative; z-index: 4; }

/* Top row: avatar + level block */
.ph-top-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}
.ph-avatar {
  width: 46px; height: 46px;
  border-radius: 50%;
  background: var(--s3);
  border: 1.5px solid var(--g);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fh2);
  font-size: 1.375rem;
  color: var(--g);
  flex-shrink: 0;
  animation: gGlow 2.5s ease-in-out infinite;
}
.ph-level-block { flex: 1; min-width: 0; }
.ph-level-name {
  font-family: var(--fh2);
  font-size: 1.5rem;
  color: var(--gb);
  letter-spacing: -.01em;
  line-height: .95;
  text-shadow: 0 0 18px rgba(201,168,78,.4);
}
.ph-level-num {
  font-size: .5625rem;
  color: var(--g);
  letter-spacing: .14em;
  text-transform: uppercase;
  margin-top: 3px;
  font-family: var(--fb);
  font-weight: 600;
}
.ph-bar-wrap { display: flex; align-items: center; gap: 7px; margin-top: 7px; }
.ph-bar { flex: 1; height: 3px; background: var(--br2); position: relative; }
.ph-fill { height: 3px; background: linear-gradient(90deg, var(--g), var(--gb)); box-shadow: 0 0 8px rgba(201,168,78,.4); transition: width .9s cubic-bezier(.22,1,.36,1); }
.ph-bar-pct { font-size: .5rem; color: var(--g); font-family: var(--fb); font-weight: 700; white-space: nowrap; }

.ph-name { font-family: var(--fb); font-size: .875rem; font-weight: 600; color: var(--tx); }
.ph-email { font-size: .5625rem; color: var(--txd); font-family: var(--fb); margin-top: 2px; }

/* Stats row sous le nom */
.ph-stats-row { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
.ph-stat { display: flex; align-items: baseline; gap: 3px; }
.ph-sv { font-size: .75rem; font-weight: 700; font-family: var(--fh); color: var(--tx); }
.ph-sl { font-size: .4375rem; color: var(--txd); font-family: var(--fb); text-transform: uppercase; letter-spacing: .06em; }
.ph-latest-badge {
  margin-top: 8px;
  font-size: .5rem;
  color: var(--g);
  font-family: var(--fb);
  letter-spacing: .04em;
  opacity: .8;
}

/* ── Accordions ── */
.acc {
  border-bottom: 1px solid var(--br);
}
.acc-sum {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  list-style: none;
  user-select: none;
}
.acc-sum::-webkit-details-marker { display: none; }
.acc-sum:active { background: rgba(255,255,255,.03); }
.acc-title {
  font-family: var(--fh2);
  font-size: 1rem;
  color: var(--tx);
  letter-spacing: .05em;
  flex: 1;
  line-height: 1;
}
.acc-sub {
  font-size: .5rem;
  color: var(--txd);
  font-family: var(--fb);
  white-space: nowrap;
}
.acc-arr {
  width: 5px; height: 5px;
  border-right: 1.5px solid var(--txd);
  border-top: 1.5px solid var(--txd);
  transform: rotate(135deg);
  transition: transform .18s;
  flex-shrink: 0;
  margin-left: 4px;
}
details[open] .acc-arr { transform: rotate(-45deg); }
.acc-body { padding-bottom: 4px; }

/* Utils */
.unit { font-size: .625rem; color: var(--txd); margin-left: 1px; font-family: var(--fb); }
.empty-row { padding: 12px 18px; font-size: .625rem; color: var(--txd); font-family: var(--fb); }
.detail { font-size: .6875rem; color: var(--tx2); line-height: 1.4; white-space: normal; }
.score-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.score-bar { font-size: .5rem; color: var(--cy); letter-spacing: .06em; font-family: monospace; }
.score-val { font-size: .5625rem; color: var(--txd); font-family: var(--fb); }
</style>
