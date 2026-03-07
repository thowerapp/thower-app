import { writable } from 'svelte/store';

/** Événement BeforeInstallPrompt capturé au chargement de l'app (layout racine). */
export interface DeferredInstallPrompt {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Store global : défini dès que le navigateur émet beforeinstallprompt (souvent au premier load). */
export const pwaInstallPrompt = writable<DeferredInstallPrompt | null>(null);
