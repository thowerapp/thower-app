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

	let displayedPoints = $state(0);
	let progressBarPct = $state(0);
	let pointsGain = $state(0);
	let lastAnimatedPoints = 0;

	function animateProgress(nextPoints: number, nextPercent: number) {
		const startPoints = displayedPoints;
		const startPercent = progressBarPct;
		const deltaPoints = nextPoints - startPoints;
		const deltaPercent = nextPercent - startPercent;
		const duration = 650;
		const startedAt = performance.now();

		function step(now: number) {
			const progress = Math.min((now - startedAt) / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			displayedPoints = Math.round(startPoints + deltaPoints * eased);
			progressBarPct = Math.round((startPercent + deltaPercent * eased) * 10) / 10;
			if (progress < 1) {
				requestAnimationFrame(step);
			}
		}

		requestAnimationFrame(step);
	}

	$effect(() => {
		const nextPoints = data.totalPoints ?? 0;
		const nextPercent = data.levelPercent ?? 0;
		const delta = nextPoints - lastAnimatedPoints;

		if (nextPoints === displayedPoints && nextPercent === progressBarPct) {
			lastAnimatedPoints = nextPoints;
			pointsGain = 0;
			return;
		}

		pointsGain = delta > 0 ? delta : 0;
		animateProgress(nextPoints, nextPercent);
		lastAnimatedPoints = nextPoints;
	});
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

<section class="seance-level mx-4" aria-label="Progression utilisateur">
	<div class="seance-level-head">
		<div>
			<p class="seance-level-kicker">Progression Thower</p>
			<h2 class="seance-level-title">{data.levelData?.name ?? 'Niveau actuel'}</h2>
		</div>
		<div class="seance-level-points">
			<strong>{displayedPoints}</strong>
			<span>pts</span>
		</div>
	</div>
	<div class="seance-level-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progressBarPct)}>
		<div class="seance-level-fill" style="width: {progressBarPct}%"></div>
	</div>
	<div class="seance-level-meta">
		<span>Niveau {data.levelData?.num ?? 1}</span>
		<span>{Math.round(progressBarPct)}%</span>
	</div>
	{#if pointsGain > 0}
		<p class="seance-level-gain">+{pointsGain} pts gagnés sur cette validation</p>
	{:else}
		<p class="seance-level-gain seance-level-gain--muted">
			Validation séance : +{data.workoutCompletionPoints ?? 50} pts
		</p>
	{/if}
</section>

<!-- Synthèse progression obligatoires -->
{#if summary.mandatoryTotal > 0}
	<div class="seance-synth mx-4">
		<div class="seance-synth-head">
			<span class="seance-synth-title">Progression (vidéos obligatoires)</span>
			<span class="seance-synth-count"
				>{summary.mandatoryValidated} / {summary.mandatoryTotal}</span
			>
		</div>
		<div class="seance-synth-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={mandatoryPct}>
			<div class="seance-synth-fill" style="width: {mandatoryPct}%"></div>
		</div>
		<p class="seance-synth-hint">
			Objectif pour valider une vidéo : au moins {data.validationThresholdPercent ?? 80} % de la durée
			(ou fin de lecture).
		</p>
		{#if summary.optionalTotal > 0}
			<p class="seance-synth-opt">
				Facultatif : {summary.optionalValidated} / {summary.optionalTotal} validée{summary.optionalTotal > 1
					? 's'
					: ''}
			</p>
		{/if}
	</div>
{/if}

{#if data.seanceCompletedAt}
	<p class="seance-banner seance-banner--ok mx-4">Séance enregistrée comme terminée côté programme.</p>
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
	{#each data.videos as v (v.id)}
		<article
			class="vp-card"
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
				<div class="vp-badge" data-state={v.progressState}>
					{#if v.progressState === 'preparing'}
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
				{#if v.status === 'ready'}
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
				if (result.type === 'success' && result.data && 'pointsAwarded' in result.data) {
					const awarded = Number(result.data.pointsAwarded ?? 0);
					if (awarded > 0) {
						pointsGain = awarded;
					}
				}
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

<p class="seance-footnote mx-4">+{data.workoutCompletionPoints ?? 50} pts côté gamification quand le programme enregistre la complétion.</p>

<style>
	.seance-level {
		margin-bottom: 1rem;
		padding: 0.95rem 1rem;
		border-radius: 14px;
		border: 1px solid rgba(34, 211, 238, 0.2);
		background:
			linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(16, 185, 129, 0.08)),
			rgba(0, 0, 0, 0.22);
	}
	.seance-level-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.seance-level-kicker {
		margin: 0;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.58);
		font-family: var(--fb, system-ui);
	}
	.seance-level-title {
		margin: 0.15rem 0 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--tx, #fff);
		font-family: var(--fb, system-ui);
	}
	.seance-level-points {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
		color: #67e8f9;
		font-family: var(--fb, system-ui);
	}
	.seance-level-points strong {
		font-size: 1.4rem;
		line-height: 1;
	}
	.seance-level-points span {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.seance-level-bar {
		height: 10px;
		border-radius: 999px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.1);
	}
	.seance-level-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #22d3ee, #34d399);
		transition: width 0.35s ease;
	}
	.seance-level-meta {
		margin-top: 0.45rem;
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.65);
		font-family: var(--fb, system-ui);
	}
	.seance-level-gain {
		margin: 0.55rem 0 0;
		font-size: 0.7rem;
		font-weight: 600;
		color: #6ee7b7;
		font-family: var(--fb, system-ui);
	}
	.seance-level-gain--muted {
		color: rgba(255, 255, 255, 0.62);
		font-weight: 500;
	}

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
	.seance-synth-hint,
	.seance-synth-opt {
		margin: 0.5rem 0 0;
		font-size: 0.625rem;
		line-height: 1.45;
		color: var(--txm, rgba(255, 255, 255, 0.5));
		font-family: var(--fb, system-ui);
	}
	.seance-synth-opt {
		margin-top: 0.25rem;
		color: var(--txd, rgba(255, 255, 255, 0.65));
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
	.vp-badge-ico {
		font-size: 0.7rem;
		line-height: 1;
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

	.seance-footnote {
		margin-top: 0.75rem;
		text-align: center;
		font-size: 0.65rem;
		color: var(--txm, rgba(255, 255, 255, 0.45));
		font-family: var(--fb, system-ui);
	}
</style>
