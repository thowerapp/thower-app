/**
 * Logs détaillés de la génération de programme (serveur Node).
 * - Dev : actif par défaut (`NODE_ENV !== 'production'`).
 * - Prod : activer avec `PROGRAM_GENERATION_LOG=1` dans `.env`.
 */
export function programGenLogEnabled(): boolean {
	return (
		process.env.PROGRAM_GENERATION_LOG === '1' || process.env.NODE_ENV !== 'production'
	);
}

export function programGenLog(...args: unknown[]): void {
	if (!programGenLogEnabled()) return;
	console.log('[program-generation]', ...args);
}

export function programGenWarn(...args: unknown[]): void {
	if (!programGenLogEnabled()) return;
	console.warn('[program-generation]', ...args);
}
