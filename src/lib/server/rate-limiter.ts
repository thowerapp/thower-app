import { RefillingTokenBucket } from '$lib/lucia/rate-limit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Extrait l'adresse IP du client à partir de la requête.
 * Prend en compte le header `x-forwarded-for` pour les déploiements derrière un proxy.
 *
 * @param event L'événement de la requête SvelteKit.
 * @returns L'adresse IP du client.
 */
export function getClientIP(event: RequestEvent): string {
	const xff = event.request.headers.get('x-forwarded-for');
	if (xff && typeof xff === 'string') {
		return xff.split(',')[0].trim();
	}
	try {
		return event.getClientAddress();
	} catch {
		// Peut échouer dans certains environnements (ex: pré-rendu)
		return '127.0.0.1';
	}
}

/** Limiteur de débit du formulaire de contact : 5 soumissions d'avance, puis une toutes les 12 s (5 par minute). */
export const contactFormLimiter = new RefillingTokenBucket<string>(
	5, // Capacité : 5 requêtes
	60 / 5 // Secondes par jeton rendu
);
