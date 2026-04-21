import { describe, it, expect } from 'vitest';
import { normalize, parseTextTerms, recipeConflictsUser, type FilterRecipe } from './recipeFilterUtils';

function makeRecipe(name: string, ingredients: string[], allergens: string[] = []): FilterRecipe {
	return { name, allergens, ingredients: ingredients.map((n) => ({ name: n })) };
}

// ── normalize ─────────────────────────────────────────────────────────────────

describe('normalize', () => {
	it('met en minuscules', () => {
		expect(normalize('Champignon')).toBe('champignon');
	});
	it('supprime les accents é è ê à ç…', () => {
		expect(normalize('é è ê')).toBe('e e e');
		expect(normalize('à â')).toBe('a a');
		expect(normalize('ù û')).toBe('u u');
		expect(normalize('î ï')).toBe('i i');
		expect(normalize('ô')).toBe('o');
		expect(normalize('ç')).toBe('c');
	});
	it('combine minuscules + accents', () => {
		expect(normalize('Épinard')).toBe('epinard');
		expect(normalize('Allergène')).toBe('allergene');
	});
});

// ── parseTextTerms ────────────────────────────────────────────────────────────

describe('parseTextTerms', () => {
	it('retourne [] pour null / undefined / vide', () => {
		expect(parseTextTerms(null)).toEqual([]);
		expect(parseTextTerms(undefined)).toEqual([]);
		expect(parseTextTerms('')).toEqual([]);
	});
	it('découpe par virgule', () => {
		expect(parseTextTerms('champignon, poisson, chou')).toEqual(['champignon', 'poisson', 'chou']);
	});
	it('découpe par point-virgule', () => {
		expect(parseTextTerms('champignon;poisson')).toEqual(['champignon', 'poisson']);
	});
	it('découpe par saut de ligne', () => {
		expect(parseTextTerms('champignon\npoisson')).toEqual(['champignon', 'poisson']);
	});
	it('normalise les accents dans les termes', () => {
		expect(parseTextTerms('Épinard, Allergène')).toEqual(['epinard', 'allergene']);
	});
	it('ignore les termes vides après découpe', () => {
		expect(parseTextTerms('champignon,,, poisson')).toEqual(['champignon', 'poisson']);
	});
});

// ── recipeConflictsUser — codes allergènes enum ───────────────────────────────

describe('recipeConflictsUser — codes allergènes enum (exact match)', () => {
	it('exclut la recette entière si code allergen correspond', () => {
		const r = makeRecipe('Quiche lorraine', ['crème', 'lardons'], ['gluten', 'lactose']);
		expect(recipeConflictsUser(r, ['gluten'], [])).toBe(true);
	});
	it('ne filtre pas si aucun code ne correspond', () => {
		const r = makeRecipe('Riz sauté', ['riz', 'légumes'], ['soja']);
		expect(recipeConflictsUser(r, ['gluten'], [])).toBe(false);
	});
	it('ne filtre pas si allergens utilisateur est vide', () => {
		const r = makeRecipe('Pâtes bolognaise', ['pâtes'], ['gluten']);
		expect(recipeConflictsUser(r, [], [])).toBe(false);
	});
});

// ── recipeConflictsUser — termes libres ───────────────────────────────────────

describe('recipeConflictsUser — termes libres dans les ingrédients', () => {
	it('exclut si terme libre correspond à un ingrédient exact', () => {
		const r = makeRecipe('Omelette aux champignons', ['oeufs', 'champignons', 'sel']);
		expect(recipeConflictsUser(r, [], parseTextTerms('champignons'))).toBe(true);
	});
	it('exclut si le terme est contenu dans le nom ingrédient (includes)', () => {
		const r = makeRecipe('Poêlée de légumes', ['champignon de Paris', 'courgette']);
		expect(recipeConflictsUser(r, [], parseTextTerms('champignon'))).toBe(true);
	});
	it('exclut si terme correspond au nom de la recette', () => {
		const r = makeRecipe('Gratin de champignons', ['champignons', 'gruyère']);
		expect(recipeConflictsUser(r, [], parseTextTerms('champignon'))).toBe(true);
	});
	it('ne filtre pas si freeTerms est vide', () => {
		const r = makeRecipe('Salade verte', ['salade', 'tomate']);
		expect(recipeConflictsUser(r, [], [])).toBe(false);
	});
	it('ne filtre pas si aucun terme ne correspond', () => {
		const r = makeRecipe('Poulet rôti', ['poulet', 'ail', 'thym']);
		expect(recipeConflictsUser(r, [], parseTextTerms('champignon, poisson'))).toBe(false);
	});
});

// ── recipeConflictsUser — accents et casse ────────────────────────────────────

describe('recipeConflictsUser — insensibilité à la casse et aux accents', () => {
	it('exclut si ingrédient accentué, terme sans accent', () => {
		const r = makeRecipe('Salade niçoise', ['thon', 'épinards', 'tomates']);
		expect(recipeConflictsUser(r, [], parseTextTerms('epinards'))).toBe(true);
	});
	it('exclut si terme accentué, ingrédient sans accent', () => {
		const r = makeRecipe('Tarte aux epinards', ['epinards', 'pate brisee']);
		expect(recipeConflictsUser(r, [], parseTextTerms('épinards'))).toBe(true);
	});
	it('exclut si la casse diffère', () => {
		const r = makeRecipe('Bowl énergisant', ['Champignon', 'quinoa']);
		expect(recipeConflictsUser(r, [], parseTextTerms('champignon'))).toBe(true);
	});
	it('exclut si nom de recette accentué, terme non', () => {
		const r = makeRecipe('Gratin dÉpinards', ['gruyère', 'béchamel']);
		expect(recipeConflictsUser(r, [], parseTextTerms('epinards'))).toBe(true);
	});
});

// ── recipeConflictsUser — combinaison enum + termes libres ────────────────────

describe('recipeConflictsUser — combinaison allergens enum + termes libres', () => {
	it('exclut si code allergen correspond, freeTerms non', () => {
		const r = makeRecipe('Pain de mie', ['farine', 'eau', 'sel'], ['gluten']);
		expect(recipeConflictsUser(r, ['gluten'], parseTextTerms('champignon'))).toBe(true);
	});
	it('exclut si freeTerms correspond, allergens enum non', () => {
		const r = makeRecipe('Risotto aux champignons', ['riz', 'champignons'], ['lactose']);
		expect(recipeConflictsUser(r, ['gluten'], parseTextTerms('champignon'))).toBe(true);
	});
	it("n'exclut pas si ni allergens ni freeTerms ne correspondent", () => {
		const r = makeRecipe('Poulet vapeur', ['poulet', 'courgette'], ['soja']);
		expect(recipeConflictsUser(r, ['gluten'], parseTextTerms('champignon'))).toBe(false);
	});
});
