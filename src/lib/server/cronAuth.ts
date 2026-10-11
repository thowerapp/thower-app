import { timingSafeEqual } from 'node:crypto';

/**
 * Vercel Cron envoie `Authorization: Bearer ${CRON_SECRET}` quand la variable est définie.
 * Sans secret configuré, l'appel n'est accepté que si `allowWithoutSecret` (développement local).
 */
export function isAuthorizedCron(
	authorization: string | null,
	secret: string | undefined,
	allowWithoutSecret: boolean
): boolean {
	if (!secret) return allowWithoutSecret;
	if (!authorization?.startsWith('Bearer ')) return false;

	const given = Buffer.from(authorization.slice('Bearer '.length));
	const expected = Buffer.from(secret);
	return given.length === expected.length && timingSafeEqual(given, expected);
}
