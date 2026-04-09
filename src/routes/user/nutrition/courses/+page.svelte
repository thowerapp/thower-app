<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type ShoppingItem = {
		id: string;
		ingredientName: string;
		category: string | null;
		totalQuantityG: number;
		unit: string | null;
		isChecked: boolean;
		isReported: boolean;
	};

	type ShoppingList = {
		id: string;
		startDayIndex: number;
		endDayIndex: number;
		generatedAt: string | Date;
		items: ShoppingItem[];
	};

	let sortOrder = $state<'category' | 'alpha'>('category');

	const list = $derived((data as unknown as { list: ShoppingList | null }).list);

	let checkedMap = $state<Record<string, boolean>>({});

	$effect(() => {
		if (list?.items) {
			checkedMap = Object.fromEntries(list.items.map((item) => [item.id, item.isChecked]));
		}
	});

	function getItems(): ShoppingItem[] {
		if (!list?.items) return [];
		if (sortOrder === 'alpha') {
			return [...list.items].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, 'fr'));
		}
		return [...list.items].sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '', 'fr'));
	}

	function getCategories(): { name: string; items: ShoppingItem[] }[] {
		if (!list?.items) return [];
		const map = new Map<string, ShoppingItem[]>();
		for (const item of list.items) {
			const cat = item.category ?? 'Autres';
			if (!map.has(cat)) map.set(cat, []);
			map.get(cat)!.push(item);
		}
		return Array.from(map.entries())
			.sort(([a], [b]) => a.localeCompare(b, 'fr'))
			.map(([name, items]) => ({ name, items }));
	}

	function getPeriodLabel(): string {
		if (!list) return '';
		return `Jours ${list.startDayIndex} – ${list.endDayIndex} du programme`;
	}

	function checkedCount(): number {
		return Object.values(checkedMap).filter(Boolean).length;
	}
</script>

<div class="back-row">
	<a href="/user" class="home-btn">← Accueil</a>
	<div class="page-title">Courses</div>
</div>

<div class="header-section">
	<div class="title">Liste de courses</div>
	{#if list}
		<div class="sub">{getPeriodLabel()} · {checkedCount()}/{list.items.length} cochés</div>
	{:else}
		<div class="sub">Aucune liste disponible</div>
	{/if}
</div>

{#if !list}
	<div class="empty-state">
		<p>Votre liste de courses sera générée automatiquement après la validation de votre programme nutrition.</p>
	</div>
{:else}
	<div class="sort-buttons">
		<button class="sort-btn" class:active={sortOrder === 'category'} onclick={() => (sortOrder = 'category')}>
			Par catégorie
		</button>
		<button class="sort-btn" class:active={sortOrder === 'alpha'} onclick={() => (sortOrder = 'alpha')}>
			Alphabétique
		</button>
	</div>

	{#if sortOrder === 'category'}
		{#each getCategories() as cat (cat.name)}
			{#if cat.items.length > 0}
				<div class="category-header">
					<div class="cat-title">{cat.name}</div>
					<div class="cat-sub">{cat.items.length} article{cat.items.length > 1 ? 's' : ''}</div>
				</div>
				{#each cat.items as item (item.id)}
					<div class="list-item">
						<form method="POST" action="?/toggleItem" use:enhance={() => {
							checkedMap[item.id] = !checkedMap[item.id];
							return async ({ update }) => update({ reset: false });
						}}>
							<input type="hidden" name="itemId" value={item.id} />
							<input type="hidden" name="isChecked" value={String(!checkedMap[item.id])} />
							<button type="submit" class="checkbox" class:checked={checkedMap[item.id]}>
								{#if checkedMap[item.id]}✓{/if}
							</button>
						</form>
						<div class="item-body">
							<div class="item-name" class:done={checkedMap[item.id]}>
								{item.ingredientName}
								{#if item.isReported}<span class="reported-badge">report</span>{/if}
							</div>
							<div class="item-qty" class:done={checkedMap[item.id]}>
								{Math.round(item.totalQuantityG)} {item.unit ?? 'g'}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		{/each}
	{:else}
		{#each getItems() as item (item.id)}
			<div class="list-item">
				<form method="POST" action="?/toggleItem" use:enhance={() => {
					checkedMap[item.id] = !checkedMap[item.id];
					return async ({ update }) => update({ reset: false });
				}}>
					<input type="hidden" name="itemId" value={item.id} />
					<input type="hidden" name="isChecked" value={String(!checkedMap[item.id])} />
					<button type="submit" class="checkbox" class:checked={checkedMap[item.id]}>
						{#if checkedMap[item.id]}✓{/if}
					</button>
				</form>
				<div class="item-body">
					<div class="item-name" class:done={checkedMap[item.id]}>
						{item.ingredientName}
						{#if item.isReported}<span class="reported-badge">report</span>{/if}
					</div>
					<div class="item-qty" class:done={checkedMap[item.id]}>
						{Math.round(item.totalQuantityG)} {item.unit ?? 'g'}
					</div>
				</div>
			</div>
		{/each}
	{/if}
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

.empty-state {
	padding: 32px 16px;
	text-align: center;
	color: #888;
	font-size: 0.62rem;
	line-height: 1.6;
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

.list-item form {
	display: contents;
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

.reported-badge {
	font-size: 0.46rem;
	background: #f0e68c;
	color: #7a6a00;
	border-radius: 2px;
	padding: 0 3px;
	margin-left: 4px;
	vertical-align: middle;
}
</style>

