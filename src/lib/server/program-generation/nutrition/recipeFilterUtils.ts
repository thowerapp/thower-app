import { normalizeAllergens } from '$lib/schema/recipe/allergens';

/** Normalise une chaîne : minuscules + suppression des diacritiques. */
export function normalize(str: string): string {
	return str
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

/** Parse un champ texte libre (virgules, points-virgules, sauts de ligne) en termes normalisés non vides. */
export function parseTextTerms(text: string | null | undefined): string[] {
	if (!text) return [];
	return text
		.split(/[,;\n]+/)
		.map((t) => normalize(t.trim()))
		.filter((t) => t.length > 0);
}

export type FilterRecipe = {
	name: string;
	allergens: string[];
	ingredients: { name: string }[];
};

/**
 * Retourne true si la recette entière doit être exclue :
 * - Correspondance exacte sur les codes allergènes enum
 * - OU l'un des termes libres (otherAllergens, disgustingFoods) est contenu
 *   dans le nom de la recette ou le nom d'un ingrédient (insensible à la casse et aux accents).
 */
export function recipeConflictsUser(
	recipe: FilterRecipe,
	userAllergens: string[],
	freeTerms: string[]
): boolean {
	// Codes comparés sous leur forme canonique : le catalogue d'origine est codé en anglais (eggs, milk…).
	const avoid = new Set(normalizeAllergens(userAllergens));
	if (normalizeAllergens(recipe.allergens).some((a) => avoid.has(a))) return true;

	if (freeTerms.length === 0) return false;
	const recipeName = normalize(recipe.name);
	const ingredientNames = recipe.ingredients.map((i) => normalize(i.name));
	return freeTerms.some(
		(term) =>
			recipeName.includes(term) ||
			ingredientNames.some((ing) => ing.includes(term))
	);
}

export type RecipeFilterProfile = {
	allergens?: string[] | null;
	otherAllergens?: string | null;
	disgustingFoods?: string | null;
};

/** Recettes sans conflit avec les allergènes déclarés, les allergènes libres et les aliments détestés du profil. */
export function filterRecipesForUser<R extends FilterRecipe>(
	recipes: R[],
	profile: RecipeFilterProfile | null | undefined
): R[] {
	const userAllergens = profile?.allergens ?? [];
	const freeTerms = [...parseTextTerms(profile?.otherAllergens), ...parseTextTerms(profile?.disgustingFoods)];
	return recipes.filter((r) => !recipeConflictsUser(r, userAllergens, freeTerms));
}
