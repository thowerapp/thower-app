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
