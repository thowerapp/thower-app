export const serializeData = (obj: any): any => {
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
		return obj.map(serializeData);
	}

	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [
			key,
			serializeData(value !== undefined ? value : null)
		])
	);
};
