<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { fireElement } from '$lib/utils/particles';

	let { data } = $props<{ data: PageData }>();

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
			<div class="u-sd done">
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
			<div class="u-sd" style="opacity:.35">
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

{#if rows.length === 0}
	<p class="mx-4 text-sm text-muted-foreground">
		Aucune séance sport prévue sur cette semaine dans le programme.
	</p>
{:else}
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

	/* Surcharges spécifiques sport */
	.u-sd.today {
		animation: gpulse 2.5s ease-in-out infinite;
	}
	.li-cta {
		border-left: 2px solid var(--g);
	}
</style>
