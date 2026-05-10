<script lang="ts">
  import { enhance } from '$app/forms';
  import { fireElement } from '$lib/utils/particles';

  type TaskItem = { id: string; label: string; pts: number; done: boolean };

  interface Props {
    items: TaskItem[];
    validated: boolean;
    pointsEarned?: number;
    formAction?: string;
    resetAction?: string;
    onSuccess?: (pts: number) => void;
  }

  let {
    items,
    validated,
    pointsEarned = 0,
    formAction = '?/validateChecklist',
    resetAction,
    onSuccess
  }: Props = $props();

  let checked = $state<Set<string>>(new Set());
  let submitting = $state(false);
  let earnedFeedback = $state<number | null>(null);

  const ptsSelected = $derived(
    validated
      ? items.filter((i) => i.done).reduce((s, i) => s + i.pts, 0)
      : items.filter((i) => checked.has(i.id)).reduce((s, i) => s + i.pts, 0)
  );

  function handleToggle(e: MouseEvent, id: string) {
    if (validated) return;
    fireElement(e.currentTarget as HTMLElement, e);
    const next = new Set(checked);
    if (next.has(id)) next.delete(id); else next.add(id);
    checked = next;
  }
</script>

{#if validated}
  <div class="dl-locked-bar">
    <span class="dl-lock-ico">🔒</span>
    <span>Validée — <strong>+{pointsEarned} pts</strong> gagnés aujourd'hui</span>
  </div>
{/if}

<form
  method="POST"
  action={formAction}
  use:enhance={() => {
    submitting = true;
    return async ({ result, update }) => {
      submitting = false;
      if (result.type === 'success' && result.data && 'pointsEarned' in result.data) {
        const pts = Number(result.data.pointsEarned ?? 0);
        await update({ invalidateAll: true });
        if (onSuccess) {
          onSuccess(pts);
        } else {
          earnedFeedback = pts;
          setTimeout(() => { earnedFeedback = null; }, 2800);
        }
      } else {
        await update({ invalidateAll: true });
      }
    };
  }}
>
  {#each items as item (item.id)}
    {@const isChecked = validated ? item.done : checked.has(item.id)}
    <button
      type="button"
      class="dl-item"
      class:checked={isChecked}
      onclick={(e) => handleToggle(e, item.id)}
      disabled={validated}
    >
      <input type="checkbox" name="taskIds" value={item.id} checked={isChecked} hidden />
      <div class="dl-box" class:on={isChecked}>
        {#if isChecked}
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5l2.5 2.5 5-5" stroke="var(--s1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/if}
      </div>
      <div class="dl-lbl" class:done={isChecked}>{item.label}</div>
      <div class="dl-pts" class:earned={isChecked}>
        {isChecked ? item.pts + ' pts' : '+' + item.pts + ' pts'}
      </div>
    </button>
  {/each}

  {#if !validated}
    <div class="dl-footer">
      <div class="dl-total">
        <span class="dl-total-lbl">Sélection</span>
        <span class="dl-total-val" class:glow={ptsSelected > 0}>{ptsSelected} pts</span>
      </div>
      <button type="submit" class="dl-submit" disabled={checked.size === 0 || submitting}>
        {submitting ? 'Validation…' : 'Valider la sélection'}
      </button>
    </div>
    <p class="dl-note">Une fois validée, la checklist du jour est verrouillée.</p>
  {/if}
</form>

{#if earnedFeedback !== null}
  <div class="dl-earned">+{earnedFeedback} pts gagnés !</div>
{/if}

{#if resetAction && import.meta.env.DEV}
  <form method="POST" action={resetAction} use:enhance={() => async ({ update }) => { await update(); }}>
    <button type="submit" class="dl-reset-btn">↺ Reset checklist (dev)</button>
  </form>
{/if}

<style>
.dl-locked-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: rgba(201, 168, 78, 0.07);
  border-bottom: 1px solid rgba(201, 168, 78, 0.15);
  font-size: 0.5rem; color: var(--g); letter-spacing: 0.06em; font-family: var(--fb);
}
.dl-lock-ico { font-size: 0.75rem; }

.dl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--br);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  text-align: left;
  transition: background 0.13s;
}
.dl-item:last-of-type { border-bottom: none; }
.dl-item.checked { background: rgba(0, 229, 255, 0.04); }
.dl-item:disabled { cursor: default; }

.dl-box {
  flex-shrink: 0;
  width: 18px; height: 18px;
  border: 1.5px solid var(--br2);
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.13s, background 0.13s;
}
.dl-box.on { border-color: var(--cy); background: var(--cy); }

.dl-lbl {
  flex: 1;
  font-size: 0.5625rem;
  color: var(--tx);
  font-family: var(--fb);
}

.dl-pts {
  font-size: 0.4375rem;
  color: var(--cy);
  font-family: var(--fb);
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.dl-pts.earned { color: var(--g); }

.dl-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid var(--br);
  gap: 10px;
}
.dl-total { display: flex; flex-direction: column; }
.dl-total-lbl {
  font-size: 0.375rem;
  color: var(--txd);
  font-family: var(--fb);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.dl-total-val {
  font-size: 0.625rem;
  color: var(--txd);
  font-family: var(--fh2);
  transition: color 0.2s;
}
.dl-total-val.glow { color: var(--cy); text-shadow: 0 0 10px rgba(0, 229, 255, 0.4); }

.dl-submit {
  padding: 8px 16px;
  background: var(--cy);
  color: var(--s1);
  border: none;
  border-radius: var(--br);
  font-size: 0.5rem;
  font-family: var(--fb);
  letter-spacing: 0.08em;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.dl-submit:disabled { opacity: 0.35; cursor: default; }
.dl-submit:not(:disabled):active { transform: scale(0.97); opacity: 0.85; }

.dl-note {
  margin: 0;
  padding: 6px 14px 10px;
  font-size: 0.375rem;
  color: var(--txd);
  font-family: var(--fb);
  letter-spacing: 0.04em;
}

.dl-earned {
  margin: 8px 14px 4px;
  padding: 8px 12px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--g);
  border: 1px solid rgba(201, 168, 78, 0.35);
  background: rgba(201, 168, 78, 0.08);
  border-radius: 8px;
  font-family: var(--fb);
}

.dl-reset-btn {
  display: block; width: 100%;
  padding: 7px 14px;
  background: transparent;
  border: none; border-top: 1px dashed rgba(255, 80, 80, 0.25);
  color: rgba(255, 80, 80, 0.5);
  font-size: 0.375rem; font-family: var(--fb); letter-spacing: 0.06em;
  cursor: pointer; text-align: center;
  touch-action: manipulation;
}
.dl-reset-btn:active { color: rgba(255, 80, 80, 0.9); }
</style>
