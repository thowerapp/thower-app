// src/lib/store/layoutState.ts

import { writable } from 'svelte/store';
import pageTransitionStore from '$lib/store/pageTransition';
import { onNavigate } from '$app/navigation';
import SmoothScrollBarStore from '$lib/store/SmoothScrollBarStore';

export const isClient = writable(false);
export const loading = writable(true);
export const progressValue = writable(0);
export const previousRouteId = writable<string | null>(null);

export function initializeLayoutState(currentPage: { route: { id: string | null } }) {
	const currentData = {
		routeId: currentPage.route.id
	};

	pageTransitionStore.set({
		from: null,
		to: currentData
	});

	isClient.set(true);
	let currentProgress = 0;
	const timer = setInterval(() => {
		if (currentProgress < 100) {
			currentProgress += 10;
			progressValue.set(currentProgress);
		} else {
			clearInterval(timer);
			loading.set(false);
		}
	}, 10);

	SmoothScrollBarStore.update((state) => {
		if (state.smoothScroll) {
			state.smoothScroll.scrollTo(0, 0, 500); // Scroller en haut avec une animation
		} else {
			window.scrollTo(0, 0); // Fallback si smoothScroll n'est pas initialisé
		}
		return state;
	});
}

export function setupNavigationEffect() {
	onNavigate((navigation) => {
		const fromData = navigation.from ? { routeId: navigation.from.route.id } : null;
		const toData = navigation.to ? { routeId: navigation.to.route.id } : null;

		if (fromData && toData && fromData.routeId !== toData.routeId) {
			pageTransitionStore.set({
				from: fromData,
				to: toData
			});
			previousRouteId.set(toData.routeId as string | null);
		}
	});
}
