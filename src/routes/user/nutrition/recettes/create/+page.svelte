<script lang="ts">
	let { form } = $props();
</script>

<div class="back-row">
	<a href="/user/nutrition/recettes" class="home-btn">← Recettes</a>
	<div class="page-title">Créer une recette</div>
</div>

{#if form?.error}
	<div class="error-box">{form.error}</div>
{/if}

<form method="POST" class="create-form">
	<label>
		<span>Nom</span>
		<input type="text" name="name" required minlength="2" />
	</label>

	<label>
		<span>Catégorie</span>
		<select name="category" required>
			<option value="BREAKFAST">Petit déjeuner</option>
			<option value="MEAL" selected>Repas</option>
			<option value="DESSERT">Dessert</option>
		</select>
	</label>

	<label>
		<span>Description</span>
		<textarea name="description" rows="3"></textarea>
	</label>

	<div class="grid-2">
		<label>
			<span>Temps total (min)</span>
			<input type="number" min="1" step="1" name="totalTimeMin" />
		</label>
		<label>
			<span>Portions</span>
			<input type="number" min="1" step="1" name="servings" value="1" />
		</label>
	</div>

	<label>
		<span>Poids de référence (g)</span>
		<input type="number" min="1" step="0.1" name="referenceYieldG" />
	</label>

	<div class="grid-2">
		<label>
			<span>kcal</span>
			<input type="number" min="0" step="0.1" name="nutritionKcal" />
		</label>
		<label>
			<span>Protéines (g)</span>
			<input type="number" min="0" step="0.1" name="nutritionProteinG" />
		</label>
		<label>
			<span>Glucides (g)</span>
			<input type="number" min="0" step="0.1" name="nutritionCarbsG" />
		</label>
		<label>
			<span>Lipides (g)</span>
			<input type="number" min="0" step="0.1" name="nutritionFatG" />
		</label>
		<label>
			<span>Fibres (g)</span>
			<input type="number" min="0" step="0.1" name="nutritionFiberG" />
		</label>
	</div>

	<label>
		<span>Instructions</span>
		<textarea name="instructions" rows="6"></textarea>
	</label>

	<button type="submit" class="submit-btn">Enregistrer la recette</button>
</form>

<style>
	.back-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #111;
		gap: 12px;
	}

	.home-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: #fff;
		font-size: 0.7rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.1);
	}

	.page-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #fff;
		margin-left: auto;
	}

	.error-box {
		margin: 12px 16px;
		padding: 10px;
		border: 1px solid #d00;
		background: #fff1f1;
		font-size: 0.62rem;
		color: #a00;
	}

	.create-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 14px 16px 22px;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label > span {
		font-size: 0.56rem;
		font-weight: 600;
		color: #444;
	}

	input,
	select,
	textarea {
		border: 1px solid #ddd;
		padding: 8px 10px;
		font-size: 0.62rem;
		font-family: inherit;
		background: #fff;
		border-radius: 4px;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.submit-btn {
		margin-top: 4px;
		border: 1px solid #111;
		background: #111;
		color: #fff;
		padding: 10px 12px;
		font-size: 0.64rem;
		font-weight: 600;
		cursor: pointer;
	}
</style>
