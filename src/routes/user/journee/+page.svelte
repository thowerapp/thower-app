<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let checkedItems = $state<Record<string, boolean>>({
		water: true,
		meditation: true,
		nosugar: true,
		coffeemax: false,
		coffeetime: false,
		notobacco: false
	});

	function toggleCheck(key: string) {
		checkedItems[key] = !checkedItems[key];
	}

	function getCheckedCount() {
		return Object.values(checkedItems).filter(Boolean).length;
	}

	function getTotalPoints() {
		const pointsMap: Record<string, number> = {
			water: 5,
			meditation: 5,
			nosugar: 5,
			coffeemax: 5,
			coffeetime: 5,
			notobacco: 10
		};
		return Object.entries(checkedItems)
			.filter(([, checked]) => checked)
			.reduce((sum, [key]) => sum + (pointsMap[key] || 0), 0);
	}
</script>

<div class="hero">
	<div class="hero-brand">
		<div class="hero-title">Journée</div>
		<div class="hero-sub">Ligne directrice · Jeudi 21</div>
	</div>
</div>

<div class="sec-head">
	<div class="sh-title">Ma checklist du jour</div>
	<div class="sh-sub">{getCheckedCount()} / 6 complétées · +{getTotalPoints()} pts</div>
</div>

<div class="checklist-block">
	<div class="check-item" onclick={() => toggleCheck('water')}>
		<div class="check-box" class:checked={checkedItems.water}>
			{#if checkedItems.water}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.water}>Boire 2L d'eau</div>
		<div class="check-pts" class:earned={checkedItems.water}>{checkedItems.water ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('meditation')}>
		<div class="check-box" class:checked={checkedItems.meditation}>
			{#if checkedItems.meditation}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.meditation}>10 min de méditation</div>
		<div class="check-pts" class:earned={checkedItems.meditation}>{checkedItems.meditation ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('nosugar')}>
		<div class="check-box" class:checked={checkedItems.nosugar}>
			{#if checkedItems.nosugar}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.nosugar}>Pas de sucre ajouté</div>
		<div class="check-pts" class:earned={checkedItems.nosugar}>{checkedItems.nosugar ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('coffeemax')}>
		<div class="check-box" class:checked={checkedItems.coffeemax}>
			{#if checkedItems.coffeemax}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.coffeemax}>Max 4 cafés</div>
		<div class="check-pts" class:earned={checkedItems.coffeemax}>{checkedItems.coffeemax ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('coffeetime')}>
		<div class="check-box" class:checked={checkedItems.coffeetime}>
			{#if checkedItems.coffeetime}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.coffeetime}>Pas de café après 14h</div>
		<div class="check-pts" class:earned={checkedItems.coffeetime}>{checkedItems.coffeetime ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('notobacco')}>
		<div class="check-box" class:checked={checkedItems.notobacco}>
			{#if checkedItems.notobacco}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.notobacco}>Pas de tabac</div>
		<div class="check-pts" class:earned={checkedItems.notobacco}>{checkedItems.notobacco ? '10 pts ✓' : '+10 pts'}</div>
	</div>
</div>

<div class="sec-head" style="margin-top: 4px;">
	<div class="sh-title">Points du jour</div>
	<div class="sh-sub">Checklist + Séance + Nutrition</div>
</div>

<div class="stats-row">
	<div class="stat-box">
		<div class="sb-val">{getTotalPoints()}</div>
		<div class="sb-lbl">Checklist</div>
	</div>
	<div class="stat-box">
		<div class="sb-val">0</div>
		<div class="sb-lbl">Séance</div>
	</div>
	<div class="stat-box">
		<div class="sb-val">{getTotalPoints()}</div>
		<div class="sb-lbl">Total jour</div>
	</div>
</div>

<style>
	.hero {
		background: #111;
		padding: 20px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.hero-brand {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.hero-title {
		font-size: 1.6rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.hero-sub {
		font-size: 0.6rem;
		color: #666;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.sec-head {
		padding: 12px 18px 8px;
		border-bottom: 1px solid #eee;
	}

	.sh-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #111;
	}

	.sh-sub {
		font-size: 0.56rem;
		color: #aaa;
		margin-top: 2px;
	}

	.checklist-block {
		padding: 10px 18px;
		border-bottom: 1px solid #f5f5f5;
	}

	.check-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 0;
		border-bottom: 1px solid #f8f8f8;
		cursor: pointer;
	}

	.check-item:last-child {
		border-bottom: none;
	}

	.check-box {
		width: 16px;
		height: 16px;
		border: 1.5px solid #ccc;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.1s;
	}

	.check-box.checked {
		background: #111;
		border-color: #111;
	}

	.check-label {
		font-size: 0.64rem;
		color: #333;
		flex: 1;
	}

	.check-label.done {
		text-decoration: line-through;
		color: #bbb;
	}

	.check-pts {
		font-size: 0.5rem;
		color: #aaa;
		flex-shrink: 0;
	}

	.check-pts.earned {
		color: #111;
		font-weight: 600;
	}

	.stats-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
		padding: 12px 18px 6px;
	}

	.stat-box {
		background: #f5f5f5;
		border: 1px solid #eee;
		padding: 10px 6px;
		text-align: center;
	}

	.sb-val {
		font-size: 1rem;
		font-weight: 700;
		color: #111;
	}

	.sb-lbl {
		font-size: 0.5rem;
		color: #aaa;
		margin-top: 2px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
</style>
<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let checkedItems = $state<Record<string, boolean>>({
		water: true,
		meditation: true,
		nosugar: true,
		coffeemax: false,
		coffeetime: false,
		notobacco: false
	});

	function toggleCheck(key: string) {
		checkedItems[key] = !checkedItems[key];
	}

	function getCheckedCount() {
		return Object.values(checkedItems).filter(Boolean).length;
	}

	function getTotalPoints() {
		const pointsMap: Record<string, number> = {
			water: 5,
			meditation: 5,
			nosugar: 5,
			coffeemax: 5,
			coffeetime: 5,
			notobacco: 10
		};
		return Object.entries(checkedItems)
			.filter(([, checked]) => checked)
			.reduce((sum, [key]) => sum + (pointsMap[key] || 0), 0);
	}
</script>

<div class="hero">
	<div class="hero-brand">
		<div class="hero-title">Journée</div>
		<div class="hero-sub">Ligne directrice · Jeudi 21</div>
	</div>
</div>

<div class="sec-head">
	<div class="sh-title">Ma checklist du jour</div>
	<div class="sh-sub">{getCheckedCount()} / 6 complétées · +{getTotalPoints()} pts</div>
</div>

<div class="checklist-block">
	<div class="check-item" onclick={() => toggleCheck('water')}>
		<div class="check-box" class:checked={checkedItems.water}>
			{#if checkedItems.water}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.water}>Boire 2L d'eau</div>
		<div class="check-pts" class:earned={checkedItems.water}>{checkedItems.water ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('meditation')}>
		<div class="check-box" class:checked={checkedItems.meditation}>
		hero {
		background: #111;
		padding: 20px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.hero-brand {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.hero-title {
		font-size: 1.6rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.hero-sub {
		font-size: 0.6rem;
		color: #666;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.sec-head {
		padding: 12px 18px 8px;
		border-bottom: 1px solid #eee;
	}

	.sh-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #111;
	}

	.sh-sub {
		font-size: 0.56rem;
		color: #aaa;
		margin-top: 2px;
	}

	.	{#if checkedItems.meditation}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.meditation}>10 min de méditation</div>
		<div class="check-pts" class:earned={checkedItems.meditation}>{checkedItems.meditation ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('nosugar')}>
		<div class="check-box" class:checked={checkedItems.nosugar}>
			{#if checkedItems.nosugar}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.nosugar}>Pas de sucre ajouté</div>
		<div class="check-pts" class:earned={checkedItems.nosugar}>{checkedItems.nosugar ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('coffeemax')}>
		<div class="check-box" class:checked={checkedItems.coffeemax}>
			{#if checkedItems.coffeemax}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.coffeemax}>Max 4 cafés</div>
		<div class="check-pts" class:earned={checkedItems.coffeemax}>{checkedItems.coffeemax ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('coffeetime')}>
		<div class="check-box" class:checked={checkedItems.coffeetime}>
			{#if checkedItems.coffeetime}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.coffeetime}>Pas de café après 14h</div>
		<div class="check-pts" class:earned={checkedItems.coffeetime}>{checkedItems.coffeetime ? '5 pts ✓' : '+5 pts'}</div>
	</div>

	<div class="check-item" onclick={() => toggleCheck('notobacco')}>
		<div class="check-box" class:checked={checkedItems.notobacco}>
			{#if checkedItems.notobacco}
				<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			{/if}
		</div>
		<div class="check-label" class:done={checkedItems.notobacco}>Pas de tabac</div>
		<div class="check-pts" class:earned={checkedItems.notobacco}>{checkedItems.notobacco ? '10 pts ✓' : '+10 pts'}</div>
	</div>
</div>

<div class="sec-head" style="margin-top: 4px;">
	<div class="sh-title">Points du jour</div>
	<div class="sh-sub">Checklist + Séance + Nutrition</div>
</div>

<div class="stats-row">
	<div class="stat-box">
		<div class="sb-val">{getTotalPoints()}</div>
		<div class="sb-lbl">Checklist</div>
	</div>
	<div class="stat-box">
		<div class="sb-val">0</div>
		<div class="sb-lbl">Séance</div>
	</div>
	<div class="stat-box">
		<div class="sb-val">{getTotalPoints()}</div>
		<div class="sb-lbl">Total jour</div>
	</div>
</div>

<style>
	.checklist-block {
		padding: 10px 18px;
		border-bottom: 1px solid rgba(240, 237, 232, 0.08);
	}
	.stats-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 6px;
		padding: 12px 18px 6px;
	}
	.hint {
		padding: 10px 18px 6px;
		font-size: 0.56rem;
		color: rgba(240, 237, 232, 0.5);
	}
	.hint a {
		color: #c9a84c;
		text-decoration: underline;
	}
</style>
