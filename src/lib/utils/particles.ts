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
 * Effet "unlock" : explosion de 8 étincelles dorées depuis le centre d'un élément.
 * Utilisé quand un contenu passe de verrouillé à déverrouillé.
 */
export function burstUnlock(el: HTMLElement): void {
	const rect = el.getBoundingClientRect();
	const cx = rect.width / 2;
	const cy = rect.height / 2;

	if (!document.getElementById('_burst-kf')) {
		const style = document.createElement('style');
		style.id = '_burst-kf';
		style.textContent = `
			@keyframes _spark {
				0%   { transform: translate(-50%,-50%) translate(0,0) scale(1); opacity:1; }
				100% { transform: translate(-50%,-50%) translate(var(--sx),var(--sy)) scale(0); opacity:0; }
			}
		`;
		document.head.appendChild(style);
	}

	const pos = getComputedStyle(el).position;
	if (pos === 'static') el.style.position = 'relative';

	const COUNT = 8;
	for (let i = 0; i < COUNT; i++) {
		const angle = (i / COUNT) * Math.PI * 2;
		const dist = 28 + Math.random() * 18;
		const sx = Math.round(Math.cos(angle) * dist);
		const sy = Math.round(Math.sin(angle) * dist);
		const size = 3 + Math.random() * 3;

		const spark = document.createElement('span');
		spark.style.cssText = `
			position:absolute;
			left:${cx}px;top:${cy}px;
			width:${size}px;height:${size}px;
			border-radius:50%;
			background:var(--g,#c9a84c);
			pointer-events:none;
			z-index:999;
			--sx:${sx}px;--sy:${sy}px;
			animation:_spark ${320 + Math.random() * 160}ms cubic-bezier(.2,.8,.3,1) ${i * 20}ms forwards;
		`;
		el.appendChild(spark);
		spark.addEventListener('animationend', () => spark.remove(), { once: true });
	}
}

/**
 * Détecte les éléments nouvellement déverrouillés depuis la dernière visite.
 * Stocke les IDs verrouillés dans localStorage sous `storageKey`.
 * Appelle `burstUnlock` sur chaque élément `[data-vid-id="X"]` nouvellement déverrouillé.
 */
export function fireNewlyUnlocked(
	storageKey: string,
	videos: { id: string; locked: boolean }[]
): void {
	const storedRaw = localStorage.getItem(storageKey);
	const previouslyLocked: Set<string> = storedRaw ? new Set(JSON.parse(storedRaw)) : new Set();
	const currentlyLocked = new Set(videos.filter((v) => v.locked).map((v) => v.id));

	// Mettre à jour localStorage
	localStorage.setItem(storageKey, JSON.stringify([...currentlyLocked]));

	if (previouslyLocked.size === 0) return; // première visite, pas d'effet

	// IDs qui étaient verrouillés et ne le sont plus
	const newlyUnlocked = [...previouslyLocked].filter((id) => !currentlyLocked.has(id));

	newlyUnlocked.forEach((id, idx) => {
		setTimeout(() => {
			const el = document.querySelector<HTMLElement>(`[data-vid-id="${id}"]`);
			if (el) burstUnlock(el);
		}, 300 + idx * 120);
	});
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
