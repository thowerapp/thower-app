<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fireElement } from '$lib/utils/particles';
	import { onMount } from 'svelte';

	let { data } = $props<{ data: PageData }>();

	type SessionRow = (typeof data.sessionRows)[number];
	type PlannerSession = (typeof data.plannerSessions)[number];

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
	const plannerSessions = $derived(data.plannerSessions ?? []);

	let organizing = $state(false);
	let draftPlannerSessions = $state<PlannerSession[]>([]);
	let selectedSessionId = $state<string | null>(null);
	let draggingSessionId = $state<string | null>(null);
	let hoveredDayIndex = $state<number | null>(null);
	let savingPlan = $state(false);
	let moveMessage = $state<string | null>(null);

	function clonePlannerSessions(): PlannerSession[] {
		return plannerSessions.map((session: PlannerSession) => ({ ...session }));
	}

	function startOrganizer() {
		organizing = true;
		draftPlannerSessions = clonePlannerSessions();
		selectedSessionId =
			draftPlannerSessions.find((session) => !session.completedAtISO)?.sessionId ?? null;
		draggingSessionId = null;
		hoveredDayIndex = null;
		moveMessage =
			selectedSessionId != null
				? 'Glisse une séance sur un jour puis valide ton placement.'
				: 'Aucune séance modifiable cette semaine.';
	}

	function stopOrganizer() {
		organizing = false;
		draftPlannerSessions = [];
		selectedSessionId = null;
		draggingSessionId = null;
		hoveredDayIndex = null;
		moveMessage = null;
	}

	function updateHoveredDay(clientX: number, clientY: number) {
		if (typeof document === 'undefined') return;
		const target = document
			.elementFromPoint(clientX, clientY)
			?.closest<HTMLElement>('[data-edit-day]');
		if (!target) return;
		const dayIndex = Number.parseInt(target.dataset.editDay ?? '', 10);
		if (Number.isInteger(dayIndex)) {
			hoveredDayIndex = dayIndex;
		}
	}

	function plannerSessionAtDay(dayIndex: number): PlannerSession | null {
		return draftPlannerSessions.find((session) => session.currentDayIndex === dayIndex) ?? null;
	}

	function assignSessionToDay(sessionId: string, dayIndex: number) {
		const next = draftPlannerSessions.map((session) => ({ ...session }));
		const movingSession = next.find((session) => session.sessionId === sessionId);
		if (!movingSession || movingSession.completedAtISO) return;

		const previousDayIndex = movingSession.currentDayIndex;
		const occupiedSession = next.find(
			(session) =>
				session.sessionId !== sessionId &&
				!session.completedAtISO &&
				session.currentDayIndex === dayIndex
		);

		movingSession.currentDayIndex = dayIndex;
		if (occupiedSession) {
			occupiedSession.currentDayIndex = previousDayIndex ?? null;
		}

		draftPlannerSessions = next;
		selectedSessionId = sessionId;
		hoveredDayIndex = dayIndex;
	}

	function clearOptionalPlacement(sessionId: string) {
		const next = draftPlannerSessions.map((session) => ({ ...session }));
		const optionalSession = next.find((session) => session.sessionId === sessionId);
		if (!optionalSession || !optionalSession.optional || optionalSession.completedAtISO) return;
		optionalSession.currentDayIndex = null;
		draftPlannerSessions = next;
		selectedSessionId = sessionId;
		hoveredDayIndex = null;
	}

	function handleEditDayTap(dayIndex: number) {
		if (!organizing || selectedSessionId == null) return;
		assignSessionToDay(selectedSessionId, dayIndex);
	}

	function handlePlannerItemTap(sessionId: string) {
		selectedSessionId = sessionId;
		const current = draftPlannerSessions.find((session) => session.sessionId === sessionId);
		if (!current || current.completedAtISO) return;
		moveMessage = current.optional
			? 'Séance facultative sélectionnée. Place-la si tu veux, ou laisse-la libre.'
			: 'Séance sélectionnée. Touche un jour de la semaine pour la placer.';
	}

	function startPlannerDrag(sessionId: string, event: PointerEvent) {
		if (!organizing) return;
		const current = draftPlannerSessions.find((session) => session.sessionId === sessionId);
		if (!current || current.completedAtISO) return;
		selectedSessionId = sessionId;
		draggingSessionId = sessionId;
		hoveredDayIndex = current.currentDayIndex;
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
		updateHoveredDay(event.clientX, event.clientY);
	}

	function handlePlannerPointerMove(event: PointerEvent) {
		if (!organizing || draggingSessionId == null || savingPlan) return;
		updateHoveredDay(event.clientX, event.clientY);
	}

	function handlePlannerPointerUp(event: PointerEvent) {
		if (!organizing || draggingSessionId == null || savingPlan) return;
		updateHoveredDay(event.clientX, event.clientY);
		if (hoveredDayIndex != null) {
			assignSessionToDay(draggingSessionId, hoveredDayIndex);
		}
		draggingSessionId = null;
	}

	function requestSavePlan() {
		if (!organizing || savingPlan) return;
		const form = document.getElementById('sport-plan-form');
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	const planPayload = $derived(
		JSON.stringify(
			draftPlannerSessions
				.filter((session) => !session.completedAtISO)
				.map((session) => ({
					sessionId: session.sessionId,
					dayIndex: session.currentDayIndex
				}))
		)
	);

	const canSavePlan = $derived(
		organizing &&
			draftPlannerSessions
				.filter((session) => !session.optional && !session.completedAtISO)
				.every((session) => session.currentDayIndex != null)
	);

	onMount(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('pointermove', handlePlannerPointerMove, { passive: true });
		window.addEventListener('pointerup', handlePlannerPointerUp, { passive: true });
		window.addEventListener('pointercancel', handlePlannerPointerUp, { passive: true });

		return () => {
			window.removeEventListener('pointermove', handlePlannerPointerMove);
			window.removeEventListener('pointerup', handlePlannerPointerUp);
			window.removeEventListener('pointercancel', handlePlannerPointerUp);
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
	{#if plannerSessions.length > 0}
		<div class="week-actions">
			{#if organizing}
				<button type="button" class="week-action-secondary" onclick={stopOrganizer}>Annuler</button>
				<button type="button" class="week-action-primary" onclick={requestSavePlan} disabled={!canSavePlan || savingPlan}>
					{savingPlan ? 'Validation…' : 'Valider le placement'}
				</button>
			{:else}
				<button type="button" class="week-action-primary" onclick={startOrganizer}>Organiser ma semaine</button>
			{/if}
		</div>
	{/if}
</div>

<div class="u-sport-week">
	{#each strip as cell (cell.dayIndex)}
		{#if organizing}
			{@const plannedSession = plannerSessionAtDay(cell.dayIndex)}
			{#if cell.completedAtISO}
				<div class="u-sd done" data-edit-day={String(cell.dayIndex)}>
					<div class="u-sd-n">{cell.weekdayShort}</div>
					<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
					{#if cell.sessionLetter}
						<div class="u-sd-b" style="color:var(--g)">{cell.sessionLetter}✓</div>
					{/if}
				</div>
			{:else}
				<button
					type="button"
					class="u-sd planner-day"
					class:today={cell.isToday}
					class:placed={plannedSession != null}
					class:move-target={hoveredDayIndex === cell.dayIndex || (selectedSessionId != null && plannedSession?.sessionId === selectedSessionId)}
					data-edit-day={String(cell.dayIndex)}
					onclick={() => handleEditDayTap(cell.dayIndex)}
				>
					<div class="u-sd-n" style:color={cell.isToday ? 'var(--txd)' : undefined}>{cell.weekdayShort}</div>
					<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
					<div class="u-sd-b" style:color={plannedSession?.optional ? 'var(--cy)' : plannedSession != null ? 'var(--g)' : 'var(--txd)'}>
						{plannedSession?.sessionLetter ?? '—'}
					</div>
					{#if cell.isToday}
						<div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
					{/if}
				</button>
			{/if}
		{:else if cell.completedAtISO}
			<div class="u-sd done" data-day-slot={String(cell.dayIndex)}>
				<div class="u-sd-n">{cell.weekdayShort}</div>
				<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
				{#if cell.sessionLetter}
					<div class="u-sd-b" style="color:var(--g)">{cell.sessionLetter}✓</div>
				{/if}
			</div>
		{:else if cell.hrefSeance && cell.isToday}
			<a href={cell.hrefSeance} class="u-sd today pending" onclick={fire}>
				<div class="u-sd-n" style="color:var(--txd)">{cell.weekdayShort}</div>
				<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
				{#if cell.sessionLetter}
					<div class="u-sd-b" style="color:var(--g)">{cell.sessionLetter}</div>
				{/if}
				<div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
			</a>
		{:else if cell.hrefSeance && !cell.completedAtISO}
			<a href={cell.hrefSeance} class="u-sd placed" onclick={fire}>
				<div class="u-sd-n">{cell.weekdayShort}</div>
				<div class="u-sd-d">{dayNumFromISO(cell.dateISO)}</div>
				{#if cell.sessionLetter}
					<div class="u-sd-b" style="color:var(--txd)">{cell.sessionLetter}</div>
				{/if}
			</a>
		{:else}
			<div
				class="u-sd"
				style="opacity:.35"
				role="presentation"
				data-day-slot={String(cell.dayIndex)}
			>
				<div class="u-sd-n">{cell.weekdayShort}</div>
				<div class="u-sd-d" style="color:var(--txd)">{dayNumFromISO(cell.dateISO)}</div>
				<div class="u-sd-b" style="color:var(--txd)">—</div>
				{#if cell.isToday}
					<div class="pin-dot" style="width:7px;height:7px;border-radius:50%;margin-top:1px"></div>
				{/if}
			</div>
		{/if}
	{/each}
</div>

<div class="u-sh"><div class="u-sh-t">Séances semaine {data.selectedWeek ?? data.currentWeek}</div></div>

{#if organizing}
	<form
		id="sport-plan-form"
		method="POST"
		action="?/saveWeekPlan"
		class="move-card mx-4"
		use:enhance={() => {
			savingPlan = true;
			return async ({ result, update }) => {
				savingPlan = false;
				if (result.type === 'success') {
					moveMessage = 'Organisation de la semaine enregistrée.';
					stopOrganizer();
				} else if (result.type === 'failure') {
					const failure = result.data as { message?: unknown } | null;
					moveMessage =
						failure && typeof failure.message === 'string'
							? failure.message
							: 'Impossible d’enregistrer ton organisation.';
				}
				await update({ invalidateAll: true });
			};
		}}
	>
		<input type="hidden" name="selectedWeek" value={String(data.selectedWeek ?? data.currentWeek)} />
		<input type="hidden" name="placements" value={planPayload} />
		<p class="move-title">Organiser la semaine</p>
		<p class="move-sub">Glisse une séance sur un jour, ou touche la séance puis le jour cible.</p>
		<p class="move-hint">Les 3 séances obligatoires doivent être placées. La séance facultative peut rester libre.</p>

		<div class="planner-list">
			{#each draftPlannerSessions as session (session.sessionId)}
				<button
					type="button"
					class="u-li planner-item"
					class:planner-item-selected={selectedSessionId === session.sessionId}
					class:planner-item-dragging={draggingSessionId === session.sessionId}
					disabled={session.completedAtISO != null}
					onpointerdown={(e) => startPlannerDrag(session.sessionId, e)}
					onclick={() => handlePlannerItemTap(session.sessionId)}
				>
					<div class="u-li-th" style:background={session.optional ? 'rgba(0,229,255,.14)' : 'var(--gd)'}>
						<span style:color={session.optional ? 'var(--cy)' : 'var(--gb)'} style="font-size:.625rem;font-weight:700;font-family:var(--fh2)">
							{session.sessionLetter ?? '?'}
						</span>
					</div>
					<div class="u-li-b">
						<div class="u-li-t">{session.sessionName}</div>
						<div class="u-li-s">
							{#if session.completedAtISO}
								Déjà validée cette semaine
							{:else if session.currentDayIndex != null}
								Placée au jour {session.currentDayIndex}
							{:else if session.optional}
								Facultative · place-la si tu veux
							{:else}
								Obligatoire · à placer
							{/if}
						</div>
					</div>
					<div class="u-li-r">
						{#if session.completedAtISO}
							<div class="planner-tag planner-tag-fixed">Validée</div>
						{:else if session.currentDayIndex != null}
							<div class="planner-tag">Jour {session.currentDayIndex}</div>
						{:else if session.optional}
							<div class="planner-tag planner-tag-empty">Libre</div>
						{:else}
							<div class="planner-tag planner-tag-empty">À placer</div>
						{/if}
					</div>
				</button>
				{#if session.optional && session.currentDayIndex != null && !session.completedAtISO}
					<button type="button" class="planner-clear" onclick={() => clearOptionalPlacement(session.sessionId)}>
						Retirer la séance facultative
					</button>
				{/if}
			{/each}
		</div>

		<div class="move-actions">
			<button type="submit" class="move-confirm" disabled={!canSavePlan || savingPlan}>
				{savingPlan ? 'Validation…' : 'Valider le placement'}
			</button>
			<button type="button" class="move-cancel" onclick={stopOrganizer} disabled={savingPlan}>
				Annuler
			</button>
		</div>
	</form>
{/if}

{#if moveMessage}
	<p class="move-feedback mx-4">{moveMessage}</p>
{/if}

{#if !organizing && rows.length === 0}
	<p class="mx-4 text-sm text-muted-foreground">
		Aucune séance sport prévue sur cette semaine dans le programme.
	</p>
{:else if !organizing}
	{#each rows as row (row.dayIndex)}
		{#if row.hrefSeance && !row.completedAtISO && row.isToday}
			<a href={row.hrefSeance} class="u-li li-cta pending" onclick={fire}>
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
				<div class="u-li-r"><div class="u-arr"></div></div>
			</a>
		{:else if row.hrefSeance && !row.completedAtISO}
			<a href={row.hrefSeance} class="u-li" onclick={fire}>
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
				<div class="u-li-r"><div class="u-arr"></div></div>
			</a>
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
	.week-actions {
		margin-top: 10px;
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.week-action-primary,
	.week-action-secondary {
		border-radius: 999px;
		padding: 0.48rem 0.8rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-family: var(--fh);
	}
	.week-action-primary {
		border: 1px solid rgba(0, 229, 255, 0.28);
		background: rgba(0, 229, 255, 0.12);
		color: var(--cy);
	}
	.week-action-secondary {
		border: 1px solid var(--br2);
		background: rgba(255, 255, 255, 0.06);
		color: var(--tx);
	}

	/* Surcharges spécifiques sport */
	.u-sd.today {
		animation: gpulse 2.5s ease-in-out infinite;
	}
	.planner-day {
		background: transparent;
	}
	.planner-day:active {
		background: rgba(0, 229, 255, 0.08);
	}
	.li-cta {
		border-left: 2px solid var(--g);
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
	.move-target {
		outline: 1px solid rgba(201, 168, 78, 0.55);
		box-shadow: 0 0 0 2px rgba(201, 168, 78, 0.18) inset;
	}
	.planner-list {
		margin-top: 0.75rem;
		display: grid;
		gap: 8px;
	}
	button.planner-item {
		width: 100%;
		border: 1px solid var(--br2);
		border-radius: 12px;
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.03);
		text-align: left;
		border-bottom-width: 1px;
	}
	button.planner-item:disabled {
		opacity: 0.6;
	}
	button.planner-item.planner-item-selected {
		border-color: rgba(0, 229, 255, 0.42);
		box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.12) inset;
	}
	button.planner-item.planner-item-dragging {
		opacity: 0.9;
		transform: scale(0.985);
	}
	.planner-tag {
		font-size: 0.55rem;
		font-family: var(--fb);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--cy);
	}
	.planner-tag-empty {
		color: var(--txd);
	}
	.planner-tag-fixed {
		color: var(--g);
	}
	.planner-clear {
		justify-self: end;
		margin-top: -2px;
		font-size: 0.5625rem;
		font-family: var(--fb);
		color: var(--txd);
		background: transparent;
		border: 0;
		text-decoration: underline;
	}
</style>
