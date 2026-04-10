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
 * Émet un burst de 28 particules depuis le centre d'un élément cliqué.
 */
export function fireElement(el: HTMLElement): void {
	const rect = el.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;

	for (let i = 0; i < 28; i++) {
		const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
		const sp = 1.5 + Math.random() * 3;
		const life = 0.5 + Math.random() * 0.7;
		particles.push({
			x: cx + (Math.random() - 0.5) * 10,
			y: cy + (Math.random() - 0.5) * 10,
			vx: Math.cos(angle) * sp,
			vy: Math.sin(angle) * sp,
			life,
			ml: life,
			sz: 1.2 + Math.random() * 2,
			seed: Math.random() * 200,
			isDot: false
		});
	}

	_onChanged?.();
}
