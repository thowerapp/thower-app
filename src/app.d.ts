// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	interface ServiceWorkerGlobalScope {
		__WB_MANIFEST?: Array<{ url: string; revision?: string }>;
	}
	namespace App {
		// interface Error {}
		interface Locals {
			session: import('$lib/lucia/session').Session | null;
			user: import('$lib/lucia/user').UserForClient | null;
			role: string | null;
			isMfaEnabled: boolean;
			registered2FA: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
