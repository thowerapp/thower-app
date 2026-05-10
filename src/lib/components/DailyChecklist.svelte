<script lang="ts">
  import { enhance } from '$app/forms';
  import { fireElement } from '$lib/utils/particles';

  type VideoInfo = {
    id: string;
    title: string;
    cloudflareUid: string;
    thumbnailUrl: string | null;
    durationSeconds: number | null;
    category: string;
  };

  type TaskItem = {
    id: string;
    label: string;
    pts: number;
    done: boolean;
    type?: 'STANDARD' | 'VIDEO';
    video?: VideoInfo | null;
  };

  interface Props {
    items: TaskItem[];
    validated: boolean;
    pointsEarned?: number;
    pointsVideoEarned?: number;
    formAction?: string;
    resetAction?: string;
    onSuccess?: (pts: number) => void;
  }

  let {
    items,
    validated,
    pointsEarned = 0,
    pointsVideoEarned = 0,
    formAction = '?/validateChecklist',
    resetAction,
    onSuccess
  }: Props = $props();

  let checked = $state<Set<string>>(new Set());
  let submitting = $state(false);
  let earnedFeedback = $state<number | null>(null);

  // Points des tâches STANDARD cochées (soumises via le bouton)
  const ptsStandard = $derived(
    validated
      ? items.filter((i) => i.type !== 'VIDEO' && i.done).reduce((s, i) => s + i.pts, 0)
      : items.filter((i) => i.type !== 'VIDEO' && checked.has(i.id)).reduce((s, i) => s + i.pts, 0)
  );

  // Points VIDEO déjà acquis automatiquement
  const ptsVideo = $derived(
    items.filter((i) => i.type === 'VIDEO' && i.done).reduce((s, i) => s + i.pts, 0)
  );

  // Total affiché dans le footer
  const ptsSelected = $derived(ptsStandard + ptsVideo);

  // Les tâches VIDEO non encore regardées
  const hasUnwatchedVideo = $derived(
    items.some((i) => i.type === 'VIDEO' && !i.done)
  );

  // Au moins une tâche STANDARD cochée (pour activer le bouton)
  const hasCheckedStandard = $derived(
    items.some((i) => i.type !== 'VIDEO' && checked.has(i.id))
  );

  function handleToggle(e: MouseEvent, item: TaskItem) {
    if (validated) return;
    if (item.type === 'VIDEO') return;
    fireElement(e.currentTarget as HTMLElement, e);
    const next = new Set(checked);
    if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
    checked = next;
  }

  function formatDuration(v: number | null | undefined): string {
    if (!v || !Number.isFinite(v)) return '';
    const total = Math.round(v);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
</script>

{#if validated}
  <div class="dl-locked-bar">
    <span class="dl-lock-ico">🔒</span>
    <span>
      Habitudes validées — <strong>+{pointsEarned} pts</strong>
      {#if pointsVideoEarned > 0}
        · Vidéo <strong>+{pointsVideoEarned} pts</strong>
      {/if}
    </span>
  </div>
{:else if ptsVideo > 0}
  <div class="dl-video-bar">
    <span class="dl-video-ico">▶</span>
    <span>Vidéo regardée — <strong>+{ptsVideo} pts</strong> acquis</span>
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
    {@const isVideo = item.type === 'VIDEO'}

    {#if isVideo}
      <!-- Tâche VIDEO : jamais cochable manuellement -->
      <div class="dl-item dl-item-video" class:checked={isChecked}>
        {#if isChecked}
          <!-- Vidéo regardée : badge validé, pas de lien -->
          <div class="dl-box on">
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5l2.5 2.5 5-5" stroke="var(--s1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="dl-vid-link dl-vid-link-done">
            {#if item.video?.thumbnailUrl}
              <div class="dl-vid-thumb">
                <img src={item.video.thumbnailUrl} alt="" class="dl-vid-img" />
                <div class="dl-vid-overlay">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 5-5" stroke="var(--g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            {:else}
              <div class="dl-vid-thumb"><div class="dl-vid-img-empty"></div></div>
            {/if}
            <div class="dl-vid-info">
              <div class="dl-vid-badge">✓ Regardée</div>
              <div class="dl-lbl done">{item.label}</div>
            </div>
          </div>
        {:else if item.video}
          <!-- Vidéo non encore regardée : lien cliquable vers la vidéo -->
          <div class="dl-box"></div>
          <a
            href="/user/decouverte/{item.video.category.toLowerCase()}/{item.video.id}"
            class="dl-vid-link"
          >
            <div class="dl-vid-thumb">
              {#if item.video.thumbnailUrl}
                <img src={item.video.thumbnailUrl} alt="" class="dl-vid-img" />
              {:else}
                <div class="dl-vid-img-empty"></div>
              {/if}
              <div class="dl-vid-overlay dl-vid-play">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <polygon points="3,1.5 9,5 3,8.5" fill="var(--tx)" opacity="0.85"/>
                </svg>
              </div>
            </div>
            <div class="dl-vid-info">
              <div class="dl-vid-badge">▸ Regarder la vidéo</div>
              <div class="dl-lbl">{item.label}</div>
              {#if item.video.durationSeconds}
                <div class="dl-vid-dur">{formatDuration(item.video.durationSeconds)}</div>
              {/if}
            </div>
          </a>
        {:else}
          <!-- Pas de vidéo configurée -->
          <div class="dl-box"></div>
          <div class="dl-vid-link dl-vid-no-video">
            <div class="dl-vid-info">
              <div class="dl-vid-badge dl-vid-badge-warn">⚠ Vidéo non configurée</div>
              <div class="dl-lbl">{item.label}</div>
            </div>
          </div>
        {/if}
        <div class="dl-pts" class:earned={isChecked}>
          {isChecked ? item.pts + ' pts' : '+' + item.pts + ' pts'}
        </div>
      </div>
    {:else}
      <!-- Tâche STANDARD : case à cocher classique -->
      <button
        type="button"
        class="dl-item"
        class:checked={isChecked}
        onclick={(e) => handleToggle(e, item)}
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
    {/if}
  {/each}

  {#if !validated}
    <div class="dl-footer">
      <div class="dl-total">
        <span class="dl-total-lbl">Total du jour</span>
        <span class="dl-total-val" class:glow={ptsSelected > 0}>{ptsSelected} pts</span>
        {#if ptsVideo > 0 && ptsStandard > 0}
          <span class="dl-total-breakdown">Habitudes {ptsStandard} + Vidéo {ptsVideo}</span>
        {/if}
      </div>
      <button type="submit" class="dl-submit" disabled={!hasCheckedStandard || submitting}>
        {submitting ? 'Validation…' : 'Valider les habitudes'}
      </button>
    </div>
    <p class="dl-note">
      {#if hasUnwatchedVideo}
        Regardez la vidéo pour gagner ses points automatiquement.
      {:else}
        Une fois validées, les habitudes du jour sont verrouillées.
      {/if}
    </p>
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

.dl-video-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: rgba(0, 229, 255, 0.05);
  border-bottom: 1px solid rgba(0, 229, 255, 0.15);
  font-size: 0.5rem; color: var(--cy); letter-spacing: 0.06em; font-family: var(--fb);
}
.dl-video-ico { font-size: 0.6rem; }

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
.dl-total-breakdown {
  font-size: 0.375rem;
  color: var(--txd);
  font-family: var(--fb);
  letter-spacing: 0.06em;
  margin-top: 1px;
  opacity: 0.7;
}

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

/* ── Tâche VIDEO ── */
.dl-item-video {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  cursor: default;
}
.dl-item-video .dl-box { flex-shrink: 0; }

.dl-vid-link {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.dl-vid-link:active { opacity: 0.8; }

.dl-vid-thumb {
  position: relative;
  width: 60px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
  background: var(--s2);
}
.dl-vid-img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.dl-vid-img-empty {
  width: 100%; height: 100%; background: var(--s2);
}
.dl-vid-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}
.dl-vid-play { background: rgba(0, 0, 0, 0.22); }

.dl-vid-info { flex: 1; }
.dl-vid-badge {
  font-size: 0.375rem;
  color: var(--cy);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: var(--fb);
  margin-bottom: 2px;
}
.dl-item-video.checked .dl-vid-badge { color: var(--g); }
.dl-vid-dur {
  font-size: 0.375rem;
  color: var(--txd);
  font-family: var(--fb);
  margin-top: 2px;
}

.dl-vid-link-done {
  cursor: default;
  opacity: 0.75;
}

.dl-vid-no-video {
  cursor: default;
  opacity: 0.5;
}

.dl-vid-badge-warn {
  color: rgba(255, 180, 50, 0.8);
}
</style>
