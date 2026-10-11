/**
 * Adaptateur Zod pour sveltekit-superforms.
 * Les types de la lib attendent ZodType<Record<string, unknown>, ...> alors que nos
 * schémas ont des formes spécifiques ; ce helper centralise l'assertion de type
 * tout en conservant le type de sortie du schéma (`form.data` reste typé).
 */
import {
	zod as _zod,
	zodClient as _zodClient,
	type ClientValidationAdapter,
	type ValidationAdapter,
	type ZodObjectType
} from 'sveltekit-superforms/adapters';
import type { ZodType, infer as ZodInfer, input as ZodInput } from 'zod';

type FormSchema = ZodType<Record<string, unknown>>;

/** Côté client : validateur pour superForm(..., { validators: zodClient(schema) }) */
export function zodClient<T extends FormSchema>(
	schema: T
): ClientValidationAdapter<ZodInfer<T>, ZodInput<T>> {
	return _zodClient(schema as unknown as ZodObjectType) as unknown as ClientValidationAdapter<
		ZodInfer<T>,
		ZodInput<T>
	>;
}

/** Côté serveur : adaptateur pour superValidate(zod(schema)) */
export function zod<T extends FormSchema>(schema: T): ValidationAdapter<ZodInfer<T>, ZodInput<T>> {
	return _zod(schema as unknown as ZodObjectType) as unknown as ValidationAdapter<
		ZodInfer<T>,
		ZodInput<T>
	>;
}
