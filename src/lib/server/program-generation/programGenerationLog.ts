/**
 * Logs génération programme nutrition.
 *
 * - `[program-gen]` : toujours actif (prod + dev) — jalons du pipeline à suivre dans Vercel / terminal.
 * - `[program-generation]` : détail (dev ou `PROGRAM_GENERATION_LOG=1` en prod).
 */

export type ProgramGenSource = 'measurement' | 'subscription' | 'webhook' | 'internal' | 'admin';

export type ProgramGenStep =
	| 'trigger'
	| 'dispatch'
	| 'schedule_start'
	| 'schedule_denied'
	| 'schedule_ok'
	| 'schedule_complete'
	| 'generate_start'
	| 'generate_abort'
	| 'generate_skip_complete'
	| 'generate_skip_no_nutrition'
	| 'generate_done'
	| 'generate_error'
	| 'admin_future_regen_start'
	| 'admin_future_regen_complete';

export function programGenLogEnabled(): boolean {
	return (
		process.env.PROGRAM_GENERATION_LOG === '1' || process.env.NODE_ENV !== 'production'
	);
}

/** Jalon visible en production — une ligne JSON par événement. */
export function programGenTrace(
	step: ProgramGenStep,
	payload: Record<string, unknown> & { userId?: string; source?: ProgramGenSource }
): void {
	const line = {
		ts: new Date().toISOString(),
		step,
		...payload
	};
	console.log('[program-gen]', JSON.stringify(line));
}

export function programGenLog(...args: unknown[]): void {
	if (!programGenLogEnabled()) return;
	console.log('[program-generation]', ...args);
}

export function programGenWarn(...args: unknown[]): void {
	if (!programGenLogEnabled()) return;
	console.warn('[program-generation]', ...args);
}

/** Erreur pipeline — toujours loggée. */
export function programGenError(
	step: ProgramGenStep,
	payload: Record<string, unknown> & { userId?: string; source?: ProgramGenSource }
): void {
	const line = {
		ts: new Date().toISOString(),
		step,
		level: 'error',
		...payload
	};
	console.error('[program-gen]', JSON.stringify(line));
}
