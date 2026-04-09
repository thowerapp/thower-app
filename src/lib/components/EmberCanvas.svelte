<script lang="ts">
	import { onMount } from 'svelte';

	let { active = true }: { active?: boolean } = $props();

	let canvas: HTMLCanvasElement;
	let raf = 0;
	let interval: ReturnType<typeof setInterval>;

	type Ember = {
		x: number; y: number; vx: number; vy: number;
		life: number; ml: number; sz: number; seed: number;
	};
	const pool: Ember[] = [];

	function spawn(w: number, h: number) {
		const life = 0.7 + Math.random() * 0.9;
		pool.push({
			x: w * 0.05 + Math.random() * w * 0.9,
			y: h - 2,
			vx: (Math.random() - 0.5) * 0.65,
			vy: -(0.85 + Math.random() * 1.4),
			life, ml: life,
			sz: 0.8 + Math.random() * 1.3,
			seed: Math.random() * 200
		});
	}

	function loop(t: number) {
		const ctx = canvas?.getContext('2d');
		if (!ctx || !canvas) return;
		const W = canvas.width, H = canvas.height;
		ctx.clearRect(0, 0, W, H);
		let alive = false;
		for (let i = pool.length - 1; i >= 0; i--) {
			const p = pool[i];
			p.x += p.vx + Math.sin(t * 0.003 + p.seed) * 0.18;
			p.y += p.vy;
			p.vy *= 0.985;
			p.life -= 0.022;
			if (p.life <= 0 || p.y < -10) { pool.splice(i, 1); continue; }
			alive = true;
			const frac = p.life / p.ml;
			const a = frac * frac * (0.55 + Math.sin(t * 0.04 + p.seed) * 0.45);
			const g = Math.round(140 + 90 * frac), b = Math.round(20 * frac);
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.sz * frac, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(255,${g},${b},${a})`;
			ctx.fill();
			if (frac > 0.4) {
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.sz * frac * 2.8, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(255,${g},${b},${a * 0.1})`;
				ctx.fill();
			}
		}
		if (alive || active) raf = requestAnimationFrame(loop);
		else raf = 0;
	}

	function start() {
		if (!canvas) return;
		canvas.width = canvas.offsetWidth || 300;
		canvas.height = canvas.offsetHeight || 60;
		clearInterval(interval);
		interval = setInterval(() => {
			if (!active || !canvas) return;
			for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) spawn(canvas.width, canvas.height);
		}, 88);
		if (!raf) raf = requestAnimationFrame(loop);
	}

	function stop() {
		clearInterval(interval);
		cancelAnimationFrame(raf);
		raf = 0;
		canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
	}

	onMount(() => {
		if (active) start();
		return stop;
	});

	$effect(() => {
		if (active) start();
		else stop();
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 3;
	}
</style>
