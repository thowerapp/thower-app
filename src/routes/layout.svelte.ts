import { writable } from 'svelte/store';
import { afterNavigate, onNavigate } from '$app/navigation';
import SmoothScrollBarStore from '$lib/store/SmoothScrollBarStore';

export const isClient = writable(false);
export const isNavigating = writable(false);

/** Le glyphe n'apparaît que si la navigation dure réellement — pas de flash sur un changement instantané. */
const NAVIGATION_SPINNER_DELAY_MS = 200;
let showSpinnerTimer: ReturnType<typeof setTimeout> | null = null;

export function markClientMounted() {
	isClient.set(true);
}

export function setupNavigationEffect() {
	onNavigate((navigation) => {
		const fromUrl = navigation.from?.url.href ?? null;
		const toUrl = navigation.to?.url.href ?? null;

		// Comparer l'URL réelle (pas navigation.route.id) : deux séances/jours différents
		// partagent le même pattern de route ([sessionId], [day]…) mais sont bien une navigation.
		if (fromUrl !== null && toUrl !== null && fromUrl !== toUrl) {
			showSpinnerTimer = setTimeout(() => isNavigating.set(true), NAVIGATION_SPINNER_DELAY_MS);
		}
	});

	afterNavigate(() => {
		if (showSpinnerTimer) {
			clearTimeout(showSpinnerTimer);
			showSpinnerTimer = null;
		}
		isNavigating.set(false);

		SmoothScrollBarStore.update((state) => {
			if (state.smoothScroll) {
				state.smoothScroll.scrollTo(0, 0, 500); // Scroller en haut avec une animation
			} else {
				window.scrollTo(0, 0); // Fallback si smoothScroll n'est pas initialisé
			}
			return state;
		});
	});
}
