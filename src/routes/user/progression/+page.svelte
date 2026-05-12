<script lang="ts">
import type { PageData } from './$types';
import EmberCanvas from '$lib/components/EmberCanvas.svelte';
import { fireElement } from '$lib/utils/particles';
import { enhance } from '$app/forms';
import { toast } from 'svelte-sonner';
import { Button } from '$shadcn/button';
import { Input } from '$shadcn/input';

let { data } = $props<{ data: PageData }>();
function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement, e); }

let regenerating = $state(false);
let regenerateDone = $state(false);

const photoLabels = [
  { key: 'FRONT', label: 'Face' },
  { key: 'SIDE',  label: 'Profil' },
  { key: 'BACK',  label: 'Dos' },
];

// État du formulaire check-in
let submitCheckInLoading = $state(false);
let checkInMetrics = $state({
  stressLevel: '',
  sleepQuality: '',
  bodyConfidence: '',
  digestionQuality: '',
  happinessLevel: '',
  readinessToChange: ''
});
let checkInPhotos = $state({
  frontUrl: '',
  sideUrl: '',
  backUrl: ''
});

let photoUploading = $state({ FRONT: false, SIDE: false, BACK: false });
let photoError = $state<string | null>(null);

function triggerPhotoInput(angle: 'FRONT' | 'SIDE' | 'BACK') {
  (document.getElementById(`photo-input-${angle}`) as HTMLInputElement)?.click();
}

async function handlePhotoFileChange(e: Event, angle: 'FRONT' | 'SIDE' | 'BACK') {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  photoUploading = { ...photoUploading, [angle]: true };
  photoError = null;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/cloudflare/r2/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      photoError = err.error ?? 'Erreur upload photo';
      return;
    }
    const { url } = await res.json() as { url: string };
    if (angle === 'FRONT') checkInPhotos.frontUrl = url;
    else if (angle === 'SIDE') checkInPhotos.sideUrl = url;
    else checkInPhotos.backUrl = url;
  } catch {
    photoError = 'Erreur réseau';
  } finally {
    photoUploading = { ...photoUploading, [angle]: false };
  }
}

const checkInMetricsComplete = $derived(
  checkInMetrics.stressLevel !== '' &&
  checkInMetrics.sleepQuality !== '' &&
  checkInMetrics.bodyConfidence !== '' &&
  checkInMetrics.digestionQuality !== '' &&
  checkInMetrics.happinessLevel !== '' &&
  checkInMetrics.readinessToChange !== ''
);

</script>

<div class="u-back-row">
  <a href="/user" class="u-back-lnk">
    <svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="u-back-lbl">Accueil</span>
  </a>
  <div class="u-back-head">Progression</div>
</div>

