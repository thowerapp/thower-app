<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
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

	type Periode = 'jour' | '3jours' | 'semaine';

	const periodes: { value: Periode; label: string }[] = [
		{ value: 'jour',    label: "Aujourd'hui" },
		{ value: '3jours',  label: '3 jours' },
		{ value: 'semaine', label: 'Semaine' }
	];

	const d = $derived(data as unknown as {
		list: ShoppingList | null;
		periode: Periode;
		currentDay: number;
		startDayIndex: number;
		endDayIndex: number;
		daysCount: number;
		sortOrder: 'category' | 'alpha';
	});

	const list = $derived(d.list);
	const periode = $derived(d.periode ?? 'semaine');
	const daysCount = $derived(Math.max(1, d.daysCount ?? 7));
	let sortOrder = $state<'category' | 'alpha'>(d.sortOrder ?? 'category');
	let customDaysInput = $state<number>(Math.max(1, d.daysCount ?? 7));

	$effect(() => {
		sortOrder = d.sortOrder ?? 'category';
		customDaysInput = Math.max(1, d.daysCount ?? 7);
	});

	let checkedMap = $state<Record<string, boolean>>({});

	const PREFS_KEY = 'thower:nutrition:courses:prefs';

	$effect(() => {
		if (list?.items) {
			checkedMap = Object.fromEntries(list.items.map((item) => [item.id, item.isChecked]));
		}
	});

	function queryFor(next: {
		periode?: Periode;
		days?: number;
		sort?: 'category' | 'alpha';
	}): string {
		const params = new URLSearchParams();
		params.set('periode', next.periode ?? periode);
		params.set('days', String(Math.max(1, Math.min(91, Math.round(next.days ?? daysCount)))));
		params.set('sort', next.sort ?? sortOrder);
		return `?${params.toString()}`;
	}

	function persistPrefs(next: { periode: Periode; days: number; sort: 'category' | 'alpha' }) {
		if (!browser) return;
		localStorage.setItem(PREFS_KEY, JSON.stringify(next));
	}

	function switchPeriode(p: Periode) {
		let days = 7;
		if (p === 'jour') days = 1;
		if (p === '3jours') days = 3;
		if (p === 'semaine') days = Math.max(1, d.endDayIndex - d.startDayIndex + 1);
		persistPrefs({ periode: p, days, sort: sortOrder });
		goto(queryFor({ periode: p, days }), { invalidateAll: true, keepFocus: true });
	}

	function applyCustomDays() {
		const days = Math.max(1, Math.min(91, Math.round(customDaysInput || 1)));
		customDaysInput = days;
		persistPrefs({ periode, days, sort: sortOrder });
		goto(queryFor({ days }), { invalidateAll: true, keepFocus: true });
	}

	function switchSort(next: 'category' | 'alpha') {
		sortOrder = next;
		persistPrefs({ periode, days: daysCount, sort: next });
		goto(queryFor({ sort: next }), {
			invalidateAll: false,
			keepFocus: true,
			replaceState: true,
			noScroll: true
		});
	}

	onMount(() => {
		if (!browser) return;
		const params = new URLSearchParams(window.location.search);
		const hasPrefsInUrl = params.has('days') || params.has('sort') || params.has('periode');
		if (hasPrefsInUrl) {
			persistPrefs({ periode, days: daysCount, sort: sortOrder });
			return;
		}
		const raw = localStorage.getItem(PREFS_KEY);
		if (!raw) return;
		try {
			const saved = JSON.parse(raw) as {
				periode?: Periode;
				days?: number;
				sort?: 'category' | 'alpha';
			};
			const nextPeriode: Periode =
				saved.periode === 'jour' || saved.periode === '3jours' || saved.periode === 'semaine'
					? saved.periode
					: 'semaine';
			const nextDays = Math.max(1, Math.min(91, Math.round(saved.days ?? daysCount)));
			const nextSort: 'category' | 'alpha' = saved.sort === 'alpha' ? 'alpha' : 'category';
			goto(queryFor({ periode: nextPeriode, days: nextDays, sort: nextSort }), {
				invalidateAll: true,
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		} catch {
			// ignore invalid saved prefs
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
		if (list.startDayIndex === list.endDayIndex)
			return `Jour ${list.startDayIndex} du programme`;
		return `Jours ${list.startDayIndex}–${list.endDayIndex} du programme`;
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

<!-- Sélecteur de période -->
<div class="periode-row">
	{#each periodes as p}
		<button
			type="button"
			class="periode-btn"
			class:active={
				(p.value === 'jour' && daysCount === 1) ||
				(p.value === '3jours' && daysCount === 3) ||
				(p.value === 'semaine' && daysCount === d.endDayIndex - d.startDayIndex + 1)
			}
			onclick={() => switchPeriode(p.value)}
		>{p.label}</button>
	{/each}
</div>

<div class="days-row">
	<label for="custom-days" class="days-label">Nombre de jours</label>
	<div class="days-control">
		<input
			id="custom-days"
			type="number"
			min="1"
			max="91"
			step="1"
			value={customDaysInput}
			oninput={(e) => (customDaysInput = Number.parseInt(e.currentTarget.value || '1', 10) || 1)}
		/>
		<button type="button" class="days-apply" onclick={applyCustomDays}>Appliquer</button>
	</div>
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
		<p>Aucun repas planifié sur cette période.</p>
		<p class="empty-hint">Change la période (jour, 3 jours, semaine) pour regénérer automatiquement.</p>
	</div>
{:else}
	<div class="sort-row">
		<button class="sort-btn" class:active={sortOrder === 'category'} onclick={() => switchSort('category')}>
			Par catégorie
		</button>
		<button class="sort-btn" class:active={sortOrder === 'alpha'} onclick={() => switchSort('alpha')}>
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
.periode-row {
	display: flex;
	gap: 6px;
	padding: 10px 18px;
	border-bottom: 1px solid var(--br);
}
.periode-btn {
	flex: 1;
	padding: 8px 6px;
	font-size: .5625rem;
	font-weight: 700;
	border: 1px solid var(--br2);
	background: transparent;
	border-radius: 2px;
	cursor: pointer;
	color: var(--txd);
	transition: border-color .15s, color .15s, background .15s;
	font-family: var(--fb);
	text-transform: uppercase;
	letter-spacing: .05em;
}
.periode-btn.active {
	border-color: var(--cy);
	color: var(--cy);
	background: rgba(0,229,255,.06);
}

.days-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 10px 18px;
	border-bottom: 1px solid var(--br);
}

.days-label {
	font-size: .5625rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: .05em;
	color: var(--txd);
	font-family: var(--fb);
}

.days-control {
	display: flex;
	gap: 8px;
	align-items: center;
}

.days-control input {
	width: 72px;
	padding: 6px 8px;
	border: 1px solid var(--br2);
	background: transparent;
	color: var(--tx);
	font-size: .625rem;
	font-family: var(--fb);
}

.days-apply {
	padding: 7px 10px;
	font-size: .5625rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: .05em;
	border: 1px solid var(--br2);
	background: transparent;
	color: var(--txd);
	cursor: pointer;
	font-family: var(--fb);
}

.days-apply:active {
	background: rgba(0,229,255,.06);
	border-color: var(--cy);
	color: var(--cy);
}

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
.empty-hint {
	margin-top: 8px;
	font-size: .5625rem;
	color: var(--g);
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

