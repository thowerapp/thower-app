import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { programGenTrace } from './programGenerationLog';

export type ProgramGenDispatchMode = 'waitUntil' | 'awaited' | 'detached';

/**
 * Lance la génération sans qu’elle soit coupée par la fin de la fonction serverless Vercel.
 * - Prod Vercel : `waitUntil` (@vercel/functions)
 * - Dev : promesse détachée (le process reste vivant)
 * - Repli : `await` si waitUntil indisponible
 */
export async function dispatchProgramGeneration(
	event: RequestEvent | null,
	run: () => Promise<void>
): Promise<ProgramGenDispatchMode> {
	if (dev) {
		void run().catch((err) => {
			console.error('[program-gen] detached generation failed', err);
		});
		return 'detached';
	}

	try {
		const { waitUntil } = await import('@vercel/functions');
		waitUntil(
			run().catch((err) => {
				console.error('[program-gen] waitUntil generation failed', err);
			})
		);
		programGenTrace('dispatch', { mode: 'waitUntil', hasEvent: event != null });
		return 'waitUntil';
	} catch (importErr) {
		programGenTrace('dispatch', {
			mode: 'awaited',
			reason: 'waitUntil_unavailable',
			hint: String(importErr)
		});
		await run();
		return 'awaited';
	}
}
