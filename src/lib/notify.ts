// Notifications d'engagement dans l'espace user (toasts svelte-sonner, Toaster monté dans le layout racine).
// En haut : la barre de navigation basse masquerait les toasts.

import { toast } from 'svelte-sonner';

const BASE_STYLE =
	'--normal-bg: #1A1A1A; --normal-text: #EAEAEA; --normal-border: #333333; border-left: 2px solid {accent}; box-shadow: 0 0 14px {glow};';

function style(accent: string, glow: string): string {
	return BASE_STYLE.replace('{accent}', accent).replace('{glow}', glow);
}

const CYAN = style('#00E5FF', 'rgba(0, 229, 255, 0.2)');
const GOLD = style('#D4AF37', 'rgba(201, 168, 78, 0.25)');

export function notifyPoints(delta: number) {
	toast(`+${delta} pts`, {
		description: 'Bien joué, continue comme ça !',
		position: 'top-center',
		style: CYAN
	});
}

export function notifyLevelUp(levelName: string) {
	toast(`Niveau atteint : ${levelName}`, {
		description: 'Tu passes au niveau supérieur 🏆',
		position: 'top-center',
		duration: 6000,
		style: GOLD
	});
}

export function notifyDayComplete() {
	toast('Journée complétée 🔥', {
		description: "Checklist et séance validées pour aujourd'hui.",
		position: 'top-center',
		duration: 6000,
		style: GOLD
	});
}
