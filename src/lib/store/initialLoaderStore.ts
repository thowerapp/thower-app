import { writable } from 'svelte/store';

// États de chargement individuels
export const loadingStates = writable({
	firstOpen: false,
	domLoaded: false,
	ressourceToValide: false
});

// Store séparé pour firstLoadComplete
export const firstLoadComplete = writable(false);

export function setFirstLoadComplete(value: boolean) {
	firstLoadComplete.set(value);
}

// Fonctions pour mettre à jour les états de chargement
export function setFirstOpen(value: boolean) {
	loadingStates.update((states) => {
		if (!states) return states;
		return { ...states, firstOpen: value };
	});
}

export function setDomLoaded(value: boolean) {
	loadingStates.update((states) => {
		if (!states) return states;
		return { ...states, domLoaded: value };
	});
}

export function setRessourceToValide(value: boolean) {
	loadingStates.update((states) => {
		if (!states) return states;
		return { ...states, ressourceToValide: value };
	});
}

// // Logs pour le débogage
// loadingStates.subscribe(($loadingStates) => {
// 	console.log('Loading States: ', $loadingStates);
// });

// firstLoadComplete.subscribe(($firstLoadComplete) => {
// 	console.log('First Load Complete: ', $firstLoadComplete);
// });
