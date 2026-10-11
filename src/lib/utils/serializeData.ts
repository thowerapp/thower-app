/** Type obtenu après `serializeData` : dates et octets en chaînes, propriétés `undefined` en `null`. */
export type Serialized<T> = T extends Date
	? string
	: T extends Uint8Array
		? string
		: T extends readonly (infer U)[]
			? Serialized<U>[]
			: T extends object
				? { [K in keyof T]: Serialized<Exclude<T[K], undefined>> | (undefined extends T[K] ? null : never) }
				: T;

export const serializeData = <T>(obj: T): Serialized<T> => serializeValue(obj);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serializeValue = (obj: any): any => {
	if (!obj || typeof obj !== 'object') return obj;

	if (obj instanceof Date) {
		return obj.toISOString();
	}

	// Prisma Bytes → Buffer (Node) ; aussi Uint8Array
	if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
		return obj.toString('base64');
	}
	if (obj instanceof Uint8Array) {
		return Buffer.from(obj).toString('base64');
	}

	if (Array.isArray(obj)) {
		return obj.map(serializeValue);
	}

	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [
			key,
			serializeValue(value !== undefined ? value : null)
		])
	);
};
