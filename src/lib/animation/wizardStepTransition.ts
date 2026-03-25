import gsap from 'gsap';
import { browser } from '$app/environment';
import type { TransitionConfig } from 'svelte/transition';

function reducedMotion(): boolean {
	if (!browser || typeof matchMedia === 'undefined') return false;
	return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Courbes GSAP — même famille que les timelines habituelles (fluide, pro) */
const easeOut = gsap.parseEase('power3.out');
const easeIn = gsap.parseEase('power2.in');

/**
 * Entrée d’étape : léger slide + fade + micro scale.
 * Durée courte pour rester « snappy » sur mobile.
 */
export function wizardStepIn(node: Element, { stepDir }: { stepDir: number }): TransitionConfig {
	if (!browser) return { duration: 0 };
	const el = node as HTMLElement;
	if (reducedMotion()) {
		return {
			duration: 100,
			easing: (t) => t,
			tick(t: number) {
				el.style.opacity = String(t);
				if (t >= 1) el.style.removeProperty('opacity');
			}
		};
	}
	const dx = 26 * stepDir;
	return {
		duration: 265,
		easing: (t) => t,
		tick(t: number) {
			const p = easeOut(t);
			const x = (1 - p) * dx;
			const s = 0.982 + 0.018 * p;
			el.style.opacity = String(p);
			el.style.transform = `translate3d(${x}px,0,0) scale(${s})`;
			if (t >= 1) {
				el.style.removeProperty('opacity');
				el.style.removeProperty('transform');
			}
		}
	};
}

/**
 * Sortie d’étape : plus rapide que l’entrée, accent sur l’accélération (power2.in).
 */
export function wizardStepOut(node: Element, { stepDir }: { stepDir: number }): TransitionConfig {
	if (!browser) return { duration: 0 };
	const el = node as HTMLElement;
	if (reducedMotion()) {
		return {
			duration: 80,
			easing: (t) => t,
			tick(t: number) {
				el.style.opacity = String(t);
				el.style.pointerEvents = 'none';
			}
		};
	}
	const dx = -22 * stepDir;
	return {
		duration: 175,
		easing: (t) => t,
		tick(t: number) {
			const u = 1 - t;
			const e = easeIn(u);
			const s = 1 - 0.012 * e;
			el.style.opacity = String(1 - e);
			el.style.transform = `translate3d(${dx * e}px,0,0) scale(${s})`;
			el.style.pointerEvents = 'none';
		}
	};
}
