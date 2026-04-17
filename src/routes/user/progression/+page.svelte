<script lang="ts">
import type { PageData } from './$types';
import EmberCanvas from '$lib/components/EmberCanvas.svelte';
import { fireElement } from '$lib/utils/particles';

let { data } = $props<{ data: PageData }>();
function fire(e: MouseEvent) { fireElement(e.currentTarget as HTMLElement, e); }

const photoLabels = [
  { key: 'FRONT', label: 'Face' },
  { key: 'SIDE',  label: 'Profil' },
  { key: 'BACK',  label: 'Dos' },
];
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

<!-- Photos du mois -->
<div class="u-sh"><div class="u-sh-t">Photos du mois {data.currentMonth}</div><div class="u-sh-s">3 angles requis</div></div>
<div class="photo-grid">
  {#each photoLabels as ph}
    <button type="button" class="pcell" class:filled={!!data.photoMap[ph.key]} onclick={fire}>
      <div class="pc-plus" style={data.photoMap[ph.key] ? 'color:var(--g)' : ''}>
        {data.photoMap[ph.key] ? '✓' : '+'}
      </div>
      <div class="pc-lbl" style={data.photoMap[ph.key] ? 'color:var(--g)' : ''}>{ph.label}</div>
    </button>
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
  font-family: var(--fh2);
  font-size: 3rem;
  color: var(--gb);
  letter-spacing: -.01em;
  line-height: .9;
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
.pcell { aspect-ratio:3/4; background:var(--s2); border:1px dashed var(--br2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; -webkit-tap-highlight-color:transparent; cursor:pointer; }
.pcell:active { background:var(--s3); border-color:var(--gd); }
.pcell.filled { border:1px solid var(--br2); }
.pc-plus { font-size:1rem; color:var(--txd); }
.pc-lbl { font-size:.5625rem; color:var(--txd); text-align:center; font-family:var(--fb); }

/* Barème points */
.pts-row { display: flex; align-items: baseline; gap: 4px; }
.pts-val { color: var(--cy); font-weight: 700; text-shadow: 0 0 6px rgba(0,229,255,.3); }
.pts-alt { font-size: .5rem; color: var(--txd); }
</style>
