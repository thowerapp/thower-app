<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import CloudflareVideoPlayer from '$lib/components/CloudflareVideoPlayer.svelte';
	import { fireElement } from '$lib/utils/particles';

	let { data } = $props<{ data: PageData }>();

	function fire(e: MouseEvent) {
		fireElement(e.currentTarget as HTMLElement, e);
	}

	const posLabel: Record<string, string> = {
		PRE: 'Pré-séance',
		VID1: 'Vidéo 1',
		VID2: 'Vidéo 2'
	};

	/** m:ss */
	function formatSec(totalSec: number): string {
		const s = Math.max(0, Math.floor(totalSec));
		const m = Math.floor(s / 60);
		const r = s % 60;
		return `${m}:${r.toString().padStart(2, '0')}`;
	}

	const summary = $derived(
		data.seanceVideoSummary ?? {
			mandatoryValidated: 0,
			mandatoryTotal: 0,
			optionalValidated: 0,
			optionalTotal: 0
		}
	);

	const mandatoryPct = $derived(
		summary.mandatoryTotal > 0
			? Math.round((summary.mandatoryValidated / summary.mandatoryTotal) * 100)
			: 0
	);

	const sessionVideos = $derived(data.videos ?? []);

	function isVideoUnlocked(index: number): boolean {
		if (!data.canWatchSession) return false;
		const v = sessionVideos[index];
		if (v?.isOptional) return true; // pré-séance toujours accessible
		// Pour les vidéos obligatoires, seules les précédentes obligatoires doivent être validées
		const prevRequired = sessionVideos.slice(0, index).filter((sv) => !sv.isOptional);
		return prevRequired.every((sv) => sv.progressState === 'validated');
	}
</script>

<div class="u-back-row">
	<a href="/user/sport" class="u-back-lnk" onclick={fire}>
		<svg width="12" height="12" viewBox="0 0 14 14"
			><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"></path></svg
		>
		<span class="u-back-lbl">Sport</span>
	</a>
	<div class="u-back-head">Séance</div>
</div>

