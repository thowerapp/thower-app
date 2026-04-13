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
			manifest: {
				name: 'Thower',
				short_name: 'Thower',
				description: 'Accompagnement Thower - coach et programme personnalisé',
				icons: [
					{ src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
					{ src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				],
				start_url: '/user/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#000000'
			},
			injectManifest: {},
			injectRegister: false,
			registerType: 'prompt',
			devOptions: { enabled: true }
		})
	],

	optimizeDeps: {
		exclude: ['@node-rs/argon2', '@node-rs/bcrypt']
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
