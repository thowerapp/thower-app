<script lang="ts">
let sortOrder: 'category' | 'alpha' = 'category';
let checkedItems = new Set<string>();

// Demo shopping list data
const categories = {
'Protéines': [
{ id: '1', name: 'Thon', qty: 400, unit: 'g' },
{ id: '2', name: 'Poulet', qty: 500, unit: 'g' }
],
'Légumes': [
{ id: '3', name: 'Tomates', qty: 500, unit: 'g' },
{ id: '4', name: 'Endives', qty: 300, unit: 'g' }
],
'Condiments': [
{ id: '5', name: 'Olives', qty: 200, unit: 'g' },
{ id: '6', name: 'Huile olive', qty: 250, unit: 'ml' }
]
};

function toggleCheck(id: string) {
if (checkedItems.has(id)) {
checkedItems.delete(id);
} else {
checkedItems.add(id);
}
checkedItems = checkedItems;
}

function getItems() {
let items: any[] = [];
if (sortOrder === 'category') {
Object.values(categories).forEach(cat => {
items = items.concat(cat);
});
return items;
} else {
Object.values(categories).forEach(cat => {
items = items.concat(cat);
});
return items.sort((a, b) => a.name.localeCompare(b.name));
}
}

function getCategoryName(item: any) {
for (const [cat, items] of Object.entries(categories)) {
if (items.some(i => i.id === item.id)) return cat;
}
return '';
}
</script>

<div class="back-row">
	<a href="/user" class="home-btn">← Accueil</a>
<div class="page-title">Courses</div>
</div>

<div class="header-section">
<div class="title">Liste de courses</div>
<div class="sub">Semaine 4 - 7 jours</div>
</div>

<div class="sort-buttons">
<button class="sort-btn" class:active={sortOrder === 'category'} on:click={() => (sortOrder = 'category')}>
Par catégorie
</button>
<button class="sort-btn" class:active={sortOrder === 'alpha'} on:click={() => (sortOrder = 'alpha')}>
Alphabétique
</button>
</div>

{#if sortOrder === 'category'}
{#each Object.entries(categories) as [cat, items] (cat)}
{#if items.length > 0}
<div class="category-header">
<div class="cat-title">{cat}</div>
<div class="cat-sub">{items.length} articles</div>
</div>

{#each items as item (item.id)}
<div class="list-item">
<button class="checkbox" class:checked={checkedItems.has(item.id)} on:click={() => toggleCheck(item.id)}>
{#if checkedItems.has(item.id)}✓{/if}
</button>
<div class="item-body">
<div class="item-name" class:done={checkedItems.has(item.id)}>
{item.name}
</div>
<div class="item-qty" class:done={checkedItems.has(item.id)}>
{Math.round(item.qty)} {item.unit}
</div>
</div>
</div>
{/each}
{/if}
{/each}
{:else}
{#each getItems() as item (item.id)}
<div class="list-item">
<button class="checkbox" class:checked={checkedItems.has(item.id)} on:click={() => toggleCheck(item.id)}>
{#if checkedItems.has(item.id)}✓{/if}
</button>
<div class="item-body">
<div class="item-name" class:done={checkedItems.has(item.id)}>
{item.name}
</div>
<div class="item-qty" class:done={checkedItems.has(item.id)}>
{Math.round(item.qty)} {item.unit}
</div>
</div>
</div>
{/each}
{/if}

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

.header-section {
padding: 14px 16px;
background: #f5f5f5;
border-bottom: 1px solid #eee;
}

.title {
font-size: 0.68rem;
font-weight: 600;
color: #111;
}

.sub {
font-size: 0.54rem;
color: #888;
margin-top: 2px;
}

.sort-buttons {
display: flex;
gap: 8px;
padding: 10px 12px;
}

.sort-btn {
flex: 1;
padding: 6px 8px;
font-size: 0.55rem;
font-weight: 500;
border: 1px solid #ddd;
background: #fff;
border-radius: 2px;
cursor: pointer;
color: #666;
transition: all 0.15s;
font-family: inherit;
}

.sort-btn.active {
background: #111;
color: #fff;
border-color: #111;
}

.category-header {
padding: 12px 16px 8px;
background: #f9f9f9;
border-bottom: 1px solid #f0f0f0;
}

.cat-title {
font-size: 0.66rem;
font-weight: 600;
color: #111;
}

.cat-sub {
font-size: 0.52rem;
color: #999;
margin-top: 1px;
}

.list-item {
display: flex;
align-items: center;
gap: 12px;
padding: 12px 16px;
border-bottom: 1px solid #f5f5f5;
}

.checkbox {
width: 20px;
height: 20px;
border: 1.5px solid #ccc;
background: #fff;
border-radius: 2px;
cursor: pointer;
flex-shrink: 0;
font-size: 0.7rem;
color: #fff;
display: flex;
align-items: center;
justify-content: center;
font-family: inherit;
padding: 0;
}

.checkbox.checked {
background: #111;
border-color: #111;
color: #fff;
}

.item-body {
flex: 1;
}

.item-name {
font-size: 0.64rem;
font-weight: 500;
color: #222;
}

.item-name.done {
text-decoration: line-through;
color: #bbb;
}

.item-qty {
font-size: 0.52rem;
color: #999;
margin-top: 2px;
}

.item-qty.done {
text-decoration: line-through;
color: #ddd;
}
</style>
