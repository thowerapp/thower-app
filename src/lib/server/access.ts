import { redirect } from '@sveltejs/kit';

/**
 * Guard d'accès partagé — à appeler dans les load() et les form actions
 * de toutes les routes protégées par abonnement.
 *
 * Règles :
 *   - Non connecté          → redirect /auth/login
 *   - ADMIN                 → accès toujours autorisé
 *   - subscriptionEndsAt null  → accès à vie
 *   - subscriptionEndsAt > now → abonnement actif
 *   - subscriptionEndsAt passé → redirect /acces-expire
 *
 * L'assertion de type garantit que locals.user est non-null
 * après l'appel (TypeScript narrowing).
 */
export function checkAccess(
	locals: App.Locals
): asserts locals is App.Locals & { user: NonNullable<App.Locals['user']> } {
	if (!locals.user) {
		throw redirect(302, '/auth/login');
	}

	if (locals.user.role === 'ADMIN') return;

	const { subscriptionEndsAt } = locals.user;
	const hasAccess = subscriptionEndsAt === null || subscriptionEndsAt > new Date();

	if (!hasAccess) {
		throw redirect(302, '/acces-expire');
	}
}

/**
 * Guard spécifique pour les routes /user/* qui requièrent aussi le profil complet.
 * Vérifie:
 *   1. Authentification + abonnement valide (via checkAccess)
 *   2. Profil physique complet (au moins une BodyMeasurement enregistrée)
 * 
 * Si paiement OK mais profil incomplet → redirection vers /auth/measurement pour compléter le formulaire
 */
export function checkUserAppAccess(
	locals: App.Locals,
	hasMeasurements: boolean
): asserts locals is App.Locals & { user: NonNullable<App.Locals['user']> } {
	checkAccess(locals);

	if (!hasMeasurements) {
		throw redirect(302, '/auth/measurement');
	}
}

/**
 * Guard pour vérifier que le bien-être a été complété.
 * Utilisé après paiement pour enforcer l'ordre onboarding:
 * Paiement → Photos (optionnel) → Bien-être (requis) → Measurements
 * 
 * Si bien-être pas complété → redirection vers /auth/well-being
 */
export function checkWellBeingCompleted(
	locals: App.Locals,
	profile: { stressLevel?: number | null } | null
): asserts locals is App.Locals & { user: NonNullable<App.Locals['user']> } {
	checkAccess(locals);

	if (!profile?.stressLevel) {
		throw redirect(302, '/auth/well-being');
	}
}
