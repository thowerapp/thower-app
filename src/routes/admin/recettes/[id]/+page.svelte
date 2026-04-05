<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from '$lib/superforms-zod';
	import * as Form from '$shadcn/form';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { Textarea } from '$shadcn/textarea';
	import { toast } from 'svelte-sonner';
	import { recipeSchema, type RecipeSchema } from '$lib/schema/recipe/recipeSchema';
	import type { RecipeIngredientSchema } from '$lib/schema/recipe/recipeIngredientSchema';
	import PlusCircle from 'lucide-svelte/icons/plus-circle';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ChefHat from 'lucide-svelte/icons/chef-hat';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(recipeSchema),
		onUpdated({ form }: { form: { message?: unknown } }) {
			if (form.message) toast.success(form.message as string);
		}
	};

	const recipeForm = $derived.by(() => superForm(data.form, formOptions));

	const { form, enhance, message: formMessage } = $derived(recipeForm);

	$effect(() => {
		if ($formMessage) toast.success($formMessage as string);
	});

	const initialIngredients = (data.recipe?.ingredients ?? []).map(
		(ing: RecipeIngredientSchema & { order?: number }, i: number) => ({
			name: ing.name,
			quantityG: ing.quantityG ?? null,
			unit: ing.unit ?? null,
			category: ing.category ?? null,
			note: ing.note ?? null,
			isOptional: ing.isOptional ?? false,
			allergens: ing.allergens ?? [],
			order: ing.order ?? i
		})
	);

	let ingredients = $state<RecipeIngredientSchema[]>(initialIngredients);

	$effect(() => {
		($form as unknown as RecipeSchema).ingredients = ingredients;
	});

	function addIngredient() {
		ingredients = [
			...ingredients,
			{
				name: '',
				quantityG: null,
				unit: null,
				category: null,
				note: null,
				isOptional: false,
				allergens: [],
				order: ingredients.length
			}
		];
	}

	function removeIngredient(index: number) {
		ingredients = ingredients.filter((_, i) => i !== index);
	}

	const categoryOptions = [
		{ value: 'BREAKFAST', label: 'Petit déjeuner' },
		{ value: 'MEAL', label: 'Repas' },
		{ value: 'DESSERT', label: 'Dessert' }
	];
</script>

