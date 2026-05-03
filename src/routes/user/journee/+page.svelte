<script lang="ts">
import type { PageData } from './$types';
import { enhance } from '$app/forms';
import { fireElement } from '$lib/utils/particles';

let { data } = $props<{ data: PageData }>();

type TaskItem = {
  id: string;
  label: string;
  pts: number;
  done: boolean;
};

let checked = $state<Set<string>>(new Set());
let submitting = $state(false);
let earnedFeedback = $state<number | null>(null);

$effect(() => {
  if (data.validated) {
    checked = new Set(data.items.filter((item: TaskItem) => item.done).map((item: TaskItem) => item.id));
    return;
  }
  checked = new Set();
});

const countDone = $derived(
  data.validated
    ? data.items.filter((item: TaskItem) => item.done).length
    : checked.size
);

const ptsChecklist = $derived(
  data.validated
    ? data.items
        .filter((item: TaskItem) => item.done)
        .reduce((sum: number, item: TaskItem) => sum + (item.pts ?? 0), 0)
    : data.items
        .filter((item: TaskItem) => checked.has(item.id))
        .reduce((sum: number, item: TaskItem) => sum + (item.pts ?? 0), 0)
);

function handleToggle(e: MouseEvent, id: string) {
  if (data.validated) return;
  fireElement(e.currentTarget as HTMLElement, e);
  const next = new Set(checked);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  checked = next;
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

{#if data.dayVideo}
  {@const dv = data.dayVideo as { id: string; title: string; thumbnailUrl: string | null; pts: number }}
  <a href="/user/decouverte/motivation/{dv.id}" class="vid-card">
    <div class="vid-thumb-wrap">
      {#if dv.thumbnailUrl}
        <img class="vid-thumb" src={dv.thumbnailUrl} alt="" />
      {:else}
        <div class="vid-thumb vid-thumb-empty"></div>
      {/if}
      <div class="vid-overlay">
        <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="2,1 11,6 2,11" fill="white"/></svg>
      </div>
    </div>
    <div class="vid-info">
      <div class="vid-badge">VIDÉO DU JOUR</div>
      <div class="vid-title">{dv.title}</div>
    </div>
    <div class="vid-pts">+{dv.pts} pts</div>
  </a>
{/if}

<!-- Section checklist -->
<div class="u-sh">
  <div class="u-sh-t">Ma checklist du jour</div>
  <div class="u-sh-s">{countDone} / {data.items.length} sélectionnées</div>
</div>

<div class="checklist">
  <form
    method="POST"
    action="?/validateChecklist"
    use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success' && result.data && 'pointsEarned' in result.data) {
					earnedFeedback = Number(result.data.pointsEarned ?? 0);
					setTimeout(() => {
						earnedFeedback = null;
					}, 2800);
				}
				await update({ invalidateAll: true });
			};
		}}
  >
    {#each data.items as item (item.id)}
      {@const isChecked = data.validated ? item.done : checked.has(item.id)}
      <button
        type="button"
        class="u-citem"
        class:pending={!isChecked}
        onclick={(e) => handleToggle(e, item.id)}
        disabled={data.validated}
      >
        <input type="checkbox" name="taskIds" value={item.id} checked={isChecked} hidden />
        <div class="u-cbox" class:done={isChecked} class:idle={!isChecked}>
          {#if isChecked}
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5l2.5 2.5 5-5" stroke="var(--s1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </div>
        <div class="u-clbl" class:done={isChecked}>{item.label}</div>
        <div class="u-cpts" class:earned={isChecked}>
          {isChecked ? item.pts + ' pts' : '+' + item.pts + ' pts'}
        </div>
      </button>
    {/each}

    {#if !data.validated}
      <div class="checklist-footer">
        <div class="checklist-total">{ptsChecklist} pts sélectionnés</div>
        <button type="submit" class="checklist-submit" disabled={checked.size === 0 || submitting}>
          {submitting ? 'Validation…' : 'Valider la sélection'}
        </button>
      </div>
      <p class="checklist-note">Une fois validée, la checklist du jour est verrouillée.</p>
    {:else}
      <div class="checklist-validated">Checklist validée ✓ · +{data.pointsEarned} pts</div>
    {/if}
  </form>

  {#if earnedFeedback !== null}
    <div class="checklist-earned">+{earnedFeedback} pts gagnés</div>
  {/if}
</div>

<!-- Stats -->
<div class="u-stats-row">
  <div class="u-sbox"><div class="u-sv">{ptsChecklist}</div><div class="u-sl">Checklist</div></div>
  <div class="u-sbox"><div class="u-sv">0</div><div class="u-sl">Séance</div></div>
  <div class="u-sbox"><div class="u-sv">{ptsChecklist}</div><div class="u-sl">Total jour</div></div>
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

.checklist { padding: 4px 0; }
.checklist-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 18px 6px;
}
.checklist-total {
  font-size: 0.6875rem;
  color: var(--tx2);
  font-family: var(--fb);
}
.checklist-submit {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--s1);
  background: var(--cy);
  cursor: pointer;
}
.checklist-submit:disabled {
  opacity: 0.45;
  cursor: default;
}
.checklist-note {
  padding: 0 18px 8px;
  font-size: 0.625rem;
  color: var(--txd);
  font-family: var(--fb);
}
.checklist-validated {
  padding: 10px 18px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--g);
  font-family: var(--fb);
}
.checklist-earned {
  margin: 8px 18px 2px;
  padding: 8px 10px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--g);
  border: 1px solid rgba(201, 168, 78, 0.35);
  background: rgba(201, 168, 78, 0.08);
  border-radius: 8px;
}
</style>

