<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import type { AdminUserOptions, UserSelected } from '../types';
	import { fmtDate } from '../types';

	let { userSelected, adminOptions }: { userSelected: UserSelected; adminOptions: AdminUserOptions } = $props();

	function toDateTimeLocal(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 16) : '';
	}

	function jsonValue(value: unknown): string {
		return value == null ? '' : JSON.stringify(value);
	}

	const mealNumberFields = [
		{ name: 'calcProteinG', label: 'Prot. calc.' },
		{ name: 'calcCarbsG', label: 'Gluc. calc.' },
		{ name: 'calcFatG', label: 'Lip. calc.' },
		{ name: 'calcCalories', label: 'Kcal calc.' },
		{ name: 'calcFiberG', label: 'Fibres calc.' },
		{ name: 'manualProteinG', label: 'Prot. manuel' },
		{ name: 'manualCarbsG', label: 'Gluc. manuel' },
		{ name: 'manualFatG', label: 'Lip. manuel' },
		{ name: 'manualCalories', label: 'Kcal manuel' },
		{ name: 'manualFiberG', label: 'Fibres manuel' }
	] as const;
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Jours nutrition</Card.Title>
			<Card.Description>Édition du jeûne intermittent et des repas existants.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.nutritionDays?.length}
				<div class="space-y-4">
					{#each userSelected.nutritionDays as n (n.id)}
						<Card.Root class="border">
							<Card.Header class="py-3">
								<Card.Title class="text-base">Jour {n.dayIndex}</Card.Title>
							</Card.Header>
							<Card.Content class="space-y-4">
								<form method="POST" action="?/updateNutritionDay" class="flex flex-wrap items-center gap-3">
									<input type="hidden" name="id" value={n.id} />
									<label class="flex items-center gap-2 text-sm">
										<input type="checkbox" name="intermittentFasting" checked={n.intermittentFasting ?? false} />
										<span>Jeûne intermittent</span>
									</label>
									<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer le jour</button>
								</form>

								{#if n.meals?.length}
									<div class="grid gap-3">
										{#each n.meals as meal (meal.id)}
											<form method="POST" action="?/updateMeal" class="grid gap-3 rounded-lg border p-3 md:grid-cols-6">
												<input type="hidden" name="id" value={meal.id} />
												<label class="space-y-1 text-sm">
													<span class="font-medium">Position</span>
													<select class="w-full rounded-md border px-3 py-2" name="position">
														<option value="BREAKFAST" selected={meal.position === 'BREAKFAST'}>Petit-déjeuner</option>
														<option value="LUNCH" selected={meal.position === 'LUNCH'}>Déjeuner</option>
														<option value="DINNER" selected={meal.position === 'DINNER'}>Dîner</option>
													</select>
												</label>
												<label class="space-y-1 text-sm md:col-span-2">
													<span class="font-medium">Recette</span>
													<select class="w-full rounded-md border px-3 py-2" name="recipeId">
														<option value="">Manuel / aucune</option>
														{#each adminOptions.recipeCatalog ?? [] as recipe (recipe.id)}
															<option value={recipe.id} selected={meal.recipeId === recipe.id}>{recipe.name}</option>
														{/each}
													</select>
												</label>
												<label class="space-y-1 text-sm">
													<span class="font-medium">Quantité (g)</span>
													<input class="w-full rounded-md border px-3 py-2" type="number" step="0.1" min="0" name="quantityG" value={meal.quantityG ?? ''} />
												</label>
												<label class="space-y-1 text-sm">
													<span class="font-medium">Mangé le</span>
													<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="eatenAt" value={toDateTimeLocal(meal.eatenAt)} />
												</label>
												<label class="flex items-center gap-2 text-sm">
													<input type="checkbox" name="isManual" checked={meal.isManual ?? false} />
													<span>Manuel</span>
												</label>
												{#each mealNumberFields as field (field.name)}
													<label class="space-y-1 text-sm">
														<span class="font-medium">{field.label}</span>
														<input class="w-full rounded-md border px-3 py-2" type="number" step="0.1" min="0" name={field.name} value={meal[field.name] ?? ''} />
													</label>
												{/each}
												<div class="md:col-span-6">
													<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer le repas {meal.position}</button>
												</div>
											</form>
										{/each}
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">Aucun repas pour ce jour.</p>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
				<div class="mt-6 rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Jour</Table.Head>
								<Table.Head>Jeûne intermittent</Table.Head>
								<Table.Head>Repas</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.nutritionDays as n (n.id)}
								<Table.Row>
									<Table.Cell>{n.dayIndex}</Table.Cell>
									<Table.Cell>{n.intermittentFasting ? 'Oui' : 'Non'}</Table.Cell>
									<Table.Cell>{n.meals?.length ?? 0}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun jour nutrition.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Listes de courses</Card.Title>
			<Card.Description>Éditer les périodes et les articles générés.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if userSelected.shoppingLists?.length}
				{#each userSelected.shoppingLists as s (s.id)}
					<div class="space-y-3 rounded-lg border p-3">
						<form method="POST" action="?/updateShoppingList" class="grid gap-3 md:grid-cols-4">
							<input type="hidden" name="id" value={s.id} />
							<label class="space-y-1 text-sm">
								<span class="font-medium">Jour début</span>
								<input class="w-full rounded-md border px-3 py-2" type="number" min="1" max="1000" name="startDayIndex" value={s.startDayIndex} />
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Jour fin</span>
								<input class="w-full rounded-md border px-3 py-2" type="number" min="1" max="1000" name="endDayIndex" value={s.endDayIndex} />
							</label>
							<p class="self-end text-sm text-muted-foreground">Générée le {fmtDate(s.generatedAt)}</p>
							<div class="self-end">
								<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer la période</button>
							</div>
						</form>

						{#if s.items?.length}
							<div class="rounded-md border overflow-x-auto">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Ingrédient</Table.Head>
											<Table.Head>Catégorie</Table.Head>
											<Table.Head>Quantité</Table.Head>
											<Table.Head>Unité</Table.Head>
											<Table.Head>Coché</Table.Head>
											<Table.Head>Reporté</Table.Head>
											<Table.Head>Sources JSON</Table.Head>
											<Table.Head>Action</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each s.items as item (item.id)}
											<Table.Row>
												<Table.Cell><input form={`shopping-item-${item.id}`} class="w-48 rounded-md border px-2 py-1" name="ingredientName" value={item.ingredientName} /></Table.Cell>
												<Table.Cell><input form={`shopping-item-${item.id}`} class="w-36 rounded-md border px-2 py-1" name="category" value={item.category ?? ''} /></Table.Cell>
												<Table.Cell><input form={`shopping-item-${item.id}`} class="w-24 rounded-md border px-2 py-1" type="number" step="0.1" min="0" name="totalQuantityG" value={item.totalQuantityG} /></Table.Cell>
												<Table.Cell><input form={`shopping-item-${item.id}`} class="w-20 rounded-md border px-2 py-1" name="unit" value={item.unit ?? ''} /></Table.Cell>
												<Table.Cell><input form={`shopping-item-${item.id}`} type="checkbox" name="isChecked" checked={item.isChecked ?? false} /></Table.Cell>
												<Table.Cell><input form={`shopping-item-${item.id}`} type="checkbox" name="isReported" checked={item.isReported ?? false} /></Table.Cell>
												<Table.Cell><input form={`shopping-item-${item.id}`} class="w-64 rounded-md border px-2 py-1" name="sources" value={jsonValue(item.sources)} /></Table.Cell>
												<Table.Cell>
													<form id={`shopping-item-${item.id}`} method="POST" action="?/updateShoppingItem">
														<input type="hidden" name="id" value={item.id} />
														<button class="rounded-md border px-2 py-1 text-xs" type="submit">Sauver</button>
													</form>
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">Aucun article dans cette liste.</p>
						{/if}
					</div>
				{/each}
			{:else}
				<p class="text-muted-foreground text-sm">Aucune liste de courses.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recettes favorites</Card.Title>
			<Card.Description>Ajouter ou retirer une recette favorite pour cet utilisateur.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if adminOptions.recipeCatalog?.length}
				<form method="POST" action="?/upsertFavoriteRecipe" class="flex flex-wrap items-end gap-3">
					<label class="space-y-1 text-sm">
						<span class="font-medium">Recette</span>
						<select class="w-72 rounded-md border px-3 py-2" name="recipeId">
							{#each adminOptions.recipeCatalog as recipe (recipe.id)}
								<option value={recipe.id}>{recipe.name}</option>
							{/each}
						</select>
					</label>
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Ajouter aux favoris</button>
				</form>
			{/if}

			{#if userSelected.favoriteRecipes?.length}
				<div class="flex flex-wrap gap-2">
					{#each userSelected.favoriteRecipes as favorite (favorite.id)}
						<form method="POST" action="?/upsertFavoriteRecipe" class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
							<input type="hidden" name="id" value={favorite.id} />
							<span>{favorite.recipe?.name ?? favorite.recipeId}</span>
							<button class="text-destructive" type="submit">Retirer</button>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">Aucune recette favorite.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recettes personnelles</Card.Title>
			<Card.Description>Recettes créées par l'utilisateur.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.recipes?.length}
				<ul class="list-disc list-inside text-sm">
					{#each userSelected.recipes as r (r.id)}
						<li>{r.name}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune recette personnelle.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
