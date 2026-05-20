/**
 * Normalise un libellé pour comparaison : casse, accents, espaces.
 * On ne retire jamais les chiffres ni les % (ex. « chocolat 90 % » ≠ « chocolat 50 % »).
 */
export function normalizeIngredientName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/\s+/g, ' ');
}

/** Unité pour la clé d'agrégation (évite de fusionner g / ml / pièce). */
export function normalizeShoppingUnitForKey(unit: string | null | undefined): string {
	const u = (unit ?? '').trim().toLowerCase();
	if (!u || u === 'g' || u === 'gramme' || u === 'grammes') return 'g';
	return u;
}

/**
 * Clé de fusion liste de courses : libellé complet + unité.
 * Même ingrédient sur plusieurs plats/jours → une ligne.
 * Variantes distinctes (90 % vs 50 %, unités différentes) → lignes séparées.
 */
export function shoppingListAggregateKey(
	name: string,
	unit: string | null | undefined
): string {
	const n = normalizeIngredientName(name);
	if (!n) return '';
	return `${n}\u0001${normalizeShoppingUnitForKey(unit)}`;
}
