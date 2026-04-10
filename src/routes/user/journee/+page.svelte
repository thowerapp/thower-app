<script lang="ts">
import type { PageData } from './$types';
import { enhance } from '$app/forms';
import { fireElement, registerSources } from '$lib/utils/particles';

let { data } = $props<{ data: PageData }>();

// État local optimiste : copie des items serveur
let items = $state(data.items.map(i => ({ ...i })));

// Synchronise quand les données serveur changent (navigation / invalidation)
$effect(() => {
  items = data.items.map(i => ({ ...i }));
});

let ptsChecklist = $derived(items.filter(i => i.done).reduce((s, i) => s + (i.pts ?? 0), 0));
let countDone    = $derived(items.filter(i => i.done).length);

function handleToggle(e: MouseEvent & { currentTarget: HTMLButtonElement }, idx: number) {
  // Optimistic update
  items[idx].done = !items[idx].done;
  fireElement(e.currentTarget);
  // Re-scan les sources après changement d'état
  setTimeout(() => registerSources(document.body), 40);
}
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
  <div class="u-sh-s">{countDone} / {items.length} complétées</div>
</div>

<div class="checklist">
  {#each items as item, idx}
    <form
      method="POST"
      action="?/toggleTask"
      use:enhance={() => {
        // L'optimistic update est déjà fait dans handleToggle
        return async ({ update }) => { await update({ invalidateAll: true }); };
      }}
    >
      <input type="hidden" name="taskId" value={item.id} />
      <input type="hidden" name="done" value={String(item.done)} />
      <button
        type="submit"
        class="u-citem"
        class:pending={!item.done}
        onclick={(e) => handleToggle(e, idx)}
      >
        <div class="u-cbox" class:done={item.done} class:idle={!item.done}>
          {#if item.done}
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5l2.5 2.5 5-5" stroke="var(--s1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </div>
        <div class="u-clbl" class:done={item.done}>{item.label}</div>
        <div class="u-cpts" class:earned={item.done}>
          {item.done ? item.pts + ' pts' : '+' + item.pts + ' pts'}
        </div>
      </button>
    </form>
  {/each}
</div>

<!-- Stats -->
<div class="u-stats-row">
  <div class="u-sbox"><div class="u-sv">{ptsChecklist}</div><div class="u-sl">Checklist</div></div>
  <div class="u-sbox"><div class="u-sv">0</div><div class="u-sl">Séance</div></div>
  <div class="u-sbox"><div class="u-sv">{ptsChecklist}</div><div class="u-sl">Total jour</div></div>
</div>

<style>
.checklist { padding: 4px 0; }
</style>

