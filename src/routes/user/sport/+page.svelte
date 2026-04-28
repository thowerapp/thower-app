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

	function isOptionalSessionLetter(letter: string | null): boolean {
		return letter === 'D';
	}

	const strip = $derived(data.weekStrip ?? []);
	const rows = $derived(data.sessionRows ?? []);

	let dragSourceDayIndex = $state<number | null>(null);
	let hoveredDayIndex = $state<number | null>(null);
	let dragEnabled = $state(false);
	let dragJustEnded = $state(false);
	let pendingSourceDayIndex = $state<number | null>(null);
	let pendingTargetDayIndex = $state<number | null>(null);
	let movingSession = $state(false);
	let moveMessage = $state<string | null>(null);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let activePointerId = $state<number | null>(null);
	let activePointerElement = $state<HTMLElement | null>(null);

	function clearLongPressTimer() {
		if (longPressTimer != null) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function findCell(dayIndex: number): SessionRow | null {
		return strip.find((cell: SessionRow) => cell.dayIndex === dayIndex) ?? null;
	}

	function isMovableCell(cell: SessionRow): boolean {
		return cell.sessionId != null && cell.completedAtISO == null;
	}

	function isFreeDropCell(cell: SessionRow): boolean {
		return cell.sessionId == null && cell.completedAtISO == null && cell.sessionLetter !== 'D';
	}

	function updateHoveredDay(clientX: number, clientY: number) {
		if (typeof document === 'undefined') return;
		const safeX = Math.max(0, Math.min(clientX, window.innerWidth - 1));
		const safeY = Math.max(0, Math.min(clientY, window.innerHeight - 1));
		const target = document
			.elementFromPoint(safeX, safeY)
			?.closest<HTMLElement>('[data-day-slot]');
		if (!target) {
			hoveredDayIndex = null;
			return;
		}
		const dayIndex = Number.parseInt(target.dataset.daySlot ?? '', 10);
		if (!Number.isInteger(dayIndex)) {
			hoveredDayIndex = null;
			return;
		}
		const cell = findCell(dayIndex);
		hoveredDayIndex = cell != null && isFreeDropCell(cell) ? dayIndex : null;
	}

	function resetDragState() {
		dragSourceDayIndex = null;
		hoveredDayIndex = null;
		dragEnabled = false;
		activePointerId = null;
		activePointerElement = null;
	}

	function requestMoveSession(sourceDayIndex: number, targetDayIndex: number) {
		if (movingSession) return;
		pendingSourceDayIndex = sourceDayIndex;
		pendingTargetDayIndex = targetDayIndex;
		const form = document.getElementById('sport-move-form');
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function handleDayPointerDown(cell: SessionRow, event: PointerEvent) {
		if (!isMovableCell(cell) || movingSession) return;
		event.preventDefault();
		activePointerId = event.pointerId;
		activePointerElement = event.currentTarget as HTMLElement;
		activePointerElement.setPointerCapture?.(event.pointerId);
		clearLongPressTimer();
		longPressTimer = setTimeout(() => {
			dragSourceDayIndex = cell.dayIndex;
			dragEnabled = true;
			hoveredDayIndex = null;
			moveMessage = 'Dépose la séance sur un jour libre.';
			updateHoveredDay(event.clientX, event.clientY);
		}, 240);
	}

	function handleDayPointerUp(event: PointerEvent) {
		if (activePointerId != null && event.pointerId !== activePointerId) return;
		if (dragEnabled) event.preventDefault();
		if (activePointerElement && activePointerId != null && activePointerElement.hasPointerCapture?.(activePointerId)) {
			activePointerElement.releasePointerCapture?.(activePointerId);
		}
		clearLongPressTimer();
		if (!dragEnabled || dragSourceDayIndex == null) return;
		updateHoveredDay(event.clientX, event.clientY);

		if (hoveredDayIndex != null && hoveredDayIndex !== dragSourceDayIndex) {
			requestMoveSession(dragSourceDayIndex, hoveredDayIndex);
		}

		dragJustEnded = true;
		setTimeout(() => {
			dragJustEnded = false;
		}, 0);
		resetDragState();
	}

	function handleDayClick(cell: SessionRow, event: MouseEvent) {
		if (dragJustEnded) {
			event.preventDefault();
			return;
		}
		if (!cell.hrefSeance) return;
		goto(cell.hrefSeance, { keepFocus: true });
	}

	onMount(() => {
		if (typeof window === 'undefined') return;
		const handlePointerMove = (event: PointerEvent) => {
			if (activePointerId != null && event.pointerId !== activePointerId) return;
			if (!dragEnabled || movingSession) return;
			event.preventDefault();
			updateHoveredDay(event.clientX, event.clientY);
		};

		window.addEventListener('pointermove', handlePointerMove, { passive: false });
		window.addEventListener('pointerup', handleDayPointerUp, { passive: false });
		window.addEventListener('pointercancel', handleDayPointerUp, { passive: false });

		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handleDayPointerUp);
			window.removeEventListener('pointercancel', handleDayPointerUp);
			clearLongPressTimer();
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
	<div class="start-cta-wrap">
		<p class="start-cta-title">Prêt à commencer ?</p>
		<p class="start-cta-sub">91 jours · 13 semaines · 4 séances par semaine.</p>
		<form method="POST" action="?/startProgram" use:enhance={() => {
			return async ({ update }) => { await update({ invalidateAll: true }); };
		}}>
			<button type="submit" class="start-cta-btn">Démarrer mon programme</button>
		</form>
	</div>
{:else}
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
		Jours {data.weekStart} → {data.weekEnd} · A → B → C → D (facultative)
		{#if !data.hasProgramStart}
			· <span class="warn">Début de programme non défini — dates affichées comme depuis J1</span>
		{/if}
	</div>
</div>

<form
	id="sport-move-form"
	method="POST"
	action="?/moveSession"
	class="sr-only"
	use:enhance={() => {
		movingSession = true;
		return async ({ result, update }) => {
			movingSession = false;
			if (result.type === 'success') {
				moveMessage = 'Séance déplacée.';
			} else if (result.type === 'failure') {
				const failure = result.data as { message?: unknown } | null;
				moveMessage =
					failure && typeof failure.message === 'string'
						? failure.message
						: 'Impossible de déplacer la séance.';
			}
			await update({ invalidateAll: true });
		};
	}}
>
	<input type="hidden" name="sourceDayIndex" value={String(pendingSourceDayIndex ?? '')} />
	<input type="hidden" name="targetDayIndex" value={String(pendingTargetDayIndex ?? '')} />
</form>

<div class="u-sport-week">
	{#each strip as cell (cell.dayIndex)}
		<button
			type="button"
			class="u-sd"
			class:done={cell.completedAtISO != null}
			class:today={cell.isToday && cell.completedAtISO == null}
			class:placed={cell.sessionId != null && cell.completedAtISO == null}
			class:pending={cell.isToday && cell.hrefSeance != null && cell.completedAtISO == null}
			class:drag-source={dragSourceDayIndex === cell.dayIndex}
			class:move-target={hoveredDayIndex === cell.dayIndex}
			class:free-slot={isFreeDropCell(cell)}
			class:movable-slot={isMovableCell(cell)}
			data-day-slot={String(cell.dayIndex)}
			onpointerdown={(event) => handleDayPointerDown(cell, event)}
			onpointercancel={clearLongPressTimer}
			onclick={(event) => handleDayClick(cell, event)}
			disabled={movingSession}
		>
			<div class="u-sd-n" style:color={cell.isToday && cell.completedAtISO == null ? 'var(--txd)' : undefined}>{cell.weekdayShort}</div>
			<div class="u-sd-d" style:color={isFreeDropCell(cell) ? 'var(--txd)' : undefined}>{dayNumFromISO(cell.dateISO)}</div>
			{#if cell.sessionLetter}
				<div class="u-sd-b" style:color={cell.completedAtISO ? 'var(--g)' : 'var(--txd)'}>
					{cell.completedAtISO ? `${cell.sessionLetter}✓` : cell.sessionLetter}
				</div>
			{:else}
				<div class="u-sd-b" style="color:var(--txd)">—</div>
			{/if}
			{#if cell.isToday && cell.completedAtISO == null}
				<div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
			{/if}
		</button>
	{/each}
</div>

<p class="move-sub mx-4" style="margin-top:.45rem">
	Appui long sur un jour avec séance, puis glisse vers un jour libre.
</p>

{#if moveMessage}
	<p class="move-feedback mx-4">{moveMessage}</p>
{/if}

<div class="u-sh"><div class="u-sh-t">Séances semaine {data.selectedWeek ?? data.currentWeek}</div></div>

{#if rows.length === 0}
	<p class="mx-4 text-sm text-muted-foreground">
		Aucune séance sport prévue sur cette semaine dans le programme.
	</p>
{:else}
	{#each rows as row (row.dayIndex)}
		{#if row.hrefSeance && !row.completedAtISO && row.isToday}
			<a href={row.hrefSeance} class="u-li li-cta pending" onclick={fire}>
				<div class="u-li-th" style="background:var(--g)">
					<span style="font-size:.625rem;font-weight:700;color:var(--s1);font-family:var(--fh2)">
						{row.sessionLetter ?? '?'}
					</span>
				</div>
				<div class="u-li-b">
					<div class="u-li-t">
						{row.sessionName ?? 'Séance'} · Jour {row.dayIndex}
						{#if row.dateISO}
							<span class="text-muted-foreground"> ({row.dateISO})</span>
						{/if}
					</div>
					<div class="u-li-s">
						{#if isOptionalSessionLetter(row.sessionLetter)}Séance facultative · {/if}
						{#if row.sessionLetter === 'D'}Mindset · Breathwork · Méditation{:else if row.points}&plus;{row.points} pts à gagner{/if}
					</div>
				</div>
				<div class="u-li-r"><div class="u-arr"></div></div>
			</a>
		{:else if row.hrefSeance && !row.completedAtISO}
			<a href={row.hrefSeance} class="u-li" onclick={fire}>
				<div class="u-li-th" style="background:var(--gd)">
					<span style="font-size:.625rem;font-weight:700;color:var(--gb);font-family:var(--fh2)">
						{row.sessionLetter ?? '?'}
					</span>
				</div>
				<div class="u-li-b">
					<div class="u-li-t">
						{row.sessionName ?? 'Séance'} · Jour {row.dayIndex}
					</div>
					<div class="u-li-s">
						{#if isOptionalSessionLetter(row.sessionLetter)}Séance facultative · {/if}
						{#if row.sessionLetter === 'D'}Mindset · Breathwork · Méditation{:else}À faire{/if}
						{#if row.points} · &plus;{row.points} pts{/if}
					</div>
				</div>
				<div class="u-li-r"><div class="u-arr"></div></div>
			</a>
		{:else}
			<div class="u-li" style="opacity:.85">
				<div class="u-li-th" style="background:var(--gd)">
					<span style="font-size:.625rem;font-weight:700;color:var(--gb);font-family:var(--fh2)">
						{row.sessionLetter ?? '?'}
					</span>
				</div>
				<div class="u-li-b">
					<div class="u-li-t">
						{row.sessionName ?? 'Séance'} · Jour {row.dayIndex}
					</div>
					<div class="u-li-s" style="color:var(--g)">
						{#if isOptionalSessionLetter(row.sessionLetter)}Séance facultative · {/if}
						{#if row.completedAtISO}Validée ✓{/if}
						{#if row.points} · &plus;{row.points} pts{/if}
					</div>
				</div>
			</div>
		{/if}
	{/each}
{/if}

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

	.u-sd.today {
		animation: gpulse 2.5s ease-in-out infinite;
	}
	.u-sport-week .u-sd {
		background: transparent;
		transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
		touch-action: none;
		-webkit-user-select: none;
		user-select: none;
	}
	.u-sport-week .u-sd:active {
		background: rgba(0, 229, 255, 0.08);
	}
	.u-sport-week .u-sd.movable-slot {
		cursor: grab;
	}
	.u-sport-week .u-sd.drag-source {
		border-color: var(--cy);
		box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.35), 0 0 10px rgba(0, 229, 255, 0.2);
		transform: scale(0.98);
	}
	.u-sport-week .u-sd.move-target {
		border-color: var(--cy);
		box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.14) inset;
		background: rgba(0, 229, 255, 0.05);
	}
	.u-sport-week .u-sd.free-slot {
		opacity: 0.72;
	}
	.li-cta {
		border-left: 2px solid var(--g);
	}
	.move-sub {
		margin-top: 0.22rem;
		font-size: 0.625rem;
		font-family: var(--fb);
		color: var(--tx2);
	}
	.move-feedback {
		margin-top: 0.2rem;
		margin-bottom: 0.55rem;
		font-size: 0.625rem;
		font-family: var(--fb);
		color: var(--cy);
	}
	.start-cta-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
		padding: 48px 24px;
		text-align: center;
	}
	.start-cta-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--tx);
		font-family: var(--fh2);
		margin: 0;
	}
	.start-cta-sub {
		font-size: 0.75rem;
		color: var(--txd);
		font-family: var(--fb);
		margin: 0;
	}
	.start-cta-btn {
		background: var(--g);
		color: var(--s1);
		border: none;
		padding: 14px 28px;
		font-size: 0.875rem;
		font-weight: 700;
		font-family: var(--fh2);
		cursor: pointer;
		letter-spacing: 0.04em;
	}
</style>
