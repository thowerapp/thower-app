// ══════════════════════════════════════════════════════════════
//  PARTICLE SYSTEM — sources persistantes + bursts au clic
//  Singleton partagé entre le canvas et les composants consommateurs.
// ══════════════════════════════════════════════════════════════

export type ParticleSourceType = 'pending' | 'dot';

export interface ParticleSource {
	element: HTMLElement;
	type: ParticleSourceType;
}

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	ml: number; // max life
	sz: number; // size
	seed: number;
	isDot: boolean;
}

/** Tableau partagé des sources actives (éléments .pending / indicateurs) */
export const sources: ParticleSource[] = [];

/** Tableau partagé des particules en vol */
export const particles: Particle[] = [];

/** Callback enregistré par le canvas pour redémarrer la boucle si besoin */
let _onChanged: (() => void) | null = null;

export function setLoopCallback(cb: () => void): void {
	_onChanged = cb;
}

/**
 * Re-scanne le DOM pour trouver tous les éléments sources :
 *  - .pending  → flamme montante depuis le bas de l'élément
 *  - .pin-dot, .ndot → flamme de bougie depuis le centre du point
 *
 * Appeler après chaque changement d'écran ou d'état.
 */
export function registerSources(container: HTMLElement = document.body): void {
	sources.length = 0;

	// Éléments en attente (.pending) visibles dans le conteneur
	container.querySelectorAll<HTMLElement>('.pending').forEach((el) => {
		if (el.offsetParent !== null) {
			sources.push({ element: el, type: 'pending' });
		}
	});

	// Petits points indicateurs
	container.querySelectorAll<HTMLElement>('.pin-dot, .ndot').forEach((el) => {
		if (el.offsetParent !== null) {
			sources.push({ element: el, type: 'dot' });
		}
	});

	_onChanged?.();
}

/**
 * Effet "consume" : un flash radial se propage depuis le point de clic
 * puis se dissipe rapidement — remplace l'explosion de particules.
 */
export function fireElement(el: HTMLElement, event?: MouseEvent | PointerEvent): void {
	// Calcul du point d'origine (clic ou centre de l'élément)
	const rect = el.getBoundingClientRect();
	let ox = rect.width / 2;
	let oy = rect.height / 2;
	if (event) {
		ox = event.clientX - rect.left;
		oy = event.clientY - rect.top;
	}

	// Taille du cercle : doit couvrir tout l'élément depuis le point d'impact
	const maxDist = Math.max(
		Math.hypot(ox, oy),
		Math.hypot(rect.width - ox, oy),
		Math.hypot(ox, rect.height - oy),
		Math.hypot(rect.width - ox, rect.height - oy)
	);
	const size = maxDist * 2.2;

	const ripple = document.createElement('span');
	ripple.style.cssText = `
		position:absolute;
		left:${ox}px;top:${oy}px;
		width:${size}px;height:${size}px;
		transform:translate(-50%,-50%) scale(0);
		border-radius:50%;
		background:radial-gradient(circle, rgba(0,229,255,0.18) 0%, rgba(0,229,255,0.06) 50%, transparent 70%);
		pointer-events:none;
		z-index:999;
		animation:_consume 380ms cubic-bezier(.2,.8,.4,1) forwards;
	`;

	// Injecte le keyframe une seule fois
	if (!document.getElementById('_consume-kf')) {
		const style = document.createElement('style');
		style.id = '_consume-kf';
		style.textContent = `
			@keyframes _consume {
				0%   { transform:translate(-50%,-50%) scale(0);   opacity:1; }
				55%  { transform:translate(-50%,-50%) scale(1);   opacity:.85; }
				100% { transform:translate(-50%,-50%) scale(1.1); opacity:0; }
			}
		`;
		document.head.appendChild(style);
	}

	// S'assure que l'élément peut contenir un enfant positionné
	const pos = getComputedStyle(el).position;
	if (pos === 'static') el.style.position = 'relative';

	el.appendChild(ripple);
	ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}
