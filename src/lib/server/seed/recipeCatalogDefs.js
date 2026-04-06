/**
 * Catalogue seed : 31 recettes (BREAKFAST + MEAL) alignées schéma Recipe / RecipeIngredient.
 * Macros = valeurs pour la portion referenceYieldG (liste de courses & scaling génération).
 */
export const RECIPE_CATALOG_DEFS = [
	// —— Petit-déjeuner (10) ——
	{
		name: 'Porridge avoine myrtilles graines de lin',
		category: 'BREAKFAST',
		totalTimeMin: 15,
		referenceYieldG: 320,
		nutritionKcal: 385,
		nutritionProteinG: 14,
		nutritionCarbsG: 58,
		nutritionFatG: 11,
		nutritionFiberG: 9,
		allergens: [],
		instructions:
			'Cuire les flocons d’avoine dans l’eau ou lait végétal. Ajouter myrtilles et lin moulus.',
		ingredients: [
			{ name: 'Flocons d’avoine', quantityG: 60, unit: 'g', category: 'Féculents' },
			{ name: 'Myrtilles', quantityG: 80, unit: 'g', category: 'Fruits' },
			{ name: 'Lait demi-écrémé', quantityG: 180, unit: 'ml', category: 'Produits frais' }
		]
	},
	{
		name: 'Omelette aux fines herbes et tomates cerises',
		category: 'BREAKFAST',
		totalTimeMin: 12,
		referenceYieldG: 260,
		nutritionKcal: 298,
		nutritionProteinG: 22,
		nutritionCarbsG: 6,
		nutritionFatG: 20,
		nutritionFiberG: 2,
		allergens: ['oeufs'],
		instructions: 'Battre les œufs, herbes, sel/poivre. Cuire à la poêle, garnir de tomates.',
		ingredients: [
			{ name: 'Œufs', quantityG: 120, unit: 'g', category: 'Produits frais' },
			{ name: 'Tomates cerises', quantityG: 80, unit: 'g', category: 'Légumes' },
			{ name: 'Beurre', quantityG: 8, unit: 'g', category: 'Matières grasses' }
		]
	},
	{
		name: 'Bol yaourt granola et fruits rouges',
		category: 'BREAKFAST',
		totalTimeMin: 5,
		referenceYieldG: 280,
		nutritionKcal: 412,
		nutritionProteinG: 16,
		nutritionCarbsG: 58,
		nutritionFatG: 12,
		nutritionFiberG: 5,
		allergens: ['gluten', 'lait'],
		instructions: 'Yaourt nature, granola, fruits rouges frais ou surgelés.',
		ingredients: [
			{ name: 'Yaourt grec', quantityG: 150, unit: 'g', category: 'Produits frais' },
			{ name: 'Granola', quantityG: 45, unit: 'g', category: 'Féculents' },
			{ name: 'Fruits rouges', quantityG: 85, unit: 'g', category: 'Fruits' }
		]
	},
	{
		name: 'Tartine complète avocat et œuf mollet',
		category: 'BREAKFAST',
		totalTimeMin: 15,
		referenceYieldG: 220,
		nutritionKcal: 352,
		nutritionProteinG: 16,
		nutritionCarbsG: 28,
		nutritionFatG: 20,
		nutritionFiberG: 6,
		allergens: ['gluten', 'oeufs'],
		instructions: 'Toaster le pain, écraser l’avocat, ajouter œuf mollet et citron.',
		ingredients: [
			{ name: 'Pain complet', quantityG: 70, unit: 'g', category: 'Féculents' },
			{ name: 'Avocat', quantityG: 80, unit: 'g', category: 'Légumes' },
			{ name: 'Œuf', quantityG: 55, unit: 'g', category: 'Produits frais' }
		]
	},
	{
		name: 'Smoothie bowl protéiné banane fruits rouges',
		category: 'BREAKFAST',
		totalTimeMin: 8,
		referenceYieldG: 380,
		nutritionKcal: 368,
		nutritionProteinG: 28,
		nutritionCarbsG: 48,
		nutritionFatG: 8,
		nutritionFiberG: 7,
		allergens: ['lait'],
		instructions: 'Mixer banane, lait, protéine en poudre. Toppings fruits et graines.',
		ingredients: [
			{ name: 'Banane', quantityG: 120, unit: 'g', category: 'Fruits' },
			{ name: 'Lait demi-écrémé', quantityG: 200, unit: 'ml', category: 'Produits frais' },
			{ name: 'Protéine lactée', quantityG: 30, unit: 'g', category: 'Conserves' }
		]
	},
	{
		name: 'Galettes de sarrasin fromage blanc saumon fumé',
		category: 'BREAKFAST',
		totalTimeMin: 20,
		referenceYieldG: 290,
		nutritionKcal: 398,
		nutritionProteinG: 32,
		nutritionCarbsG: 38,
		nutritionFatG: 12,
		nutritionFiberG: 4,
		allergens: ['poisson', 'lait'],
		instructions: 'Galettes sarrasin réchauffées, garniture fromage blanc et saumon.',
		ingredients: [
			{ name: 'Galette sarrasin', quantityG: 120, unit: 'g', category: 'Féculents' },
			{ name: 'Fromage blanc', quantityG: 100, unit: 'g', category: 'Produits frais' },
			{ name: 'Saumon fumé', quantityG: 50, unit: 'g', category: 'Poissons' }
		]
	},
	{
		name: 'Pancakes flocons d’avoine et sirop érable',
		category: 'BREAKFAST',
		totalTimeMin: 18,
		referenceYieldG: 240,
		nutritionKcal: 448,
		nutritionProteinG: 18,
		nutritionCarbsG: 62,
		nutritionFatG: 14,
		nutritionFiberG: 5,
		allergens: ['gluten', 'oeufs', 'lait'],
		instructions: 'Pâte : flocons mixés, œuf, lait, levure. Cuire en petites crêpes épaisses.',
		ingredients: [
			{ name: 'Flocons d’avoine', quantityG: 80, unit: 'g', category: 'Féculents' },
			{ name: 'Œuf', quantityG: 55, unit: 'g', category: 'Produits frais' },
			{ name: 'Lait', quantityG: 100, unit: 'ml', category: 'Produits frais' }
		]
	},
	{
		name: 'Shakshuka pain complet',
		category: 'BREAKFAST',
		totalTimeMin: 25,
		referenceYieldG: 420,
		nutritionKcal: 392,
		nutritionProteinG: 20,
		nutritionCarbsG: 42,
		nutritionFatG: 16,
		nutritionFiberG: 8,
		allergens: ['gluten', 'oeufs'],
		instructions: 'Réduire tomates poivrons, creuser et casser les œufs. Servir avec pain.',
		ingredients: [
			{ name: 'Tomates concassées', quantityG: 200, unit: 'g', category: 'Conserves' },
			{ name: 'Œufs', quantityG: 110, unit: 'g', category: 'Produits frais' },
			{ name: 'Pain complet', quantityG: 80, unit: 'g', category: 'Féculents' }
		]
	},
	{
		name: 'Wrap petit-déj dinde tomate',
		category: 'BREAKFAST',
		totalTimeMin: 10,
		referenceYieldG: 250,
		nutritionKcal: 418,
		nutritionProteinG: 28,
		nutritionCarbsG: 38,
		nutritionFatG: 16,
		nutritionFiberG: 4,
		allergens: ['gluten'],
		instructions: 'Tortilla, tranches de dinde, tomate, salade, sauce légère.',
		ingredients: [
			{ name: 'Tortilla blé', quantityG: 70, unit: 'g', category: 'Féculents' },
			{ name: 'Blanc de dinde', quantityG: 80, unit: 'g', category: 'Viandes' },
			{ name: 'Tomate', quantityG: 80, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Pudding chia coco mangue',
		category: 'BREAKFAST',
		totalTimeMin: 240,
		referenceYieldG: 260,
		nutritionKcal: 328,
		nutritionProteinG: 8,
		nutritionCarbsG: 38,
		nutritionFatG: 14,
		nutritionFiberG: 10,
		allergens: [],
		instructions: 'Mélanger chia, lait de coco, laisser au frais. Mangue en dés au service.',
		ingredients: [
			{ name: 'Graines de chia', quantityG: 35, unit: 'g', category: 'Fruits secs' },
			{ name: 'Lait de coco', quantityG: 150, unit: 'ml', category: 'Conserves' },
			{ name: 'Mangue', quantityG: 100, unit: 'g', category: 'Fruits' }
		]
	},
	// —— Plats (21) ——
	{
		name: 'Poulet riz coco curry',
		category: 'MEAL',
		totalTimeMin: 40,
		referenceYieldG: 555,
		nutritionKcal: 612,
		nutritionProteinG: 48,
		nutritionCarbsG: 58,
		nutritionFatG: 18,
		nutritionFiberG: 4,
		allergens: [],
		instructions: 'Faire revenir le poulet, lait de coco, curry. Servir avec riz basmati.',
		ingredients: [
			{ name: 'Blanc de poulet', quantityG: 300, unit: 'g', category: 'Viandes' },
			{ name: 'Riz basmati cuit', quantityG: 150, unit: 'g', category: 'Féculents' },
			{ name: 'Lait de coco', quantityG: 100, unit: 'ml', category: 'Conserves' }
		]
	},
	{
		name: 'Bœuf sauté brocoli riz complet',
		category: 'MEAL',
		totalTimeMin: 30,
		referenceYieldG: 520,
		nutritionKcal: 548,
		nutritionProteinG: 42,
		nutritionCarbsG: 52,
		nutritionFatG: 16,
		nutritionFiberG: 7,
		allergens: [],
		instructions: 'Wok : bœuf en lamelles, brocoli, ail gingembre, riz complet.',
		ingredients: [
			{ name: 'Bœuf maigre', quantityG: 220, unit: 'g', category: 'Viandes' },
			{ name: 'Brocoli', quantityG: 150, unit: 'g', category: 'Légumes' },
			{ name: 'Riz complet cuit', quantityG: 150, unit: 'g', category: 'Féculents' }
		]
	},
	{
		name: 'Dinde rôtie patate douce haricots verts',
		category: 'MEAL',
		totalTimeMin: 45,
		referenceYieldG: 480,
		nutritionKcal: 498,
		nutritionProteinG: 46,
		nutritionCarbsG: 48,
		nutritionFatG: 10,
		nutritionFiberG: 9,
		allergens: [],
		instructions: 'Cuire la dinde au four, patate douce en cubes, haricots vapeur.',
		ingredients: [
			{ name: 'Escalope de dinde', quantityG: 220, unit: 'g', category: 'Viandes' },
			{ name: 'Patate douce', quantityG: 180, unit: 'g', category: 'Légumes' },
			{ name: 'Haricots verts', quantityG: 120, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Cabillaud citron quinoa et poireaux',
		category: 'MEAL',
		totalTimeMin: 28,
		referenceYieldG: 430,
		nutritionKcal: 458,
		nutritionProteinG: 38,
		nutritionCarbsG: 44,
		nutritionFatG: 12,
		nutritionFiberG: 6,
		allergens: ['poisson'],
		instructions: 'Pocher le cabillaud, fondue de poireaux, quinoa citronné.',
		ingredients: [
			{ name: 'Cabillaud', quantityG: 200, unit: 'g', category: 'Poissons' },
			{ name: 'Quinoa cuit', quantityG: 150, unit: 'g', category: 'Féculents' },
			{ name: 'Poireau', quantityG: 100, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Pâtes complètes bolognaise maigre',
		category: 'MEAL',
		totalTimeMin: 35,
		referenceYieldG: 540,
		nutritionKcal: 582,
		nutritionProteinG: 38,
		nutritionCarbsG: 72,
		nutritionFatG: 14,
		nutritionFiberG: 10,
		allergens: ['gluten'],
		instructions: 'Sauce viande hachée 5%, tomates, pâtes complètes al dente.',
		ingredients: [
			{ name: 'Pâtes complètes', quantityG: 120, unit: 'g', category: 'Féculents' },
			{ name: 'Viande hachée 5%', quantityG: 200, unit: 'g', category: 'Viandes' },
			{ name: 'Coulis de tomate', quantityG: 200, unit: 'g', category: 'Conserves' }
		]
	},
	{
		name: 'Wok crevettes légumes riz basmati',
		category: 'MEAL',
		totalTimeMin: 22,
		referenceYieldG: 500,
		nutritionKcal: 528,
		nutritionProteinG: 32,
		nutritionCarbsG: 68,
		nutritionFatG: 12,
		nutritionFiberG: 5,
		allergens: ['crustaces', 'soja'],
		instructions: 'Sauter crevettes et légumes, sauce soja-gingembre, riz à part.',
		ingredients: [
			{ name: 'Crevettes', quantityG: 180, unit: 'g', category: 'Poissons' },
			{ name: 'Légumes wok', quantityG: 200, unit: 'g', category: 'Légumes' },
			{ name: 'Riz basmati cuit', quantityG: 150, unit: 'g', category: 'Féculents' }
		]
	},
	{
		name: 'Curry pois chiches tomate riz',
		category: 'MEAL',
		totalTimeMin: 35,
		referenceYieldG: 520,
		nutritionKcal: 512,
		nutritionProteinG: 18,
		nutritionCarbsG: 82,
		nutritionFatG: 12,
		nutritionFiberG: 14,
		allergens: [],
		instructions: 'Mijoter pois chiches, tomates, épices curry, servir avec riz.',
		ingredients: [
			{ name: 'Pois chiches égouttés', quantityG: 240, unit: 'g', category: 'Conserves' },
			{ name: 'Tomates concassées', quantityG: 200, unit: 'g', category: 'Conserves' },
			{ name: 'Riz basmati cuit', quantityG: 150, unit: 'g', category: 'Féculents' }
		]
	},
	{
		name: 'Steak haché 5% purée pomme de terre haricots',
		category: 'MEAL',
		totalTimeMin: 40,
		referenceYieldG: 500,
		nutritionKcal: 522,
		nutritionProteinG: 44,
		nutritionCarbsG: 48,
		nutritionFatG: 14,
		nutritionFiberG: 8,
		allergens: ['lait'],
		instructions: 'Steak grillé, purée au lait allégé, haricots beurrés léger.',
		ingredients: [
			{ name: 'Steak haché 5%', quantityG: 200, unit: 'g', category: 'Viandes' },
			{ name: 'Pomme de terre', quantityG: 220, unit: 'g', category: 'Légumes' },
			{ name: 'Haricots verts', quantityG: 120, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Lasagnes courgettes bœuf fromage',
		category: 'MEAL',
		totalTimeMin: 55,
		referenceYieldG: 380,
		nutritionKcal: 498,
		nutritionProteinG: 36,
		nutritionCarbsG: 32,
		nutritionFatG: 22,
		nutritionFiberG: 4,
		allergens: ['gluten', 'lait'],
		instructions: 'Feuilles lasagne, couches courgettes, viande tomate, béchamel légère.',
		ingredients: [
			{ name: 'Viande hachée', quantityG: 160, unit: 'g', category: 'Viandes' },
			{ name: 'Courgette', quantityG: 150, unit: 'g', category: 'Légumes' },
			{ name: 'Fromage râpé', quantityG: 40, unit: 'g', category: 'Fromages' }
		]
	},
	{
		name: 'Tajine poulet citrons confits semoule',
		category: 'MEAL',
		totalTimeMin: 50,
		referenceYieldG: 520,
		nutritionKcal: 588,
		nutritionProteinG: 42,
		nutritionCarbsG: 72,
		nutritionFatG: 12,
		nutritionFiberG: 5,
		allergens: ['gluten'],
		instructions: 'Mijoter poulet olives citrons, épices douces, semoule à part.',
		ingredients: [
			{ name: 'Poulet', quantityG: 220, unit: 'g', category: 'Viandes' },
			{ name: 'Semoule cuite', quantityG: 180, unit: 'g', category: 'Féculents' },
			{ name: 'Carottes', quantityG: 120, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Pizza fine poulet roquette',
		category: 'MEAL',
		totalTimeMin: 25,
		referenceYieldG: 280,
		nutritionKcal: 562,
		nutritionProteinG: 38,
		nutritionCarbsG: 52,
		nutritionFatG: 22,
		nutritionFiberG: 3,
		allergens: ['gluten', 'lait'],
		instructions: 'Pâte fine, tomate, mozzarella légère, poulet grillé, roquette.',
		ingredients: [
			{ name: 'Pâte à pizza', quantityG: 120, unit: 'g', category: 'Féculents' },
			{ name: 'Poulet grillé', quantityG: 100, unit: 'g', category: 'Viandes' },
			{ name: 'Mozzarella', quantityG: 60, unit: 'g', category: 'Fromages' }
		]
	},
	{
		name: 'Bowl thon riz complet avocat',
		category: 'MEAL',
		totalTimeMin: 15,
		referenceYieldG: 450,
		nutritionKcal: 548,
		nutritionProteinG: 36,
		nutritionCarbsG: 52,
		nutritionFatG: 20,
		nutritionFiberG: 8,
		allergens: ['poisson'],
		instructions: 'Riz, thon au naturel, avocat, concombre, sauce citron-yaourt.',
		ingredients: [
			{ name: 'Thon en boîte', quantityG: 160, unit: 'g', category: 'Conserves' },
			{ name: 'Riz complet cuit', quantityG: 180, unit: 'g', category: 'Féculents' },
			{ name: 'Avocat', quantityG: 90, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Chili poulet haricots rouges',
		category: 'MEAL',
		totalTimeMin: 40,
		referenceYieldG: 480,
		nutritionKcal: 512,
		nutritionProteinG: 40,
		nutritionCarbsG: 58,
		nutritionFatG: 10,
		nutritionFiberG: 14,
		allergens: [],
		instructions: 'Mijoter poulet effiloché, haricots, tomates, épices chili.',
		ingredients: [
			{ name: 'Poulet effiloché', quantityG: 200, unit: 'g', category: 'Viandes' },
			{ name: 'Haricots rouges', quantityG: 200, unit: 'g', category: 'Conserves' },
			{ name: 'Tomates', quantityG: 150, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Pad thaï poulet cacahuètes',
		category: 'MEAL',
		totalTimeMin: 30,
		referenceYieldG: 480,
		nutritionKcal: 592,
		nutritionProteinG: 34,
		nutritionCarbsG: 68,
		nutritionFatG: 18,
		nutritionFiberG: 5,
		allergens: ['arachides', 'oeufs', 'soja'],
		instructions: 'Nouilles de riz sautées, poulet, œuf, sauce tamari-cacahuète.',
		ingredients: [
			{ name: 'Nouilles de riz', quantityG: 120, unit: 'g', category: 'Féculents' },
			{ name: 'Poulet', quantityG: 180, unit: 'g', category: 'Viandes' },
			{ name: 'Cacahuètes', quantityG: 25, unit: 'g', category: 'Fruits secs' }
		]
	},
	{
		name: 'Moules marinières et pain de campagne',
		category: 'MEAL',
		totalTimeMin: 25,
		referenceYieldG: 400,
		nutritionKcal: 468,
		nutritionProteinG: 32,
		nutritionCarbsG: 48,
		nutritionFatG: 12,
		nutritionFiberG: 3,
		allergens: ['mollusques', 'gluten'],
		instructions: 'Cuire moules vin blanc ail persil, pain trempette.',
		ingredients: [
			{ name: 'Moules', quantityG: 500, unit: 'g', category: 'Poissons' },
			{ name: 'Pain campagne', quantityG: 80, unit: 'g', category: 'Féculents' },
			{ name: 'Vin blanc', quantityG: 100, unit: 'ml', category: 'Condiments' }
		]
	},
	{
		name: 'Risotto aux champignons parmesan',
		category: 'MEAL',
		totalTimeMin: 35,
		referenceYieldG: 420,
		nutritionKcal: 528,
		nutritionProteinG: 16,
		nutritionCarbsG: 68,
		nutritionFatG: 18,
		nutritionFiberG: 4,
		allergens: ['lait'],
		instructions: 'Risotto riz arborio, champignons, bouillon, parmesan en fin.',
		ingredients: [
			{ name: 'Riz arborio', quantityG: 100, unit: 'g', category: 'Féculents' },
			{ name: 'Champignons', quantityG: 200, unit: 'g', category: 'Légumes' },
			{ name: 'Parmesan', quantityG: 30, unit: 'g', category: 'Fromages' }
		]
	},
	{
		name: 'Burger maison steak pain complet',
		category: 'MEAL',
		totalTimeMin: 25,
		referenceYieldG: 320,
		nutritionKcal: 628,
		nutritionProteinG: 38,
		nutritionCarbsG: 48,
		nutritionFatG: 28,
		nutritionFiberG: 5,
		allergens: ['gluten', 'lait'],
		instructions: 'Steak, pain complet, salade tomate, fromage léger, sans friture.',
		ingredients: [
			{ name: 'Pain burger complet', quantityG: 90, unit: 'g', category: 'Féculents' },
			{ name: 'Steak haché 12%', quantityG: 150, unit: 'g', category: 'Viandes' },
			{ name: 'Fromage burger', quantityG: 30, unit: 'g', category: 'Fromages' }
		]
	},
	{
		name: 'Gratin colin pommes de terre',
		category: 'MEAL',
		totalTimeMin: 40,
		referenceYieldG: 450,
		nutritionKcal: 488,
		nutritionProteinG: 34,
		nutritionCarbsG: 42,
		nutritionFatG: 18,
		nutritionFiberG: 5,
		allergens: ['poisson', 'lait'],
		instructions: 'Colin, pommes de terre, crème allégée, gratiné au four.',
		ingredients: [
			{ name: 'Colin', quantityG: 200, unit: 'g', category: 'Poissons' },
			{ name: 'Pomme de terre', quantityG: 220, unit: 'g', category: 'Légumes' },
			{ name: 'Crème fluide', quantityG: 80, unit: 'ml', category: 'Produits frais' }
		]
	},
	{
		name: 'Soupe lentilles corail carottes cumin',
		category: 'MEAL',
		totalTimeMin: 35,
		referenceYieldG: 400,
		nutritionKcal: 358,
		nutritionProteinG: 18,
		nutritionCarbsG: 58,
		nutritionFatG: 6,
		nutritionFiberG: 12,
		allergens: [],
		instructions: 'Mijoter lentilles corail, carottes, cumin, bouillon légumes.',
		ingredients: [
			{ name: 'Lentilles corail sèches', quantityG: 120, unit: 'g', category: 'Féculents' },
			{ name: 'Carottes', quantityG: 200, unit: 'g', category: 'Légumes' },
			{ name: 'Bouillon', quantityG: 500, unit: 'ml', category: 'Conserves' }
		]
	},
	{
		name: 'Salade niçoise thon œuf',
		category: 'MEAL',
		totalTimeMin: 20,
		referenceYieldG: 380,
		nutritionKcal: 448,
		nutritionProteinG: 32,
		nutritionCarbsG: 28,
		nutritionFatG: 24,
		nutritionFiberG: 6,
		allergens: ['poisson', 'oeufs'],
		instructions: 'Thon, œufs durs, haricots verts, tomates, olives, vinaigrette.',
		ingredients: [
			{ name: 'Thon', quantityG: 120, unit: 'g', category: 'Conserves' },
			{ name: 'Œufs durs', quantityG: 100, unit: 'g', category: 'Produits frais' },
			{ name: 'Haricots verts', quantityG: 100, unit: 'g', category: 'Légumes' }
		]
	},
	{
		name: 'Falafels houmous taboulé',
		category: 'MEAL',
		totalTimeMin: 35,
		referenceYieldG: 380,
		nutritionKcal: 518,
		nutritionProteinG: 16,
		nutritionCarbsG: 62,
		nutritionFatG: 20,
		nutritionFiberG: 10,
		allergens: ['gluten', 'sesame'],
		instructions: 'Falafels four, houmous sésame, taboulé boulgour persil.',
		ingredients: [
			{ name: 'Falafels', quantityG: 160, unit: 'g', category: 'Conserves' },
			{ name: 'Houmous', quantityG: 80, unit: 'g', category: 'Conserves' },
			{ name: 'Taboulé', quantityG: 140, unit: 'g', category: 'Féculents' }
		]
	}
];
