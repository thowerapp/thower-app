<script lang="ts">
let activeTab = '3mois';
let favorites = new Set<string>();

// Demo recipes data
const recipes = {
'3mois': [
{ id: '1', name: 'Salade niçoise revisitée', prep: 15, cook: 0 },
{ id: '2', name: 'Poulet rôti', prep: 10, cook: 30 },
{ id: '3', name: 'Riz complet aux légumes', prep: 5, cook: 20 }
],
'favoris': [
{ id: '2', name: 'Poulet rôti', prep: 10, cook: 30 }
],
'mes': [
{ id: '4', name: 'Ma recette perso', prep: 20, cook: 15 }
],
'new': [
{ id: '5', name: 'Recette premium', prep: 15, cook: 25 }
]
};

function toggleFavorite(id: string) {
if (favorites.has(id)) {
favorites.delete(id);
} else {
favorites.add(id);
}
favorites = favorites;
}

function getRecipes() {
switch (activeTab) {
case 'favoris':
return recipes.favoris;
case 'mes':
return recipes.mes;
case 'new':
return recipes.new;
default:
return recipes['3mois'];
}
}
</script>

<div class="back-row">
	<a href="/user/nutrition" class="home-btn">← Nutrition</a>
<div class="page-title">Recettes</div>
</div>

<div class="tabs-section">
<button class="tab-btn" class:active={activeTab === '3mois'} on:click={() => (activeTab = '3mois')}>
3 premiers mois
</button>
<button class="tab-btn" class:active={activeTab === 'favoris'} on:click={() => (activeTab = 'favoris')}>
Favoris
</button>
<button class="tab-btn" class:active={activeTab === 'mes'} on:click={() => (activeTab = 'mes')}>
Mes recettes
</button>
<button class="tab-btn" class:active={activeTab === 'new'} on:click={() => (activeTab = 'new')} disabled>
Nouvelles 🔒
</button>
</div>

<div class="recipes-list">
{#each getRecipes() as recipe (recipe.id)}
<div class="recipe-item">
<div class="recipe-icon">⬛</div>
<div class="recipe-body">
<div class="recipe-name">{recipe.name}</div>
<div class="recipe-meta">
{#if recipe.prep}Prépa {recipe.prep}min{/if}
{#if recipe.cook} • Cuisson {recipe.cook}min{/if}
</div>
</div>
<button
class="star-btn"
class:starred={favorites.has(recipe.id)}
on:click={() => toggleFavorite(recipe.id)}
>
{favorites.has(recipe.id) ? '★' : '☆'}
</button>
</div>
{/each}
</div>

<div class="create-link">
<a href="/user/nutrition/recettes/new">+ Créer une recette</a>
</div>

<style>
.back-row {
display: flex;
align-items: center;
justify-content: space-between;
padding: 12px 16px;
background: #111;
flex-shrink: 0;
gap: 12px;
}

.back-link {
display: flex;
align-items: center;
gap: 6px;
text-decoration: none;
color: #888;
font-size: 0.62rem;
font-weight: 400;
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
transition: all 0.15s;
}

.home-btn:active {
background: rgba(255, 255, 255, 0.2);
}

.back-arrow {
font-size: 0.75rem;
}

.page-title {
font-size: 0.72rem;
font-weight: 600;
color: #fff;
margin-left: auto;
}

.tabs-section {
display: flex;
gap: 8px;
padding: 12px 12px;
background: #f5f5f5;
overflow-x: auto;
flex-wrap: wrap;
border-bottom: 1px solid #eee;
}

.tab-btn {
flex-shrink: 0;
padding: 6px 12px;
border: 1px solid #ddd;
background: #fff;
border-radius: 3px;
font-size: 0.55rem;
font-weight: 500;
color: #666;
cursor: pointer;
transition: all 0.15s;
font-family: inherit;
}

.tab-btn:hover:not(:disabled) {
border-color: #999;
color: #111;
}

.tab-btn.active {
background: #111;
color: #fff;
border-color: #111;
}

.tab-btn:disabled {
opacity: 0.5;
cursor: not-allowed;
}

.recipes-list {
display: flex;
flex-direction: column;
}

.recipe-item {
display: flex;
align-items: center;
gap: 12px;
padding: 14px 16px;
border-bottom: 1px solid #f0f0f0;
text-decoration: none;
color: inherit;
transition: background 0.1s;
}

.recipe-item:last-child {
border-bottom: none;
}

.recipe-item:active {
background: #f8f8f8;
}

.recipe-icon {
width: 32px;
height: 32px;
display: flex;
align-items: center;
justify-content: center;
background: #ddd;
font-size: 0.8rem;
flex-shrink: 0;
border-radius: 2px;
color: #999;
}

.recipe-body {
flex: 1;
min-width: 0;
}

.recipe-name {
font-size: 0.66rem;
font-weight: 500;
color: #222;
}

.recipe-meta {
font-size: 0.54rem;
color: #888;
margin-top: 2px;
}

.star-btn {
width: 24px;
height: 24px;
border: none;
background: none;
font-size: 0.9rem;
color: #bbb;
cursor: pointer;
flex-shrink: 0;
font-family: inherit;
padding: 0;
display: flex;
align-items: center;
justify-content: center;
}

.star-btn.starred {
color: #ffb800;
}

.create-link {
padding: 14px 16px;
border-top: 1px solid #eee;
text-align: center;
}

.create-link a {
text-decoration: none;
color: #666;
font-size: 0.64rem;
font-weight: 500;
}

.create-link a:active {
opacity: 0.7;
}
</style>
