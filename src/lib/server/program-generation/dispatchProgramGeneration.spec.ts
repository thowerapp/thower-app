import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ dev: false, waitUntil: vi.fn(), importFails: false }));
vi.mock('$app/environment', () => ({
	get dev() {
		return state.dev;
	}
}));
vi.mock('@vercel/functions', () => {
	if (state.importFails) throw new Error('indisponible');
	return { waitUntil: state.waitUntil };
});
vi.mock('./programGenerationLog', () => ({ programGenTrace: vi.fn() }));

import { dispatchProgramGeneration } from './dispatchProgramGeneration';

beforeEach(() => {
	state.dev = false;
	state.waitUntil.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('dispatchProgramGeneration', () => {
	it('en développement, lance la génération détachée sans attendre et journalise son échec', async () => {
		state.dev = true;
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const run = vi.fn().mockRejectedValue(new Error('échec'));
		expect(await dispatchProgramGeneration(null, run)).toBe('detached');
		await Promise.resolve();
		await Promise.resolve();
		expect(run).toHaveBeenCalledOnce();
		expect(error).toHaveBeenCalledWith('[program-gen] detached generation failed', expect.any(Error));
	});

	it('en production, confie la génération à waitUntil de Vercel', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const run = vi.fn().mockRejectedValue(new Error('échec'));
		expect(await dispatchProgramGeneration(null, run)).toBe('waitUntil');
		const handed = state.waitUntil.mock.calls[0][0] as Promise<void>;
		await handed;
		expect(error).toHaveBeenCalledWith('[program-gen] waitUntil generation failed', expect.any(Error));
	});
});
