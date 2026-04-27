<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fireElement } from '$lib/utils/particles';
	import { onMount } from 'svelte';

	let { data } = $props<{ data: PageData }>();

	type SessionRow = (typeof data.sessionRows)[number];

	function fire(e: MouseEvent) {
		fireElement(e.currentTarget as HTMLElement, e);
	}

	function changeWeek(week: number) {
		goto(`?semaine=${week}`, { invalidateAll: true, keepFocus: true });
	}

	function dayNumFromISO(iso: string | null): string {
		if (!iso) return '—';
		const n = Number(iso.slice(8, 10));
		return Number.isFinite(n) ? String(n) : '—';
	}

	const strip = $derived(data.weekStrip ?? []);
	const rows = $derived(data.sessionRows ?? []);

	let dragSourceDayIndex = $state<number | null>(null);
	let dragTargetDayIndex = $state<number | null>(null);
	let dragSourceLabel = $state<string | null>(null);
	let dragging = $state(false);
	let moving = $state(false);
	let moveMessage = $state<string | null>(null);

	function clearDragState() {
		dragSourceDayIndex = null;
		dragTargetDayIndex = null;
		dragSourceLabel = null;
		dragging = false;
	}

	function sourceLabelFor(row: SessionRow): string {
		if (row.sessionLetter) return `Séance ${row.sessionLetter}`;
		return row.sessionName ?? 'Séance';
	}

	function updateTargetFromPoint(clientX: number, clientY: number) {
		if (typeof document === 'undefined' || dragSourceDayIndex == null) return;
		const target = document
			.elementFromPoint(clientX, clientY)
			?.closest<HTMLElement>('[data-day-slot]');
		if (!target) return;
		const dayIndex = Number.parseInt(target.dataset.daySlot ?? '', 10);
		if (Number.isInteger(dayIndex)) {
			dragTargetDayIndex = dayIndex;
		}
	}

	function requestMoveSubmit() {
		if (typeof document === 'undefined' || moving) return;
		if (dragSourceDayIndex == null || dragTargetDayIndex == null) return;
		if (dragSourceDayIndex === dragTargetDayIndex) return;
		const form = document.getElementById('sport-move-form');
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function beginMove(row: SessionRow, event?: PointerEvent) {
		if (row.completedAtISO || !row.sessionId) return;
		dragSourceDayIndex = row.dayIndex;
		dragTargetDayIndex = row.dayIndex;
		dragSourceLabel = sourceLabelFor(row);
		dragging = event != null;
		moveMessage = 'Glisse la séance sur un jour de la semaine, ou touche directement le jour cible.';
		if (event) {
			updateTargetFromPoint(event.clientX, event.clientY);
		}
	}

	function toggleMove(row: SessionRow) {
		if (dragSourceDayIndex === row.dayIndex) {
			clearDragState();
			moveMessage = 'Déplacement annulé.';
			return;
		}
		beginMove(row);
	}

	function selectDropTarget(dayIndex: number, commit = false) {
		if (dragSourceDayIndex == null) return;
		dragTargetDayIndex = dayIndex;
		if (commit && dayIndex !== dragSourceDayIndex) {
			requestMoveSubmit();
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging || moving) return;
		updateTargetFromPoint(event.clientX, event.clientY);
	}

	function handlePointerEnd(event: PointerEvent) {
		if (!dragging || moving) return;
		updateTargetFromPoint(event.clientX, event.clientY);
		dragging = false;
		if (
			dragSourceDayIndex != null &&
			dragTargetDayIndex != null &&
			dragSourceDayIndex !== dragTargetDayIndex
		) {
			requestMoveSubmit();
			return;
		}
		moveMessage = 'Choisis un autre jour pour déposer la séance.';
	}

	onMount(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('pointermove', handlePointerMove, { passive: true });
		window.addEventListener('pointerup', handlePointerEnd, { passive: true });
		window.addEventListener('pointercancel', handlePointerEnd, { passive: true });

		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerEnd);
			window.removeEventListener('pointercancel', handlePointerEnd);
		};
	});
</script>