<div class="mx-auto max-w-3xl px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<a href="/admin/recettes" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="size-5" />
		</a>
		<ChefHat class="size-6 text-primary" />
		<div>
			<h1 class="text-2xl font-bold">Modifier la recette</h1>
			<p class="text-sm text-muted-foreground">
				Recette catalogue — <span class="font-medium">{data.recipe?.name}</span>
			</p>
		</div>
	</div>

	<form method="POST" action="?/updateRecipe" use:enhance class="space-y-6">

		<Form.Field name="name" form={recipeForm}>
			<Form.Control>
				<Form.Label>Nom *</Form.Label>
				<Input name="name" bind:value={$form.name} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="description" form={recipeForm}>
			<Form.Control>
				<Form.Label>Description</Form.Label>
				<Textarea name="description" bind:value={$form.description as string} rows={3} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="grid grid-cols-3 gap-4">
			<Form.Field name="category" form={recipeForm}>
				<Form.Control>
					<Form.Label>Catégorie *</Form.Label>
					<select
						name="category"
						bind:value={$form.category}
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each categoryOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="totalTimeMin" form={recipeForm}>
				<Form.Control>
					<Form.Label>Temps total (min)</Form.Label>
					<Input name="totalTimeMin" type="number" min="0" bind:value={$form.totalTimeMin as number} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="servings" form={recipeForm}>
				<Form.Control>
					<Form.Label>Portions</Form.Label>
					<Input name="servings" type="number" min="1" bind:value={$form.servings} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>

		<fieldset class="rounded-lg border p-4">
			<legend class="px-2 text-sm font-semibold">Macros (par portion)</legend>
			<div class="grid grid-cols-5 gap-3 mt-2">
				<Form.Field name="nutritionKcal" form={recipeForm}>
					<Form.Control>
						<Form.Label>Kcal</Form.Label>
						<Input name="nutritionKcal" type="number" min="0" bind:value={$form.nutritionKcal as number} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="nutritionProteinG" form={recipeForm}>
					<Form.Control>
						<Form.Label>Protéines (g)</Form.Label>
						<Input name="nutritionProteinG" type="number" min="0" bind:value={$form.nutritionProteinG as number} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="nutritionCarbsG" form={recipeForm}>
					<Form.Control>
						<Form.Label>Glucides (g)</Form.Label>
						<Input name="nutritionCarbsG" type="number" min="0" bind:value={$form.nutritionCarbsG as number} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="nutritionFatG" form={recipeForm}>
					<Form.Control>
						<Form.Label>Lipides (g)</Form.Label>
						<Input name="nutritionFatG" type="number" min="0" bind:value={$form.nutritionFatG as number} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="nutritionFiberG" form={recipeForm}>
					<Form.Control>
						<Form.Label>Fibres (g)</Form.Label>
						<Input name="nutritionFiberG" type="number" min="0" bind:value={$form.nutritionFiberG as number} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</fieldset>

		<Form.Field name="referenceYieldG" form={recipeForm}>
			<Form.Control>
				<Form.Label>Grammage de référence (g)</Form.Label>
				<Input name="referenceYieldG" type="number" min="0" bind:value={$form.referenceYieldG as number} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field name="instructions" form={recipeForm}>
			<Form.Control>
				<Form.Label>Instructions</Form.Label>
				<Textarea name="instructions" bind:value={$form.instructions as string} rows={8} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<!-- Ingrédients -->
		<div>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold">Ingrédients</h2>
				<Button type="button" variant="outline" size="sm" onclick={addIngredient}>
					<PlusCircle class="mr-2 size-4" /> Ajouter
				</Button>
			</div>

			{#each ingredients as _ing, i (i)}
				<div class="mb-4 rounded-lg border p-4 relative">
					<button
						type="button"
						class="absolute right-3 top-3 text-destructive hover:opacity-80"
						onclick={() => removeIngredient(i)}
					>
						<Trash2 class="size-4" />
					</button>

					<div class="grid grid-cols-3 gap-3">
						<div class="flex flex-col gap-1">
							<label for={`ing-name-${i}`} class="text-sm font-medium">Nom *</label>
							<Input id={`ing-name-${i}`} name={`ingredients[${i}].name`} bind:value={ingredients[i].name} />
						</div>

						<div class="flex flex-col gap-1">
							<label for={`ing-qty-${i}`} class="text-sm font-medium">Qté (g)</label>
							<Input id={`ing-qty-${i}`} name={`ingredients[${i}].quantityG`} type="number" min="0" bind:value={ingredients[i].quantityG as number} />
						</div>

						<div class="flex flex-col gap-1">
							<label for={`ing-unit-${i}`} class="text-sm font-medium">Unité</label>
							<Input id={`ing-unit-${i}`} name={`ingredients[${i}].unit`} bind:value={ingredients[i].unit as string} />
						</div>

						<div class="flex flex-col gap-1">
							<label for={`ing-cat-${i}`} class="text-sm font-medium">Catégorie courses</label>
							<Input id={`ing-cat-${i}`} name={`ingredients[${i}].category`} bind:value={ingredients[i].category as string} />
						</div>

						<div class="flex flex-col gap-1 col-span-2">
							<label for={`ing-note-${i}`} class="text-sm font-medium">Note</label>
							<Input id={`ing-note-${i}`} name={`ingredients[${i}].note`} bind:value={ingredients[i].note as string} />
						</div>
					</div>

					<div class="mt-3 flex items-center gap-2">
						<input
							type="checkbox"
							id={`optional-${i}`}
							name={`ingredients[${i}].isOptional`}
							bind:checked={ingredients[i].isOptional}
							class="size-4"
						/>
						<label for={`optional-${i}`} class="text-sm">Ingrédient facultatif</label>
					</div>
				</div>
			{/each}
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="outline" href="/admin/recettes">Annuler</Button>
			<Button type="submit">Enregistrer les modifications</Button>
		</div>
	</form>
</div>
