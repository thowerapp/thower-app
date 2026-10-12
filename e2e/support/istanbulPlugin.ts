import path from 'node:path';
import { createInstrumenter } from 'istanbul-lib-instrument';
import type { Plugin } from 'vite';

/** Instrumente `src/**\/*.ts` côté serveur (SSR) comme côté client, pour mesurer la couverture des tests e2e. */
export function istanbulPlugin(): Plugin {
	const srcDir = path.join(process.cwd(), 'src') + path.sep;
	const instrumenter = createInstrumenter({
		esModules: true,
		produceSourceMap: true,
		autoWrap: true,
		compact: false,
		coverageGlobalScope: 'globalThis',
		coverageGlobalScopeFunc: false
	});
	return {
		name: 'thower-istanbul',
		enforce: 'post',
		apply: 'serve',
		transform(code, id) {
			const file = id.split('?')[0];
			if (!file.startsWith(srcDir) || !file.endsWith('.ts') || file.endsWith('.spec.ts')) return;
			if (file.includes(`${path.sep}testing${path.sep}`) || file.endsWith('.d.ts')) return;
			const map = this.getCombinedSourcemap();
			const out = instrumenter.instrumentSync(code, file, map as never);
			return { code: out, map: instrumenter.lastSourceMap() as never };
		}
	};
}
