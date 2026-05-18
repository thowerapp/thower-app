<script lang="ts">
	import { onMount } from 'svelte';

	interface LevelData {
		num: number;
		name: string;
	}

	let { levelData }: { levelData: LevelData } = $props();

	const STORAGE_KEY = 'thower_last_level';

	let visible = $state(false);
	let animating = $state(false);

	onMount(() => {
		const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
		if (levelData.num > stored) {
			// Premier affichage ou level-up réel
			if (stored > 0) {
				// C'est un level-up (pas juste la première visite)
				visible = true;
				animating = true;
			}
			localStorage.setItem(STORAGE_KEY, String(levelData.num));
		}
	});

	function dismiss() {
		animating = false;
		setTimeout(() => { visible = false; }, 350);
	}

	$effect(() => {
		if (visible) {
			const t = setTimeout(dismiss, 5000);
			return () => clearTimeout(t);
		}
	});
</script>

{#if visible}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="luc-backdrop" class:out={!animating} onclick={dismiss}>
		<div class="luc-card" class:out={!animating} onclick={(e) => e.stopPropagation()}>
			<div class="luc-glow"></div>
			<div class="luc-rays">
				{#each { length: 8 } as _, i}
					<div class="luc-ray" style="--i:{i}"></div>
				{/each}
			</div>
			<div class="luc-icon">
				<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
					<polygon points="20,3 24,15 37,15 27,23 31,35 20,27 9,35 13,23 3,15 16,15" fill="var(--g)" opacity="0.9"/>
				</svg>
			</div>
			<div class="luc-eyebrow">Nouveau statut</div>
			<div class="luc-level-num">NIVEAU {levelData.num}</div>
			<div class="luc-level-name">{levelData.name}</div>
			<button type="button" class="luc-btn" onclick={dismiss}>
				Continuer
			</button>
		</div>
	</div>
{/if}

<style>
.luc-backdrop {
	position: fixed;
	inset: 0;
	z-index: 1000;
	background: rgba(0, 0, 0, 0.82);
	display: flex;
	align-items: center;
	justify-content: center;
	animation: luc-in 0.3s ease forwards;
}
.luc-backdrop.out {
	animation: luc-out 0.35s ease forwards;
}

.luc-card {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	padding: 48px 40px 36px;
	background: var(--s2);
	border: 1px solid rgba(201, 168, 78, 0.35);
	max-width: 280px;
	width: 90%;
	overflow: hidden;
	text-align: center;
	animation: luc-card-in 0.4s cubic-bezier(.2,.8,.3,1) forwards;
}
.luc-card.out {
	animation: luc-card-out 0.3s ease forwards;
}

/* Glow radial doré en fond */
.luc-glow {
	position: absolute;
	inset: 0;
	background: radial-gradient(ellipse at 50% 30%, rgba(201,168,78,0.18) 0%, transparent 70%);
	pointer-events: none;
}

/* Rayons lumineux */
.luc-rays {
	position: absolute;
	inset: 0;
	pointer-events: none;
}
.luc-ray {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 2px;
	height: 120px;
	background: linear-gradient(to bottom, rgba(201,168,78,0.4), transparent);
	transform-origin: top center;
	transform: translate(-50%, -100%) rotate(calc(var(--i) * 45deg));
	animation: luc-ray-spin 4s linear infinite, luc-ray-fade 0.5s ease 0.1s forwards;
	opacity: 0;
}

.luc-icon {
	position: relative;
	width: 56px;
	height: 56px;
	margin-bottom: 4px;
	animation: luc-star-pop 0.5s cubic-bezier(.2,1.5,.4,1) 0.15s both;
}
.luc-icon svg {
	width: 100%;
	height: 100%;
	filter: drop-shadow(0 0 14px rgba(201,168,78,0.7));
}

.luc-eyebrow {
	font-size: 0.5rem;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--txd);
	font-family: var(--fb);
}

.luc-level-num {
	font-family: var(--fh);
	font-size: 2.8rem;
	font-weight: 900;
	color: var(--g);
	letter-spacing: -0.05em;
	line-height: 1;
	text-shadow: 0 0 30px rgba(201,168,78,0.5);
}

.luc-level-name {
	font-family: var(--fb);
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--tx);
	letter-spacing: 0.04em;
	margin-top: 2px;
}

.luc-btn {
	margin-top: 20px;
	padding: 9px 28px;
	background: var(--g);
	color: var(--s1);
	border: none;
	font-family: var(--fb);
	font-size: 0.5625rem;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	cursor: pointer;
	transition: opacity 0.15s;
}
.luc-btn:active { opacity: 0.8; }

/* ── Keyframes ── */
@keyframes luc-in {
	from { opacity: 0; }
	to   { opacity: 1; }
}
@keyframes luc-out {
	from { opacity: 1; }
	to   { opacity: 0; }
}
@keyframes luc-card-in {
	from { transform: scale(0.85) translateY(12px); opacity: 0; }
	to   { transform: scale(1) translateY(0);       opacity: 1; }
}
@keyframes luc-card-out {
	from { transform: scale(1) translateY(0);       opacity: 1; }
	to   { transform: scale(0.9) translateY(8px);  opacity: 0; }
}
@keyframes luc-star-pop {
	from { transform: scale(0) rotate(-30deg); }
	to   { transform: scale(1) rotate(0deg); }
}
@keyframes luc-ray-spin {
	to { transform: translate(-50%, -100%) rotate(calc(var(--i) * 45deg + 360deg)); }
}
@keyframes luc-ray-fade {
	to { opacity: 1; }
}
</style>
