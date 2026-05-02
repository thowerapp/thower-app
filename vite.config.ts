/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
export default defineConfig({
	define: {
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production' ? '"production"' : '"development"'
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.ts',
			manifest: false,
			injectManifest: {},
			injectRegister: false,
			registerType: 'prompt',
			devOptions: { enabled: true }
		})
	],

	optimizeDeps: {
		exclude: ['@node-rs/argon2', '@node-rs/bcrypt'],
		/** Pré-bundle pour CJS (url-parse sans export default si servi brut). */
		include: ['tus-js-client']
	},

	/** Évite un client Prisma « figé » dans le bundle SSR après `prisma generate`. */
	ssr: {
		external: ['@prisma/client']
	},

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},

	server: {
		port: 2000,
		watch: {
			usePolling: true,
			interval: 1000
		}
	},

	clearScreen: false
});
