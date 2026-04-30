<script lang="ts">
	import Table from '$components/Table.svelte';
	import { deleteRecipeSchema } from '$lib/schema/recipe/recipeSchema';
	import { zodClient } from '$lib/superforms-zod';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash from 'lucide-svelte/icons/trash';
	import { formatDate } from '$lib/utils/formatDate';
	import {
		RECIPE_KITCHEN_EQUIPMENT_LABELS,
		type RecipeKitchenEquipmentValue
	} from '$lib/schema/recipe/recipeKitchenEquipment';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(deleteRecipeSchema)
	};

	const deleteRecipe = $derived.by(() => superForm(data?.IdeleteRecipeSchema ?? {}, formOptions));

	const {
		enhance: deleteRecipeEnhance,
		message: deleteRecipeMessage
	} = $derived(deleteRecipe);

	const categoryLabels: Record<string, string> = {
		BREAKFAST: 'Petit déjeuner',
		MEAL: 'Repas',
		DESSERT: 'Dessert'
	};

	type RecipeTab = 'all' | 'catalog' | 'custom';
	let activeTab = $state<RecipeTab>('catalog');

	const tableData = $derived.by(() => {
		switch (activeTab) {
			case 'custom':
				return data.customRecipes ?? [];
			case 'all':
				return data.recipes ?? [];
			default:
				return data.catalogRecipes ?? [];
		}
	});

	const tableName = $derived.by(() => {
		switch (activeTab) {
			case 'custom':
				return 'Recettes custom';
			case 'all':
				return 'Toutes les recettes';
			default:
				return 'Recettes catalogue';
		}
	});

	const recipeColumns = $state([
		{ key: 'name', label: 'Nom' },
		{
			key: 'category',
			label: 'Catégorie',
			formatter: (v: unknown) => categoryLabels[String(v)] ?? String(v)
		},
		{
			key: 'totalTimeMin',
			label: 'Temps (min)',
			formatter: (v: unknown) => (v != null ? `${v} min` : '—')
		},
		{
			key: 'requiredKitchenEquipment',
			label: 'Matériel',
			formatter: (v: unknown) => {
				const arr = v as RecipeKitchenEquipmentValue[] | undefined;
				if (!arr?.length) return '—';
				return arr.map((x) => RECIPE_KITCHEN_EQUIPMENT_LABELS[x] ?? x).join(', ');
			}
		},
		{
			key: 'nutritionKcal',
			label: 'Kcal',
			formatter: (v: unknown) => (v != null ? String(v) : '—')
		},
		{
			key: 'servings',
			label: 'Portions'
		},
		{
			key: 'active',
			label: 'Active',
			formatter: (v: unknown) => (v ? 'Oui' : 'Non')
		},
		{
			key: 'createdAt',
			label: 'Créée le',
			formatter: (v: unknown) => (v != null && v !== '' ? formatDate(String(v)) : '')
		}
	]);

	const recipeActions = $derived.by(() => [
		{
			type: 'link',
			name: 'Modifier',
			url: (item: { id: string }) => `/admin/recettes/${item.id}`,
			icon: Pencil
		},
		{
			type: 'form',
			name: 'delete',
			url: '?/deleteRecipe',
			enhanceAction: deleteRecipeEnhance,
			icon: Trash
		}
	]);

	$effect(() => {
		if ($deleteRecipeMessage) {
			toast.success($deleteRecipeMessage as string);
		}
	});
</script>

<div class="ccc w-full">
	<div class="recipe-tabs">
		<button
			type="button"
			class="recipe-tab"
			class:active={activeTab === 'catalog'}
			onclick={() => (activeTab = 'catalog')}
		>
			Catalogue ({data.catalogRecipes?.length ?? 0})
		</button>
		<button
			type="button"
			class="recipe-tab"
			class:active={activeTab === 'custom'}
			onclick={() => (activeTab = 'custom')}
		>
			Custom ({data.customRecipes?.length ?? 0})
		</button>
		<button
			type="button"
			class="recipe-tab"
			class:active={activeTab === 'all'}
			onclick={() => (activeTab = 'all')}
		>
			Toutes ({data.recipes?.length ?? 0})
		</button>
	</div>
	<Table
		name={tableName}
		columns={recipeColumns}
		data={tableData}
		actions={recipeActions}
		addLink="/admin/recettes/create"
	/>
</div>

<style>
	.recipe-tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}

	.recipe-tab {
		border: 1px solid var(--br2);
		background: transparent;
		color: var(--txd);
		padding: 6px 10px;
		font-size: 0.625rem;
		cursor: pointer;
		font-family: var(--fb);
	}

	.recipe-tab.active {
		border-color: var(--cy);
		color: var(--cy);
	}
</style>
