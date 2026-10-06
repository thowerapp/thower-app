/** Remplace `$env/dynamic/private` (SvelteKit) pour les scripts tsx. */
import 'dotenv/config';

export const env = process.env as Record<string, string | undefined>;