<!-- Hero immersif avec flames -->
<div class="prog-hero">
  <EmberCanvas active={true} />
  <div class="ph-inner">
    <div class="ph-eyebrow">Semaine {data.currentWeek} · Jour {data.currentDayIndex} / 91</div>
    <div class="ph-level">{data.levelData.name}</div>
    <div class="ph-level-num">Niveau {data.levelData.num}</div>

    <!-- Grande barre de progression -->
    <div class="ph-bar-wrap">
      <div class="ph-bar">
        <div class="ph-fill" style="width:{data.levelPercent}%"></div>
        <div class="ph-cursor" style="left:{data.levelPercent}%">
          <div class="ph-cursor-label">{data.levelPercent}%</div>
        </div>
      </div>
      <div class="ph-bar-limits">
        <span>Niveau {data.levelData.num} — {data.levelData.min} pts</span>
        {#if data.levelData.next}
          <span class="ph-next">{data.levelData.nextMin} pts → {data.levelData.next}</span>
        {:else}
          <span class="ph-next">Niveau max ★</span>
        {/if}
      </div>
    </div>

    <!-- KPIs -->
    <div class="ph-kpis">
      <div class="ph-kpi">
        <div class="ph-kv">{data.totalPoints}</div>
        <div class="ph-kl">Points</div>
      </div>
      <div class="ph-kpi-sep"></div>
      <div class="ph-kpi">
        <div class="ph-kv">{data.workoutCount}</div>
        <div class="ph-kl">Séances</div>
      </div>
      <div class="ph-kpi-sep"></div>
      <div class="ph-kpi">
        <div class="ph-kv">{data.scorePercent}%</div>
        <div class="ph-kl">Score global</div>
      </div>
    </div>
  </div>
</div>

<!-- Badges -->
<div class="u-sh">
  <div class="u-sh-t">Mes badges</div>
  <div class="u-sh-s">{data.userBadges.length} obtenu{data.userBadges.length > 1 ? 's' : ''}</div>
</div>

{#if data.userBadges.length > 0}
  {#each data.userBadges as badge (badge.id)}
    <div class="u-li">
      <div class="u-li-th" style="background:var(--gd)">
        <div style="width:9px;height:9px;border:1.5px solid var(--gb)"></div>
      </div>
      <div class="u-li-b">
        <div class="u-li-t">{badge.name}</div>
        <div class="u-li-s" style="color:var(--g)">{badge.awardedAt ? 'Obtenu · ' + new Date(badge.awardedAt).toLocaleDateString('fr-FR') : 'Débloqué'}</div>
      </div>
    </div>
  {/each}
{:else}
  <!-- Badges verrouillés (exemples depuis le schéma) -->
  <div class="u-li" style="opacity:.45">
    <div class="u-li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
    <div class="u-li-b"><div class="u-li-t">7 jours consécutifs</div><div class="u-li-s">Compléter la checklist 7 jours d'affilée</div></div>
    <div class="u-li-r"><div class="u-arr"></div></div>
  </div>
  <div class="u-li" style="opacity:.45">
    <div class="u-li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
    <div class="u-li-b"><div class="u-li-t">21 respirations validées</div><div class="u-li-s">Compléter 21 séances breathwork</div></div>
    <div class="u-li-r"><div class="u-arr"></div></div>
  </div>
  <div class="u-li" style="opacity:.45">
    <div class="u-li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
    <div class="u-li-b"><div class="u-li-t">Semaine parfaite</div><div class="u-li-s">Toutes les tâches validées sur 7 jours</div></div>
    <div class="u-li-r"><div class="u-arr"></div></div>
  </div>
  <div class="u-li" style="opacity:.45">
    <div class="u-li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
    <div class="u-li-b"><div class="u-li-t">3 séances en 1 semaine</div><div class="u-li-s">Valider A + B + C la même semaine</div></div>
    <div class="u-li-r"><div class="u-arr"></div></div>
  </div>
  <div class="u-li" style="opacity:.45">
    <div class="u-li-th"><div style="width:9px;height:9px;border-radius:50%;background:var(--br2)"></div></div>
    <div class="u-li-b"><div class="u-li-t">Photos 3 angles (Mois {data.currentMonth})</div><div class="u-li-s">Uploader Face + Profil + Dos</div></div>
    <div class="u-li-r"><div class="u-arr"></div></div>
  </div>
{/if}

<!-- Système de points — règles -->
<div class="u-sh"><div class="u-sh-t">Barème de points</div><div class="u-sh-s">Programme Méthode Thower</div></div>
<div class="u-li">
  <div class="u-li-b"><div class="u-li-s">Séance validée</div><div class="u-li-t pts-row"><span class="pts-val">+50 pts</span></div></div>
</div>
<div class="u-li">
  <div class="u-li-b"><div class="u-li-s">Tâche journalière cochée</div><div class="u-li-t pts-row"><span class="pts-val">+5 pts</span><span class="pts-alt"> (tabac/alcool : +10 pts)</span></div></div>
</div>
<div class="u-li">
  <div class="u-li-b"><div class="u-li-s">Vidéo du jour regardée</div><div class="u-li-t pts-row"><span class="pts-val">+5 pts</span></div></div>
</div>
<div class="u-li">
  <div class="u-li-b"><div class="u-li-s">Photos de progression uploadées</div><div class="u-li-t pts-row"><span class="pts-val">+25 pts</span></div></div>
</div>
<div class="u-li">
  <div class="u-li-b"><div class="u-li-s">Badge débloqué</div><div class="u-li-t pts-row"><span class="pts-val">+100 pts</span></div></div>
</div>
<div class="u-li">
  <div class="u-li-b"><div class="u-li-s">Défi 30 jours complété</div><div class="u-li-t pts-row"><span class="pts-val">+200 pts</span></div></div>
</div>

<!-- Check-in mensuel (si dû) -->
{#if data.checkInDue}
  <div class="u-sh"><div class="u-sh-t">Check-in du mois {data.currentMonth}</div><div class="u-sh-s">Rapportez votre bien-être · +100 pts</div></div>
  <div style="padding: 18px; background: var(--s2); border-bottom: 1px solid var(--br); margin-bottom: 12px;">
    <form
      method="POST"
      action="?/submitMonthlyCheckIn"
      use:enhance={() => {
        submitCheckInLoading = true;
        return async ({ result, update }) => {
          submitCheckInLoading = false;
          if (result.type === 'success') {
            toast.success('Check-in soumis ! +100 points gagnés.');
            await update();
            // Réinitialiser le formulaire
            checkInMetrics = { stressLevel: '', sleepQuality: '', bodyConfidence: '', digestionQuality: '', happinessLevel: '', readinessToChange: '' };
            checkInPhotos = { frontUrl: '', sideUrl: '', backUrl: '' };
          } else if (result.type === 'failure') {
            toast.error((result.data as { message?: string })?.message || 'Erreur');
          }
        };
      }}
      class="space-y-4"
    >
      <!-- Métriques bien-être (1-10) -->
      <div class="checkin-grid">
        <div class="checkin-field">
          <label for="stressLevel">Stress (1-10)</label>
          <Input
            id="stressLevel"
            type="number"
            name="stressLevel"
            min="1"
            max="10"
            bind:value={checkInMetrics.stressLevel}
            placeholder="—"
            disabled={submitCheckInLoading}
            required
          />
        </div>
        <div class="checkin-field">
          <label for="sleepQuality">Sommeil (1-10)</label>
          <Input
            id="sleepQuality"
            type="number"
            name="sleepQuality"
            min="1"
            max="10"
            bind:value={checkInMetrics.sleepQuality}
            placeholder="—"
            disabled={submitCheckInLoading}
            required
          />
        </div>
        <div class="checkin-field">
          <label for="bodyConfidence">Confiance (1-10)</label>
          <Input
            id="bodyConfidence"
            type="number"
            name="bodyConfidence"
            min="1"
            max="10"
            bind:value={checkInMetrics.bodyConfidence}
            placeholder="—"
            disabled={submitCheckInLoading}
            required
          />
        </div>
        <div class="checkin-field">
          <label for="digestionQuality">Digestion (1-10)</label>
          <Input
            id="digestionQuality"
            type="number"
            name="digestionQuality"
            min="1"
            max="10"
            bind:value={checkInMetrics.digestionQuality}
            placeholder="—"
            disabled={submitCheckInLoading}
            required
          />
        </div>
        <div class="checkin-field">
          <label for="happinessLevel">Bonheur (1-10)</label>
          <Input
            id="happinessLevel"
            type="number"
            name="happinessLevel"
            min="1"
            max="10"
            bind:value={checkInMetrics.happinessLevel}
            placeholder="—"
            disabled={submitCheckInLoading}
            required
          />
        </div>
        <div class="checkin-field">
          <label for="readinessToChange">Motivation (1-10)</label>
          <Input
            id="readinessToChange"
            type="number"
            name="readinessToChange"
            min="1"
            max="10"
            bind:value={checkInMetrics.readinessToChange}
            placeholder="—"
            disabled={submitCheckInLoading}
            required
          />
        </div>
      </div>

      <!-- Photos du check-in mensuel -->
      <div class="space-y-2">
        <div style="font-size:.75rem;font-weight:600;color:var(--txd);font-family:var(--fb);letter-spacing:.05em;text-transform:uppercase;">Photos mois {data.currentMonth}</div>
        <input type="hidden" name="frontUrl" bind:value={checkInPhotos.frontUrl} />
        <input type="hidden" name="sideUrl" bind:value={checkInPhotos.sideUrl} />
        <input type="hidden" name="backUrl" bind:value={checkInPhotos.backUrl} />
        <div class="photo-upload-grid">
          {#each [
            { angle: 'FRONT' as const, label: 'Face',   urlKey: 'frontUrl' as const },
            { angle: 'SIDE'  as const, label: 'Profil', urlKey: 'sideUrl'  as const },
            { angle: 'BACK'  as const, label: 'Dos',    urlKey: 'backUrl'  as const }
          ] as ph}
            <div class="pu-cell">
              <input
                id="photo-input-{ph.angle}"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style="display:none"
                onchange={(e) => handlePhotoFileChange(e, ph.angle)}
              />
              <button
                type="button"
                class="pu-btn"
                class:pu-done={!!checkInPhotos[ph.urlKey]}
                disabled={submitCheckInLoading || photoUploading[ph.angle]}
                onclick={() => triggerPhotoInput(ph.angle)}
              >
                {#if photoUploading[ph.angle]}
                  <span class="pu-state">...</span>
                {:else if checkInPhotos[ph.urlKey]}
                  <img src={checkInPhotos[ph.urlKey]} alt={ph.label} class="pu-preview" />
                  <span class="pu-badge">✓</span>
                {:else}
                  <span class="pu-state">{ph.label}</span>
                {/if}
              </button>
            </div>
          {/each}
        </div>
        {#if photoError}
          <div class="pu-error">{photoError}</div>
        {/if}
      </div>

      <!-- Submit -->
      <Button
        type="submit"
        disabled={!checkInMetricsComplete || submitCheckInLoading}
        style="width: 100%;"
      >
        {submitCheckInLoading ? 'Soumission...' : 'Soumettre le check-in'}
      </Button>
    </form>
  </div>
{/if}

<!-- Recalibration nutrition (disponible 1x/mois après check-in) -->
{#if !data.checkInDue}
  <div class="u-sh">
    <div class="u-sh-t">Plan nutrition</div>
    <div class="u-sh-s">Recalibrage mensuel</div>
  </div>
  {#if data.nutritionRecalibratedThisMonth}
    <div class="recal-done">
      <span class="recal-done-ico">✓</span>
      <span>Plan nutrition recalibré ce mois — les nouveaux repas sont disponibles dans la section nutrition.</span>
    </div>
  {:else if data.canRecalibrateNutrition}
    <form
      method="POST"
      action="?/regenerateNutrition"
      use:enhance={() => {
        regenerating = true;
        return async ({ result, update }) => {
          await update({ reset: false });
          regenerating = false;
          if (result.type === 'success') regenerateDone = true;
        };
      }}
      class="recal-form"
    >
      <div class="recal-info">
        <div class="recal-info-t">Recalibrer mon plan nutrition</div>
        <div class="recal-info-s">Recalcule les repas selon ton poids et profil actuels · disponible 1×/mois</div>
      </div>
      <button type="submit" class="recal-btn" disabled={regenerating || regenerateDone}>
        {#if regenerating}
          Recalibrage…
        {:else if regenerateDone}
          Recalibré ✓
        {:else}
          Recalibrer
        {/if}
      </button>
    </form>
  {:else}
    <div class="recal-locked">
      <div class="recal-locked-t">Recalibrer mon plan nutrition</div>
      <div class="recal-locked-s">Complete ton profil (poids + % masse grasse) pour débloquer</div>
    </div>
  {/if}
{/if}

<!-- Photos d'inscription -->
<div class="u-sh"><div class="u-sh-t">Photos d'inscription</div><div class="u-sh-s">Référence de départ</div></div>
<div class="photo-grid">
  {#each photoLabels as ph}
    <div class="pcell filled">
      {#if data.inscriptionPhotoMap[ph.key]}
        <img src={data.inscriptionPhotoMap[ph.key]} alt={ph.label} class="pc-img" />
        <div class="pc-lbl" style="color:var(--g)">{ph.label}</div>
      {:else}
        <div class="pc-plus" style="color:var(--txd)">—</div>
        <div class="pc-lbl">{ph.label}</div>
      {/if}
    </div>
  {/each}
</div>

<!-- Photos du mois -->
<div class="u-sh"><div class="u-sh-t">Photos mois {data.currentMonth}</div><div class="u-sh-s">3 angles requis</div></div>
<div class="photo-grid">
  {#each photoLabels as ph}
    <div class="pcell" class:filled={!!data.photoMap[ph.key]}>
      {#if data.photoMap[ph.key]}
        <img src={data.photoMap[ph.key]} alt={ph.label} class="pc-img" />
        <div class="pc-lbl" style="color:var(--g)">{ph.label}</div>
      {:else}
        <div class="pc-plus">+</div>
        <div class="pc-lbl">{ph.label}</div>
      {/if}
    </div>
  {/each}
</div>

<style>
/* ── Hero Progression ── */
.prog-hero {
  position: relative;
  overflow: hidden;
  background: var(--s1);
  padding: 28px 18px 24px;
  border-bottom: 1px solid var(--br);
  flex-shrink: 0;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.prog-hero::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gb), transparent);
  opacity: .5;
}
.ph-inner { position: relative; z-index: 4; }
.ph-eyebrow { font-size: .625rem; color: var(--txd); letter-spacing: .12em; text-transform: uppercase; font-family: var(--fb); margin-bottom: 6px; }
.ph-level {
  font-family: var(--fh);
  font-size: 3rem;
  color: var(--gb);
  letter-spacing: -0.09em;
  line-height: .9;
  text-transform: uppercase;
  font-weight: 800;
  text-shadow: 0 0 30px rgba(201,168,78,.45), 0 0 60px rgba(201,168,78,.15);
  animation: gGlow 2.5s ease-in-out infinite;
}
.ph-level-num {
  font-size: .6875rem;
  color: var(--g);
  letter-spacing: .15em;
  text-transform: uppercase;
  margin-top: 5px;
  font-family: var(--fb);
  font-weight: 600;
}

/* Barre de progression */
.ph-bar-wrap { margin-top: 20px; }
.ph-bar {
  position: relative;
  height: 4px;
  background: var(--br2);
  overflow: visible;
}
.ph-fill {
  height: 4px;
  background: linear-gradient(90deg, var(--g), var(--gb));
  box-shadow: 0 0 10px rgba(201,168,78,.5), 0 0 20px rgba(201,168,78,.2);
}
.ph-cursor {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--gb);
  box-shadow: 0 0 8px var(--g), 0 0 4px #fff;
  z-index: 2;
}
.ph-cursor-label {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: .5625rem;
  font-weight: 700;
  color: var(--gb);
  font-family: var(--fh);
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(201,168,78,.5);
}
.ph-bar-limits {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  font-size: .5625rem;
  color: var(--txd);
  font-family: var(--fb);
}
.ph-next { color: var(--txd); }

/* KPIs */
.ph-kpis {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 22px;
}
.ph-kpi { flex: 1; text-align: center; }
.ph-kpi-sep { width: 1px; height: 32px; background: var(--br2); flex-shrink: 0; }
.ph-kv {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--cy);
  font-family: var(--fh);
  line-height: 1;
  text-shadow: 0 0 8px rgba(0,229,255,.3);
}
.ph-kl {
  font-size: .5625rem;
  color: var(--txd);
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-top: 4px;
  font-family: var(--fb);
}

/* Grille photos — unique à cette page */
.photo-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; padding:12px 18px 20px; }
.pcell { aspect-ratio:3/4; background:var(--s2); border:1px dashed var(--br2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; overflow:hidden; position:relative; }
.pcell.filled { border:1px solid var(--br2); }
.pc-img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.pc-plus { font-size:1rem; color:var(--txd); }
.pc-lbl { font-size:.5625rem; color:var(--txd); text-align:center; font-family:var(--fb); position:relative; z-index:1; background:rgba(0,0,0,.45); padding:1px 4px; border-radius:2px; }

/* Upload photos check-in */
.photo-upload-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pu-cell { position: relative; }
.pu-btn {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  background: var(--s3);
  border: 1px dashed var(--br2);
  cursor: pointer;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s;
}
.pu-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pu-btn.pu-done { border-color: var(--g); border-style: solid; }
.pu-state { font-size: .5rem; color: var(--txd); font-family: var(--fb); }
.pu-preview { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
.pu-badge {
  position: absolute; top: 4px; right: 4px;
  background: var(--g); color: var(--s1);
  font-size: .5rem; font-weight: 700; font-family: var(--fb);
  padding: 2px 5px;
}
.pu-error {
  font-size: .5625rem; color: var(--err, #f55);
  font-family: var(--fb); padding: 4px 0;
}

/* Check-in mensuel */
.checkin-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.checkin-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.checkin-field label {
  font-size: .75rem;
  font-weight: 600;
  color: var(--txd);
  text-transform: uppercase;
  letter-spacing: .05em;
}

/* Barème points */
.pts-row { display: flex; align-items: baseline; gap: 4px; }
.pts-val { color: var(--cy); font-weight: 700; text-shadow: 0 0 6px rgba(0,229,255,.3); }
.pts-alt { font-size: .5rem; color: var(--txd); }

/* Recalibration nutrition */
.recal-done {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--br);
  font-size: .5625rem; color: var(--g); font-family: var(--fb);
  background: rgba(201,168,78,.06);
}
.recal-done-ico { font-size: .75rem; flex-shrink: 0; }
.recal-form {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--br);
}
.recal-info { flex: 1; min-width: 0; }
.recal-info-t { font-size: .6875rem; font-weight: 500; color: var(--tx); font-family: var(--fb); }
.recal-info-s { font-size: .5rem; color: var(--txd); margin-top: 2px; font-family: var(--fb); }
.recal-btn {
  flex-shrink: 0;
  padding: 7px 14px;
  background: var(--cy);
  color: var(--s1);
  border: none;
  border-radius: var(--br);
  font-size: .5rem;
  font-family: var(--fb);
  letter-spacing: .08em;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}
.recal-btn:disabled { opacity: .45; cursor: default; }
.recal-locked {
  padding: 12px 18px;
  border-bottom: 1px solid var(--br);
  opacity: .45;
}
.recal-locked-t { font-size: .6875rem; font-weight: 500; color: var(--tx); font-family: var(--fb); }
.recal-locked-s { font-size: .5rem; color: var(--txd); margin-top: 2px; font-family: var(--fb); }
</style>
