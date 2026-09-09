import { writable } from 'svelte/store';
import { afterNavigate, onNavigate } from '$app/navigation';
import SmoothScrollBarStore from '$lib/store/SmoothScrollBarStore';

export const isClient = writable(false);
export const isNavigating = writable(false);

export function markClientMounted() {
	isClient.set(true);
}

export function setupNavigationEffect() {
	onNavigate((navigation) => {
		const fromRouteId = navigation.from?.route.id ?? null;
		const toRouteId = navigation.to?.route.id ?? null;

		if (fromRouteId !== null && toRouteId !== null && fromRouteId !== toRouteId) {
			isNavigating.set(true);
		}
	});

	afterNavigate(() => {
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