<div class="u-back-row">
	<a href="/user" class="u-back-lnk" onclick={fire}>
		<svg width="12" height="12" viewBox="0 0 14 14"
			><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"></path></svg
		>
		<span class="u-back-lbl">Accueil</span>
	</a>
	<div class="u-back-head">Sport</div>
</div>

{#if !data.hasProgram}
	<p class="mx-4 text-sm text-muted-foreground">
		Aucun programme actif en base. Contacte le support si le message persiste.
	</p>
{:else if !data.hasProgramStart}
	<p class="mx-4 text-sm text-muted-foreground">
		Démarre ton programme depuis ton profil ou passe à la nutrition pour initialiser ton calendrier.
	</p>
{/if}

<div class="week-info">
	<div class="week-header-row">
		<span class="week-header">
			Semaine {data.selectedWeek ?? data.currentWeek} / 13{#if data.totalProgramDays}
				<span class="week-header-sub"> · Jour programme {data.currentDayIndex} / {data.totalProgramDays}</span>
			{/if}
		</span>
		<label class="week-switch">
			<span class="week-switch-lbl">Semaine</span>
			<select
				class="week-select"
				value={String(data.selectedWeek ?? data.currentWeek)}
				onchange={(e) => changeWeek(Number.parseInt(e.currentTarget.value, 10))}
				aria-label="Choisir la semaine du programme"
			>
				{#each Array(13) as _, i}
					<option value={String(i + 1)}>
						S. {i + 1}
						{i + 1 === data.currentWeek ? ' (en cours)' : ''}
					</option>
				{/each}
			</select>
		</label>
	</div>
	<div class="week-sub">
		Jours {data.weekStart} → {data.weekEnd} · A → B → C
		{#if !data.hasProgramStart}
			· <span class="warn">Début de programme non défini — dates affichées comme depuis J1</span>
		{/if}
	</div>
</div>

<div class="u-sport-week">
	{#each strip as cell (cell.dayIndex)}
		{#if cell.completedAtISO}
			<div class="u-sd done" data-day-slot={String(cell.dayIndex)}>
				<div class="u-sd-n">{cell.weekdayShort}</div>
				<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
				{#if cell.sessionLetter}
					<div class="u-sd-b" style="color:var(--g)">{cell.sessionLetter}✓</div>
				{/if}
			</div>
		{:else if cell.hrefSeance && cell.isToday}
			<a
				href={dragSourceDayIndex == null ? cell.hrefSeance : '#'}
				class="u-sd today pending"
				class:move-source={dragSourceDayIndex === cell.dayIndex}
				class:move-target={dragSourceDayIndex != null && dragTargetDayIndex === cell.dayIndex}
				data-day-slot={String(cell.dayIndex)}
				onclick={(e) => {
					if (dragSourceDayIndex != null) {
						e.preventDefault();
						selectDropTarget(cell.dayIndex, true);
						return;
					}
					fire(e);
				}}
			>
				<div class="u-sd-n" style="color:var(--txd)">{cell.weekdayShort}</div>
				<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
				{#if cell.sessionLetter}
					<div class="u-sd-b" style="color:var(--g)">{cell.sessionLetter}</div>
				{/if}
				<div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
			</a>
		{:else if cell.hrefSeance && !cell.completedAtISO}
			<a
				href={dragSourceDayIndex == null ? cell.hrefSeance : '#'}
				class="u-sd placed"
				class:move-source={dragSourceDayIndex === cell.dayIndex}
				class:move-target={dragSourceDayIndex != null && dragTargetDayIndex === cell.dayIndex}
				data-day-slot={String(cell.dayIndex)}
				onclick={(e) => {
					if (dragSourceDayIndex != null) {
						e.preventDefault();
						selectDropTarget(cell.dayIndex, true);
						return;
					}
					fire(e);
				}}
			>
				<div class="u-sd-n">{cell.weekdayShort}</div>
				<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
				{#if cell.sessionLetter}
					<div class="u-sd-b" style="color:var(--txd)">{cell.sessionLetter}</div>
				{/if}
			</a>
		{:else}
			<button
				type="button"
				class="u-sd u-sd-empty"
				class:move-target={dragSourceDayIndex != null && dragTargetDayIndex === cell.dayIndex}
				data-day-slot={String(cell.dayIndex)}
				disabled={dragSourceDayIndex == null}
				onclick={() => selectDropTarget(cell.dayIndex, true)}
			>
				<div class="u-sd-n">{cell.weekdayShort}</div>
				<div class="u-sd-d" style="color:var(--txd)">{dayNumFromISO(cell.dateISO)}</div>
				<div class="u-sd-b" style="color:var(--txd)">—</div>
				{#if cell.isToday}
					<div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
				{/if}
			</button>
		{/if}
	{/each}
</div>

<div class="u-sh"><div class="u-sh-t">Séances semaine {data.selectedWeek ?? data.currentWeek}</div></div>

{#if dragSourceDayIndex != null}
	<form
		id="sport-move-form"
		method="POST"
		action="?/moveSession"
		class="move-card mx-4"
		use:enhance={() => {
			moving = true;
			return async ({ result, update }) => {
				moving = false;
				if (result.type === 'success') {
					moveMessage = 'Séance déplacée.';
					clearDragState();
				} else if (result.type === 'failure') {
					const data = result.data as { message?: unknown } | null;
					let message = 'Le déplacement a échoué.';
					if (data && typeof data.message === 'string' && data.message.trim().length > 0) {
						message = data.message;
					}
					moveMessage = message;
				}
				await update({ invalidateAll: true });
			};
		}}
	>
		<input type="hidden" name="sourceDayIndex" value={String(dragSourceDayIndex)} />
		<input type="hidden" name="targetDayIndex" value={String(dragTargetDayIndex ?? dragSourceDayIndex)} />
		<p class="move-title">Déplacer la séance</p>
		<p class="move-sub">
			{dragSourceLabel ?? 'Séance'} · jour source : <strong>{dragSourceDayIndex}</strong>
			{#if dragTargetDayIndex != null}
				 · Jour cible : <strong>{dragTargetDayIndex}</strong>
			{/if}
		</p>
		<p class="move-hint">Glisse vers une case de la semaine ou touche le jour où tu veux placer la séance.</p>
		<div class="move-actions">
			<button type="submit" class="move-confirm" disabled={moving || dragTargetDayIndex == null || dragTargetDayIndex === dragSourceDayIndex}>
				{moving ? 'Déplacement…' : 'Confirmer le déplacement'}
			</button>
			<button type="button" class="move-cancel" onclick={clearDragState} disabled={moving}>
				Annuler
			</button>
		</div>
	</form>
{/if}

{#if moveMessage}
	<p class="move-feedback mx-4">{moveMessage}</p>
{/if}

{#if rows.length === 0}
	<p class="mx-4 text-sm text-muted-foreground">
		Aucune séance sport prévue sur cette semaine dans le programme.
	</p>
{:else}
	{#each rows as row (row.dayIndex)}
		{#if row.hrefSeance && !row.completedAtISO && row.isToday}
			<div class="move-row-shell">
				<a
					href={dragSourceDayIndex == null ? row.hrefSeance : '#'}
					class="u-li u-li-main li-cta pending"
					class:move-source={dragSourceDayIndex === row.dayIndex}
					class:move-target={dragSourceDayIndex != null && dragTargetDayIndex === row.dayIndex}
					onclick={(e) => {
						if (dragSourceDayIndex != null) {
							e.preventDefault();
							selectDropTarget(row.dayIndex, true);
							return;
						}
						fire(e);
					}}
				>
					<div class="u-li-th" style="background:var(--g)">
						<span style="font-size:.625rem;font-weight:700;color:var(--s1);font-family:var(--fh2)"
							>{row.sessionLetter ?? '?'}</span
						>
					</div>
					<div class="u-li-b">
						<div class="u-li-t">
							{row.sessionName ?? 'Séance'} · Jour {row.dayIndex}
							{#if row.dateISO}
								<span class="text-muted-foreground"> ({row.dateISO})</span>
							{/if}
						</div>
						<div class="u-li-s">
							{#if row.points}&plus;{row.points} pts à gagner{/if}
						</div>
					</div>
					<div class="u-li-r">
						{#if dragSourceDayIndex === row.dayIndex}
							<div class="move-tag">Source</div>
						{:else if dragSourceDayIndex != null && dragTargetDayIndex === row.dayIndex}
							<div class="move-tag move-tag-target">Cible</div>
						{:else}
							<div class="u-arr"></div>
						{/if}
					</div>
				</a>
				<button
					type="button"
					class="move-launch"
					aria-label={`Déplacer ${row.sessionName ?? 'la séance'} du jour ${row.dayIndex}`}
					onpointerdown={(e) => beginMove(row, e)}
					onclick={(e) => {
						e.preventDefault();
						toggleMove(row);
					}}
				>
					{dragSourceDayIndex === row.dayIndex ? 'Annuler' : 'Glisser'}
				</button>
			</div>
		{:else if row.hrefSeance && !row.completedAtISO}
			<div class="move-row-shell">
				<a
					href={dragSourceDayIndex == null ? row.hrefSeance : '#'}
					class="u-li u-li-main"
					class:move-source={dragSourceDayIndex === row.dayIndex}
					class:move-target={dragSourceDayIndex != null && dragTargetDayIndex === row.dayIndex}
					onclick={(e) => {
						if (dragSourceDayIndex != null) {
							e.preventDefault();
							selectDropTarget(row.dayIndex, true);
							return;
						}
						fire(e);
					}}
				>
					<div class="u-li-th" style="background:var(--gd)">
						<span style="font-size:.625rem;font-weight:700;color:var(--gb);font-family:var(--fh2)"
							>{row.sessionLetter ?? '?'}</span
						>
					</div>
					<div class="u-li-b">
						<div class="u-li-t">
							{row.sessionName ?? 'Séance'} · Jour {row.dayIndex}
						</div>
						<div class="u-li-s">À faire · {#if row.points}&plus;{row.points} pts{/if}</div>
					</div>
					<div class="u-li-r">
						{#if dragSourceDayIndex === row.dayIndex}
							<div class="move-tag">Source</div>
						{:else if dragSourceDayIndex != null && dragTargetDayIndex === row.dayIndex}
							<div class="move-tag move-tag-target">Cible</div>
						{:else}
							<div class="u-arr"></div>
						{/if}
					</div>
				</a>
				<button
					type="button"
					class="move-launch"
					aria-label={`Déplacer ${row.sessionName ?? 'la séance'} du jour ${row.dayIndex}`}
					onpointerdown={(e) => beginMove(row, e)}
					onclick={(e) => {
						e.preventDefault();
						toggleMove(row);
					}}
				>
					{dragSourceDayIndex === row.dayIndex ? 'Annuler' : 'Glisser'}
				</button>
			</div>
		{:else if !row.sessionId}
			<button
				type="button"
				class="u-li u-li-empty-row"
				disabled={dragSourceDayIndex == null}
				onclick={() => selectDropTarget(row.dayIndex, true)}
			>
				<div class="u-li-th" style="background:rgba(255,255,255,.04)">
					<span style="font-size:.625rem;font-weight:700;color:var(--txd);font-family:var(--fh2)">—</span>
				</div>
				<div class="u-li-b">
					<div class="u-li-t">Jour {row.dayIndex} libre</div>
					<div class="u-li-s">Dépose une séance ici pour réorganiser ta semaine</div>
				</div>
				<div class="u-li-r">
					{#if dragSourceDayIndex != null && dragTargetDayIndex === row.dayIndex}
						<div class="move-tag move-tag-target">Cible</div>
					{:else}
						<div class="u-arr"></div>
					{/if}
				</div>
			</button>
		{:else}
			<div class="u-li" style="opacity:.85">
				<div class="u-li-th" style="background:var(--gd)">
					<span style="font-size:.625rem;font-weight:700;color:var(--gb);font-family:var(--fh2)"
						>{row.sessionLetter ?? '?'}</span
					>
				</div>
				<div class="u-li-b">
					<div class="u-li-t">
						{row.sessionName ?? 'Séance'} · Jour {row.dayIndex}
					</div>
					<div class="u-li-s" style="color:var(--g)">
						{#if row.completedAtISO}Validée ✓{/if}
						{#if row.points} · &plus;{row.points} pts{/if}
					</div>
				</div>
			</div>
		{/if}
	{/each}
{/if}

<style>
	.week-info {
		padding: 14px 18px;
		background: transparent;
		border-bottom: 1px solid var(--br);
	}
	.week-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.week-header {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--tx);
		font-family: var(--fb);
	}
	.week-header-sub {
		font-weight: 500;
		color: var(--txd);
	}
	.week-switch {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.week-switch-lbl {
		font-size: 0.5rem;
		color: var(--txd);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-family: var(--fb);
	}
	.week-select {
		font-size: 0.5rem;
		padding: 5px 8px;
		border: 1px solid var(--br2);
		background: transparent;
		color: var(--tx);
		min-width: 110px;
		cursor: pointer;
		font-family: var(--fb);
		-webkit-appearance: none;
		appearance: none;
	}
	.week-sub {
		font-size: 0.5rem;
		color: var(--g);
		margin-top: 8px;
		line-height: 1.4;
		font-family: var(--fb);
	}
	.warn {
		color: rgba(255, 180, 120, 0.95);
	}

	/* Surcharges spécifiques sport */
	.u-sd.today {
		animation: gpulse 2.5s ease-in-out infinite;
	}
	.li-cta {
		border-left: 2px solid var(--g);
	}
	.move-row-shell {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 8px;
		padding: 0 16px;
		margin-top: 8px;
	}
	.move-row-shell :global(.u-li) {
		margin-top: 0;
	}
	.u-li-main {
		min-width: 0;
	}
	.move-launch {
		align-self: stretch;
		min-width: 74px;
		border-radius: 12px;
		border: 1px solid rgba(0, 229, 255, 0.24);
		background: rgba(0, 229, 255, 0.08);
		color: var(--cy);
		font-family: var(--fh);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		text-transform: uppercase;
		padding: 0 10px;
		touch-action: none;
	}
	.move-launch:active {
		background: rgba(0, 229, 255, 0.16);
	}
	.move-card {
		margin-top: 0.65rem;
		margin-bottom: 0.8rem;
		padding: 0.8rem 0.9rem;
		border-radius: 10px;
		border: 1px solid rgba(0, 229, 255, 0.24);
		background: rgba(0, 229, 255, 0.07);
	}
	.move-title {
		font-size: 0.6875rem;
		font-weight: 700;
		font-family: var(--fb);
		color: var(--tx);
	}
	.move-sub {
		margin-top: 0.22rem;
		font-size: 0.625rem;
		font-family: var(--fb);
		color: var(--tx2);
	}
	.move-hint {
		margin-top: 0.35rem;
		font-size: 0.5625rem;
		font-family: var(--fb);
		color: var(--txd);
		line-height: 1.4;
	}
	.move-actions {
		margin-top: 0.6rem;
		display: flex;
		gap: 0.45rem;
	}
	.move-confirm,
	.move-cancel {
		border: 0;
		border-radius: 8px;
		padding: 0.45rem 0.72rem;
		font-size: 0.625rem;
		font-weight: 600;
		font-family: var(--fb);
		cursor: pointer;
	}
	.move-confirm {
		background: var(--cy);
		color: var(--s1);
	}
	.move-confirm:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.move-cancel {
		background: rgba(255, 255, 255, 0.08);
		color: var(--tx);
	}
	.move-feedback {
		margin-top: 0.2rem;
		margin-bottom: 0.55rem;
		font-size: 0.625rem;
		font-family: var(--fb);
		color: var(--cy);
	}
	.move-source {
		outline: 1px solid rgba(0, 229, 255, 0.55);
		box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.18) inset;
	}
	.move-target {
		outline: 1px solid rgba(201, 168, 78, 0.55);
		box-shadow: 0 0 0 2px rgba(201, 168, 78, 0.18) inset;
	}
	.u-sd-empty {
		opacity: .4;
		background: transparent;
		border: 1px dashed var(--br2);
	}
	.u-sd-empty:disabled {
		cursor: default;
	}
	.u-li-empty-row {
		width: calc(100% - 32px);
		margin-left: 16px;
		margin-right: 16px;
		background: rgba(255,255,255,.03);
		border-style: dashed;
	}
	.move-tag {
		font-size: 0.55rem;
		font-family: var(--fb);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--cy);
	}
	.move-tag-target {
		color: var(--g);
	}
</style>
