import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shoppingListAggregateKey } from '$lib/nutrition/normalizeIngredientName';

const tx = {
	shoppingList: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
	shoppingItem: { createMany: vi.fn() }
};
const prismaMock = {
	userProfile: { findUnique: vi.fn() },
	nutritionDay: { findMany: vi.fn() },
	shoppingList: { findFirst: vi.fn() },
	shoppingItem: { findMany: vi.fn() },
	$transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx))
};
vi.mock('$lib/server', () => ({ prisma: prismaMock }));

const { generateShoppingListFromPlanning } = await import('./generateFromPlanning');

const planning = [
	{
		dayIndex: 1,
		meals: [
			{
				quantityG: 100,
				complements: [],
				ingredientGrams: [],
				recipe: {
					name: 'Curry',
					referenceYieldG: 100,
					ingredients: [
						{ name: 'Poulet', quantityG: 120, category: 'Viandes', unit: 'g', order: 0 },
						{ name: 'Riz', quantityG: 80, category: 'Féculents', unit: 'g', order: 1 }
					]
				}
			}
		]
	}
];

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
	prismaMock.userProfile.findUnique.mockResolvedValue({ shoppingListSortOrder: 'category' });
	prismaMock.nutritionDay.findMany.mockResolvedValue(planning);
	tx.shoppingList.create.mockResolvedValue({
		id: 'list1',
		startDayIndex: 1,
		endDayIndex: 7,
		generatedAt: new Date()
	});
	prismaMock.shoppingItem.findMany.mockResolvedValue([]);
});

describe('generateShoppingListFromPlanning', () => {
	it('remplace la liste dans une seule transaction (suppression, cr\u00e9ation, articles)', async () => {
		tx.shoppingList.findMany.mockResolvedValue([]);
		const order: string[] = [];
		tx.shoppingList.deleteMany.mockImplementation(async () => order.push('delete'));
		tx.shoppingList.create.mockImplementation(async () => {
			order.push('create');
			return { id: 'list1', startDayIndex: 1, endDayIndex: 7, generatedAt: new Date() };
		});
		tx.shoppingItem.createMany.mockImplementation(async () => order.push('items'));

		await generateShoppingListFromPlanning('u1', 1, 7, { includeReportedFromPrevious: false });

		expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
		expect(order).toEqual(['delete', 'create', 'items']);
	});

	it('conserve les articles d\u00e9j\u00e0 coch\u00e9s apr\u00e8s r\u00e9g\u00e9n\u00e9ration', async () => {
		tx.shoppingList.findMany.mockResolvedValue([
			{
				items: [
					{ ingredientName: 'poulet', unit: 'g', isChecked: true },
					{ ingredientName: 'Riz', unit: 'g', isChecked: false },
					{ ingredientName: 'Ancien ingr\u00e9dient', unit: 'g', isChecked: true }
				]
			}
		]);

		await generateShoppingListFromPlanning('u1', 1, 7, { includeReportedFromPrevious: false });

		const data = tx.shoppingItem.createMany.mock.calls[0][0].data as {
			ingredientName: string;
			unit: string | null;
			isChecked: boolean;
		}[];
		const checked = (name: string) =>
			data.find(
				(d) =>
					shoppingListAggregateKey(d.ingredientName, d.unit) === shoppingListAggregateKey(name, 'g')
			)?.isChecked;
		expect(checked('Poulet')).toBe(true);
		expect(checked('Riz')).toBe(false);
		expect(data.some((d) => d.ingredientName === 'Ancien ingr\u00e9dient')).toBe(false);
	});

	it('laisse l\u2019ancienne liste intacte si l\u2019\u00e9criture \u00e9choue', async () => {
		tx.shoppingList.findMany.mockResolvedValue([]);
		prismaMock.$transaction.mockRejectedValue(new Error('conflit'));
		await expect(
			generateShoppingListFromPlanning('u1', 1, 7, { includeReportedFromPrevious: false })
		).rejects.toThrow('conflit');
		expect(prismaMock.shoppingItem.findMany).not.toHaveBeenCalled();
	});
});