<div class="u-sh">
	<div class="u-sh-t">{data.sessionName}</div>
	<div class="u-sh-s">
		Jour {data.dayIndex} / 91
		{#if data.scheduledDateISO}
			· {data.scheduledDateISO.slice(0, 10)}
		{/if}
	</div>
</div>

<div class="seance-expected mx-4">Visionne les vidéos obligatoires (VID1 + VID2) dans l’ordre pour valider la séance. La pré-séance est facultative.</div>

{#if summary.mandatoryTotal > 0}
	<div class="seance-synth mx-4">
		<div class="seance-synth-head">
			<span class="seance-synth-title">Vidéos obligatoires</span>
			<span class="seance-synth-count">{summary.mandatoryValidated} / {summary.mandatoryTotal}</span>
		</div>
		<div class="seance-synth-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={mandatoryPct}>
			<div class="seance-synth-fill" style="width: {mandatoryPct}%"></div>
		</div>
	</div>
{/if}

{#if data.seanceCompletedAt}
	<p class="seance-banner seance-banner--ok mx-4">Séance enregistrée comme terminée côté programme.</p>
{:else if data.prerequisiteBlocked}
	<p class="seance-banner seance-banner--wait mx-4">{data.prerequisiteMessage}</p>
{:else if !data.canValidateSession}
	<p class="seance-banner seance-banner--wait mx-4">
		Cette séance est placée après le jour actuel du programme. Elle se débloquera à partir du jour {data.dayIndex}.
	</p>
{:else if !data.allMandatoryVideosCompleted}
	<p class="seance-banner seance-banner--wait mx-4">
		Le bouton de validation apparaîtra uniquement quand les vidéos <strong>obligatoires</strong> seront toutes au statut « Validée ».
	</p>
{/if}

<div class="seance-videos mx-4">
	{#each sessionVideos as v, i (v.id)}
		{@const unlocked = isVideoUnlocked(i)}
		<article
			class="vp-card"
			class:vp-card--locked={!unlocked}
			class:vp-card--ok={v.progressState === 'validated'}
			class:vp-card--run={v.progressState === 'in_progress'}
			class:vp-card--wait={v.progressState === 'not_started'}
			class:vp-card--prep={v.progressState === 'preparing'}
		>
			<header class="vp-head">
				<div class="vp-titles">
					<span class="vp-label">{posLabel[v.position] ?? v.position}</span>
					{#if v.isOptional}
						<span class="vp-optional">facultative</span>
					{/if}
					<span class="vp-sep">·</span>
					<span class="vp-name">{v.title}</span>
				</div>
				<div class="vp-badge" data-state={!unlocked ? 'locked' : v.progressState}>
					{#if !unlocked}
						<span class="vp-badge-ico" aria-hidden="true">🔒</span>
						Verrouillée
					{:else if v.progressState === 'preparing'}
						<span class="vp-badge-ico" aria-hidden="true">⏳</span>
						Préparation
					{:else if v.progressState === 'not_started'}
						<span class="vp-badge-ico" aria-hidden="true">○</span>
						Pas commencée
					{:else if v.progressState === 'in_progress'}
						<span class="vp-badge-ico" aria-hidden="true">▶</span>
						En cours
					{:else}
						<span class="vp-badge-ico" aria-hidden="true">✓</span>
						Validée
					{/if}
				</div>
			</header>

			{#if v.progressState === 'in_progress' && v.watchedPercent != null}
				<div class="vp-meter">
					<div class="vp-meter-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={v.watchedPercent}>
						<div class="vp-meter-fill" style="width: {v.watchedPercent}%"></div>
					</div>
					<p class="vp-meter-txt">
						Environ {v.watchedPercent} % de la durée
						{#if v.durationSeconds}
							· position {formatSec(v.maxPositionSec ?? 0)} / {formatSec(v.durationSeconds)}
						{/if}
					</p>
				</div>
			{:else if v.progressState === 'in_progress'}
				<p class="vp-foot-start">Lecture en cours — la durée totale n’est pas encore connue (synchro bientôt disponible).</p>
			{:else if v.progressState === 'validated' && v.durationSeconds}
				<p class="vp-foot-ok">Objectif de visionnage atteint (≥ {data.validationThresholdPercent ?? 80} % ou fin
					lecture).</p>
			{:else if v.progressState === 'preparing'}
				<p class="vp-foot-prep">Transcodage Cloudflare : le lecteur apparaîtra dès que la vidéo est prête (statut
					: {v.status}).</p>
			{:else if v.progressState === 'not_started' && v.status === 'ready'}
				<p class="vp-foot-start">Lance la lecture : ta progression s’enregistre tout au long de la vidéo.</p>
			{/if}

			<div class="vp-player">
				{#if !unlocked}
					<div class="vp-placeholder">
						<p>
							{#if !data.canWatchSession}
								Cette séance se débloque au jour {data.dayIndex}.
							{:else}
								Visionne d’abord la vidéo précédente pour débloquer ce bloc.
							{/if}
						</p>
					</div>
				{:else if v.cloudflareUid != null}
					<CloudflareVideoPlayer
						kind="workout"
						videoId={v.id}
						onCompleted={async () => {
							await invalidateAll();
						}}
					/>
				{:else}
					<div class="vp-placeholder">
						<p>Contenu indisponible pour le moment.</p>
					</div>
				{/if}
			</div>
		</article>
	{/each}
</div>

{#if !data.seanceCompletedAt && data.allMandatoryVideosCompleted && data.canValidateSession}
	<form
		method="POST"
		action="?/markCompleted"
		use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				await invalidateAll();
			};
		}}
		class="seance-form"
	>
		<input type="hidden" name="dayIndex" value={data.dayIndex} />
		<button type="submit" class="seance-cta">Valider la séance</button>
	</form>
{/if}

<style>
	.seance-synth {
		margin-bottom: 1rem;
		padding: 0.9rem 1rem;
		border-radius: 12px;
		border: 1px solid var(--br, rgba(255, 255, 255, 0.08));
		background: rgba(0, 0, 0, 0.2);
	}
	.seance-synth-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.seance-synth-title {
		font-size: 0.6875rem;
		font-weight: 600;
		font-family: var(--fb, system-ui);
		color: var(--tx, #fff);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.seance-synth-count {
		font-size: 0.8125rem;
		font-weight: 700;
		font-family: var(--fb, system-ui);
		color: var(--g, #5eead4);
	}
	.seance-synth-bar {
		height: 6px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}
	.seance-synth-fill {
		height: 100%;
		border-radius: 4px;
		background: linear-gradient(90deg, var(--g, #34d399), var(--cy, #22d3ee));
		transition: width 0.35s ease;
	}

	.seance-banner {
		margin-bottom: 1rem;
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		font-size: 0.75rem;
		line-height: 1.45;
	}
	.seance-banner--ok {
		background: rgba(52, 211, 153, 0.12);
		border: 1px solid rgba(52, 211, 153, 0.35);
		color: var(--g, #6ee7b7);
	}
	.seance-banner--wait {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--br, rgba(255, 255, 255, 0.1));
		color: var(--txd, rgba(255, 255, 255, 0.8));
	}

	.seance-videos {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.vp-card {
		border-radius: 14px;
		border: 1px solid var(--br, rgba(255, 255, 255, 0.1));
		background: rgba(0, 0, 0, 0.25);
		overflow: hidden;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}
	.vp-card--ok {
		border-color: rgba(52, 211, 153, 0.45);
		box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.08);
	}
	.vp-card--run {
		border-color: rgba(250, 204, 21, 0.4);
	}
	.vp-card--wait {
		border-color: rgba(255, 255, 255, 0.12);
	}
	.vp-card--prep {
		border-color: rgba(148, 163, 184, 0.35);
	}
	.vp-card--locked {
		border-color: rgba(148, 163, 184, 0.3);
		opacity: 0.78;
	}

	.vp-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem 0.5rem;
		flex-wrap: wrap;
	}
	.vp-titles {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem 0.4rem;
		font-size: 0.7rem;
		line-height: 1.35;
	}
	.vp-label {
		font-weight: 700;
		color: var(--tx, #fff);
		font-family: var(--fb, system-ui);
	}
	.vp-optional {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--txm, rgba(255, 255, 255, 0.5));
	}
	.vp-sep {
		color: var(--txm, rgba(255, 255, 255, 0.4));
	}
	.vp-name {
		color: var(--txd, rgba(255, 255, 255, 0.8));
		font-weight: 500;
	}

	.vp-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		font-size: 0.625rem;
		font-weight: 700;
		font-family: var(--fb, system-ui);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	.vp-badge[data-state='preparing'] {
		background: rgba(148, 163, 184, 0.2);
		color: #cbd5e1;
	}
	.vp-badge[data-state='not_started'] {
		background: rgba(255, 255, 255, 0.08);
		color: var(--txd, #e2e8f0);
	}
	.vp-badge[data-state='in_progress'] {
		background: rgba(250, 204, 21, 0.18);
		color: #fde047;
	}
	.vp-badge[data-state='validated'] {
		background: rgba(52, 211, 153, 0.2);
		color: #6ee7b7;
	}
	.vp-badge[data-state='locked'] {
		background: rgba(148, 163, 184, 0.24);
		color: #cbd5e1;
	}
	.vp-badge-ico {
		font-size: 0.7rem;
		line-height: 1;
	}

	.seance-expected {
		margin-bottom: 0.8rem;
		font-size: 0.7rem;
		color: var(--txd, rgba(255, 255, 255, 0.78));
		font-family: var(--fb, system-ui);
	}

	.vp-meter {
		padding: 0 1rem 0.5rem;
	}
	.vp-meter-bar {
		height: 4px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}
	.vp-meter-fill {
		height: 100%;
		border-radius: 3px;
		background: linear-gradient(90deg, #facc15, #f59e0b);
	}
	.vp-meter-txt {
		margin: 0.35rem 0 0;
		font-size: 0.625rem;
		color: var(--txm, rgba(255, 255, 255, 0.6));
		font-family: var(--fb, system-ui);
	}

	.vp-foot-ok,
	.vp-foot-prep,
	.vp-foot-start {
		margin: 0 1rem 0.5rem;
		font-size: 0.625rem;
		line-height: 1.45;
		color: var(--txm, rgba(255, 255, 255, 0.6));
		font-family: var(--fb, system-ui);
	}
	.vp-foot-ok {
		color: rgba(110, 231, 183, 0.85);
	}

	.vp-player {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.vp-placeholder {
		aspect-ratio: 16 / 9;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.75rem;
		padding: 1rem;
		text-align: center;
	}

	.seance-form {
		margin: 1.25rem 1rem 0;
	}
	.seance-cta {
		width: 100%;
		border-radius: 10px;
		padding: 0.7rem 1rem;
		background: var(--cy, #22d3ee);
		color: var(--s1, #0f172a);
		font-weight: 600;
		font-size: 0.875rem;
		border: none;
		cursor: pointer;
		transition: filter 0.15s ease, transform 0.1s ease;
	}
	.seance-cta:hover {
		filter: brightness(1.06);
	}
	.seance-cta:active {
		transform: scale(0.99);
	}
	.seance-cta:disabled {
		opacity: 0.55;
		cursor: default;
		filter: saturate(0.7);
	}

</style>
