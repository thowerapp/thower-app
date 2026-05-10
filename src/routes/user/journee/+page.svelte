<script lang="ts">
import type { PageData } from './$types';
import DailyChecklist from '$lib/components/DailyChecklist.svelte';

let { data } = $props<{ data: PageData }>();

// Tâches complétées : STANDARD validées + VIDEO auto-complétées
const countDone = $derived(
  data.items.filter((i: { done: boolean }) => i.done).length
);
// Points STANDARD (validés manuellement) + VIDEO (auto)
const ptsChecklist = $derived(
  (data.validated ? data.pointsEarned : 0) + (data.pointsVideoEarned ?? 0)
);
</script>

<div class="u-back-row">
  <a href="/user" class="u-back-lnk">
    <svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="u-back-lbl">Accueil</span>
  </a>
  <div class="u-back-head">Journée</div>
</div>

<!-- Hero -->
<div class="u-hero">
  <div class="u-hero-top">
    <div>
      <div class="u-hero-title">Journée</div>
      <div class="u-hero-sub">{data.todayLabel}</div>
    </div>
    <svg class="u-logo-svg" viewBox="0 0 44 38" fill="none">
      <polygon points="22,2 42,36 2,36" fill="#2A1E0C"/>
      <polygon points="22,2 42,36 22,24" fill="#3A2810"/>
    </svg>
  </div>
</div>

<!-- Section checklist -->
<div class="u-sh">
  <div class="u-sh-t">Ma checklist du jour</div>
  <div class="u-sh-s">{countDone} / {data.items.length} complétées</div>
</div>

<DailyChecklist
  items={data.items}
  validated={data.validated}
  pointsEarned={data.pointsEarned}
  pointsVideoEarned={data.pointsVideoEarned ?? 0}
/>

<!-- Stats -->
<div class="u-stats-row">
  <div class="u-sbox">
    <div class="u-sv">{data.validated ? data.pointsEarned : 0}</div>
    <div class="u-sl">Habitudes</div>
  </div>
  <div class="u-sbox">
    <div class="u-sv">{data.pointsVideoEarned ?? 0}</div>
    <div class="u-sl">Vidéo</div>
  </div>
  <div class="u-sbox">
    <div class="u-sv">{ptsChecklist}</div>
    <div class="u-sl">Total jour</div>
  </div>
</div>

<style>
.vid-card { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid var(--br); text-decoration:none; -webkit-tap-highlight-color:transparent; }
.vid-card:active { background:rgba(200,130,20,.04); }
.vid-thumb-wrap { position:relative; width:80px; height:50px; flex-shrink:0; border-radius:4px; overflow:hidden; background:var(--s2); }
.vid-thumb { width:100%; height:100%; object-fit:cover; display:block; }
.vid-thumb-empty { width:100%; height:100%; background:var(--s2); }
.vid-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.22); }
.vid-done-dot { width:10px; height:10px; border-radius:50%; background:var(--g); }
.vid-info { flex:1; }
.vid-badge { font-size:.4rem; color:var(--g); letter-spacing:.12em; text-transform:uppercase; font-family:var(--fb); margin-bottom:3px; }
.vid-title { font-size:.75rem; color:var(--tx); font-family:var(--fb); font-weight:600; line-height:1.3; }
.vid-pts { font-size:.6875rem; color:var(--txd); font-family:var(--fb); flex-shrink:0; }
.vid-pts.earned { color:var(--g); }
.vid-watched .vid-overlay { background:rgba(0,0,0,.35); }
</style>
