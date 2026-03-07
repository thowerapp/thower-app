// -----------------------------------------------------------------------------
// src/lib/stores/colorMode.ts
// -----------------------------------------------------------------------------
import { writable } from 'svelte/store';

export type Scheme = 'light' | 'dark';

/* ───────────── Constantes localStorage ───────────── */
const LS_SCHEME = 'color-scheme';
const LS_DARK = 'darkMode'; // ← nouvelle clé booléenne

/* ───────────── Helpers ───────────── */
function writeLS(mode: Scheme) {
	localStorage.setItem(LS_SCHEME, mode);
	localStorage.setItem(LS_DARK, (mode === 'dark').toString()); // 'true' | 'false'
}

function readLS(): Scheme | null {
	const saved = localStorage.getItem(LS_SCHEME) as Scheme | null;
	// On accepte seulement 'light' ou 'dark'
	return saved === 'dark' || saved === 'light' ? saved : null;
}

function initial(): Scheme {
	/* 1. préférence enregistrée par l’utilisateur */
	if (typeof localStorage !== 'undefined') {
		const saved = readLS();
		if (saved) return saved;
	}

	/* 2. classe déjà présente sur <html> */
	if (typeof document !== 'undefined') {
		return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	}

	/* 3. media-query (SSR ⇒ light) */
	return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';
}

/* ───────────── Store + API publique ───────────── */
function createColorMode() {
	const { subscribe, set } = writable<Scheme>(initial());

	function apply(mode: Scheme) {
		/* ① MAJ classe HTML */
		document.documentElement.classList.toggle('dark', mode === 'dark');

		/* ② MAJ localStorage */
		writeLS(mode);

		/* ③ MAJ store */
		set(mode);
	}

	/* synchro système (si l’utilisateur n’a pas forcé un mode) */
	if (typeof window !== 'undefined') {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			// on ne respecte le media-query que si aucune préférence n’est stockée
			if (!readLS()) apply(mq.matches ? 'dark' : 'light');
		};
		mq.addEventListener('change', handler);
	}

	return {
		subscribe,

		/** Force explicitement 'light' ou 'dark'. */
		set: (m: Scheme) => apply(m),

		/** Bascule au prochain mode. */
		toggle: () => apply(document.documentElement.classList.contains('dark') ? 'light' : 'dark')
	};
}

export const colorMode = createColorMode();
