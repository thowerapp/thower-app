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
	<Table
		name={`Recettes DB (${data.recipes?.length ?? 0})`}
		columns={recipeColumns}
		data={data.recipes ?? []}
		actions={recipeActions}
		addLink="/admin/recettes/create"
	/>
</div>
