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

<div class="u-back-row">
	<a href="/user/nutrition" class="u-back-lnk">
		<svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" stroke="var(--txd)" stroke-width="1.5" stroke-linecap="round"/></svg>
		<span class="u-back-lbl">Nutrition</span>
	</a>
	<div class="u-back-head">Courses</div>
</div>

<div class="list-header">
	{#if list}
		<div class="list-sub">{getPeriodLabel()} · <span class="list-count">{checkedCount()}/{list.items.length}</span> cochés</div>
	{:else}
		<div class="list-sub">Aucune liste disponible</div>
	{/if}
</div>

{#if !list}
	<div class="empty-state">
		<p>Votre liste de courses sera générée automatiquement après la validation de votre programme nutrition.</p>
	</div>
{:else}
	<div class="sort-row">
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
				<div class="cat-head">
					<div class="cat-name">{cat.name}</div>
					<div class="cat-count">{cat.items.length}</div>
				</div>
				{#each cat.items as item (item.id)}
					<div class="list-item" class:done={checkedMap[item.id]}>
						<form method="POST" action="?/toggleItem" use:enhance={() => {
							checkedMap[item.id] = !checkedMap[item.id];
							return async ({ update }) => update({ reset: false });
						}}>
							<input type="hidden" name="itemId" value={item.id} />
							<input type="hidden" name="isChecked" value={String(!checkedMap[item.id])} />
							<button type="submit" class="checkbox" class:checked={checkedMap[item.id]}>
								{#if checkedMap[item.id]}<span class="check-mark">✓</span>{/if}
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
			<div class="list-item" class:done={checkedMap[item.id]}>
				<form method="POST" action="?/toggleItem" use:enhance={() => {
					checkedMap[item.id] = !checkedMap[item.id];
					return async ({ update }) => update({ reset: false });
				}}>
					<input type="hidden" name="itemId" value={item.id} />
					<input type="hidden" name="isChecked" value={String(!checkedMap[item.id])} />
					<button type="submit" class="checkbox" class:checked={checkedMap[item.id]}>
						{#if checkedMap[item.id]}<span class="check-mark">✓</span>{/if}
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
.list-header {
	padding: 10px 18px;
	border-bottom: 1px solid var(--br);
}
.list-sub {
	font-size: .5625rem;
	color: var(--txd);
	font-family: var(--fb);
}
.list-count {
	color: var(--cy);
	font-weight: 700;
}

.empty-state {
	padding: 32px 18px;
	text-align: center;
	color: var(--txd);
	font-size: .6875rem;
	line-height: 1.6;
	font-family: var(--fb);
}

.sort-row {
	display: flex;
	gap: 8px;
	padding: 10px 18px;
	border-bottom: 1px solid var(--br);
}
.sort-btn {
	flex: 1;
	padding: 7px 8px;
	font-size: .5625rem;
	font-weight: 600;
	border: 1px solid var(--br2);
	background: transparent;
	border-radius: 2px;
	cursor: pointer;
	color: var(--txd);
	transition: border-color .15s, color .15s;
	font-family: inherit;
	text-transform: uppercase;
	letter-spacing: .04em;
}
.sort-btn.active {
	border-color: var(--cy);
	color: var(--cy);
}

.cat-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 18px 7px;
	border-bottom: 1px solid var(--br);
	background: var(--s2);
}
.cat-name {
	font-size: .5625rem;
	font-weight: 700;
	color: var(--g);
	text-transform: uppercase;
	letter-spacing: .08em;
	font-family: var(--fb);
}
.cat-count {
	font-size: .5rem;
	color: var(--txd);
	font-family: var(--fb);
	background: var(--br2);
	padding: 1px 6px;
	border-radius: 2px;
}

.list-item {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 13px 18px;
	border-bottom: 1px solid var(--br);
	transition: background .1s;
}
.list-item.done {
	opacity: .5;
}
.list-item form {
	display: contents;
}

.checkbox {
	width: 22px;
	height: 22px;
	border: 1.5px solid var(--br2);
	background: transparent;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	font-family: inherit;
	padding: 0;
	transition: border-color .15s, background .15s;
}
.checkbox.checked {
	background: var(--cy);
	border-color: var(--cy);
	box-shadow: 0 0 8px rgba(0,229,255,.3);
}
.check-mark {
	font-size: .625rem;
	color: var(--s1);
	font-weight: 700;
}

.item-body {
	flex: 1;
}
.item-name {
	font-size: .75rem;
	font-weight: 500;
	color: var(--tx);
	font-family: var(--fb);
	transition: color .15s;
}
.item-name.done {
	text-decoration: line-through;
	color: var(--txd);
}
.item-qty {
	font-size: .5625rem;
	color: var(--txd);
	margin-top: 2px;
	font-family: var(--fb);
}
.item-qty.done {
	text-decoration: line-through;
}

.reported-badge {
	font-size: .5rem;
	background: transparent;
	color: var(--g);
	border: 1px solid rgba(201,168,78,.4);
	border-radius: 2px;
	padding: 0 4px;
	margin-left: 5px;
	vertical-align: middle;
	font-family: var(--fb);
	text-transform: uppercase;
	letter-spacing: .04em;
}
</style>

