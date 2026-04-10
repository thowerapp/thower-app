<script lang="ts">
	import { onMount } from 'svelte';
	import { sources, particles, setLoopCallback, type ParticleSource } from '$lib/utils/particles';

	let canvas: HTMLCanvasElement;
	let raf: number | null = null;
	let lastEmit = 0;

	// ── Spawn une braise depuis une source ──────────────────────────
	function spawnFromSource(src: ParticleSource): void {
		const el = src.element;
		const rect = el.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;

		let cx: number, cy: number;

		if (src.type === 'dot') {
			// Depuis le centre du point
			cx = rect.left + rect.width / 2;
			cy = rect.top + rect.height / 2;
		} else {
			// Depuis le bas de l'élément, réparti sur la largeur
			const margin = Math.min(12, rect.width * 0.15);
			cx = rect.left + margin + Math.random() * (rect.width - margin * 2);
			cy = rect.bottom - 2 + Math.random() * 3;
		}

		const vx = (Math.random() - 0.5) * 0.45;
		const vy = -(0.7 + Math.random() * 1.3);
		const life = 0.6 + Math.random() * 0.9;
		const sz = src.type === 'dot' ? 0.7 + Math.random() * 1.0 : 0.8 + Math.random() * 1.2;

		particles.push({
			x: cx,
			y: cy,
			vx,
			vy,
			life,
			ml: life,
			sz,
			seed: Math.random() * 200,
			isDot: src.type === 'dot'
		});
	}

	// ── Boucle principale ────────────────────────────────────────────
	function loop(now: number): void {
		const ctx = canvas?.getContext('2d');
		if (!ctx || !canvas) {
			raf = requestAnimationFrame(loop);
			return;
		}

		// Émission : ~15 fois/s max
		const dt = now - lastEmit;
		if (dt > 65) {
			lastEmit = now;
			for (const src of sources) {
				// Probabilité : dot = 38 %, pending = 58 %
				const prob = src.type === 'dot' ? 0.38 : 0.58;
				if (Math.random() < prob) spawnFromSource(src);
			}
		}

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];

			// Physique flamme : turbulence sinusoïdale + amortissement
			p.x += p.vx + Math.sin(now * 0.003 + p.seed) * 0.22;
			p.y += p.vy;
			p.vy *= 0.983;
			p.life -= 0.024;

			if (p.life <= 0) {
				particles.splice(i, 1);
				continue;
			}

			const frac = p.life / p.ml;
			// Scintillement irrégulier
			const flicker = 0.5 + Math.sin(now * 0.045 + p.seed) * 0.5;
			const alpha = frac * frac * flicker;

			// Couleur : jaune-blanc → orange → brun-rouge
			const r = 255;
			const g = p.isDot
				? Math.round(200 + 55 * frac) // bougie : reste jaune/blanc
				: Math.round(100 + 120 * frac); // braise : orange → rouge
			const b = p.isDot ? Math.round(80 * frac) : Math.round(10 * frac);

			// Core
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.sz * frac, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
			ctx.fill();

			// Halo doux
			if (frac > 0.3) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.sz * frac * (p.isDot ? 4 : 3.2), 0, Math.PI * 2);
				ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.08})`;
				ctx.fill();
			}
		}

		raf = requestAnimationFrame(loop);
	}

	function ensureRunning(): void {
		if (!raf) raf = requestAnimationFrame(loop);
	}

	function resizeCanvas(): void {
		if (!canvas) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	onMount(() => {
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Enregistre le callback pour redémarrer la boucle si elle s'est arrêtée
		setLoopCallback(ensureRunning);

		raf = requestAnimationFrame(loop);

		return () => {
			window.removeEventListener('resize', resizeCanvas);
			if (raf) {
				cancelAnimationFrame(raf);
				raf = null;
			}
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 9998;
	}
</style>
