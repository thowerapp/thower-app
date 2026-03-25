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
