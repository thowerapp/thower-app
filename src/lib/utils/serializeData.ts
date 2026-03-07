export const serializeData = (obj: any): any => {
	if (!obj || typeof obj !== 'object') return obj;

	if (obj instanceof Date) {
		return obj.toISOString();
	}

	if (obj instanceof Uint8Array) {
		return Buffer.from(obj).toString('base64'); // Base64 pour Uint8Array
	}

	if (Array.isArray(obj)) {
		return obj.map(serializeData);
	}

	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [
			key,
			serializeData(value !== undefined ? value : null)
		])
	);
};
