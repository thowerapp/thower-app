/**
 * Adaptateur Zod pour sveltekit-superforms.
 * Les types de la lib attendent ZodType<Record<string, unknown>, ...> alors que nos
 * schémas ont des formes spécifiques ; ce helper centralise l'assertion de type.
 */
import {
	zod as _zod,
	zodClient as _zodClient,
	type ZodObjectType
} from 'sveltekit-superforms/adapters';
import type { ZodType } from 'zod';

/** Côté client : validateur pour superForm(..., { validators: zodClient(schema) }) */
export function zodClient<T extends ZodType>(schema: T) {
	return _zodClient(schema as unknown as ZodObjectType);
}

/** Côté serveur : adaptateur pour superValidate(zod(schema)) */
export function zod<T extends ZodType>(schema: T) {
	return _zod(schema as unknown as ZodObjectType);
}
