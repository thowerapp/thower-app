/** Détail sous un ingrédient agrégé (recette + quantité pour ce plat). */
export type ShoppingItemSource = {
	recipeName: string;
	quantityG: number;
};

export type ShoppingListWithItems = {
	id: string;
	startDayIndex: number;
	endDayIndex: number;
	generatedAt: Date;
	items: Array<{
		id: string;
		ingredientName: string;
		category: string | null;
		totalQuantityG: number;
		unit: string | null;
		isChecked: boolean;
		isReported: boolean;
		sources: ShoppingItemSource[];
	}>;
};

export function parseShoppingItemSources(raw: unknown): ShoppingItemSource[] {
	if (!Array.isArray(raw)) return [];
	const out: ShoppingItemSource[] = [];
	for (const row of raw) {
		if (!row || typeof row !== 'object') continue;
		const r = row as Record<string, unknown>;
		const recipeName = typeof r.recipeName === 'string' ? r.recipeName.trim() : '';
		const quantityG = typeof r.quantityG === 'number' && Number.isFinite(r.quantityG) ? r.quantityG : NaN;
		if (!recipeName || Number.isNaN(quantityG) || quantityG <= 0) continue;
		out.push({ recipeName, quantityG });
	}
	return out;
}
