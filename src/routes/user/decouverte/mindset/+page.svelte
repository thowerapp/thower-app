<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let activeTab = $state<'unlocked' | 'locked'>('unlocked');
</script>

<div class="back-row">
	<a href="/user/decouverte" class="back-btn">← Découverte</a>
	<div class="page-title">Mindset</div>
</div>

<div class="sec-head">
	<div class="sh-title">Mindset</div>
	<div class="sh-sub">Motivation · Discipline · Objectifs</div>
</div>

<div class="toggle-row">
	<button 
		class="toggle-btn" 
		class:on={activeTab === 'unlocked'}
		onclick={() => activeTab = 'unlocked'}
	>
		Débloqué
	</button>
	<button 
		class="toggle-btn" 
		class:on={activeTab === 'locked'}
		onclick={() => activeTab = 'locked'}
	>
		Bloqué
	</button>
</div>

<div class="media-grid">
	{#if activeTab === 'unlocked'}
		<div class="media-cell">
			<div class="shape-circle-sm"></div>
			<div class="mc-title">Intro mindset</div>
		</div>
		<div class="media-cell">
			<div class="shape-square-sm"></div>
			<div class="mc-title">Objectifs</div>
		</div>
	{:else}
		<div class="media-cell locked">
			<div class="lock-shape"></div>
			<div class="mc-title">Stress</div>
		</div>
		<div class="media-cell locked">
			<div class="lock-shape"></div>
			<div class="mc-title">Habitudes</div>
		</div>
		<div class="media-cell locked">
			<div class="lock-shape"></div>
			<div class="mc-title">Visualisation</div>
		</div>
		<div class="media-cell locked">
			<div class="lock-shape"></div>
			<div class="mc-title">Confiance</div>
		</div>
	{/if}
</div>

<style>
	.back-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		background: #111;
		border-bottom: 1px solid #222;
	}

	.back-btn {
		color: #aaa;
		text-decoration: none;
		font-size: 0.62rem;
		transition: color 0.15s;
	}

	.back-btn:hover {
		color: #ccc;
	}

	.page-title {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
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

	.toggle-row {
		display: flex;
		gap: 8px;
		padding: 10px 12px;
	}

	.toggle-btn {
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

	.toggle-btn.on {
		background: #111;
		color: #fff;
		border-color: #111;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 5px;
		padding: 10px 18px;
	}

	.media-cell {
		aspect-ratio: 1;
		background: #f0f0f0;
		border: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		gap: 5px;
		transition: background 0.1s;
	}

	.media-cell:hover:not(.locked) {
		background: #e8e8e8;
	}

	.media-cell.locked {
		background: #f8f8f8;
		cursor: not-allowed;
	}

	.mc-title {
		font-size: 0.42rem;
		color: #888;
		text-align: center;
		padding: 0 4px;
		line-height: 1.3;
	}

	.shape-square-sm {
		width: 13px;
		height: 13px;
		background: #555;
		flex-shrink: 0;
	}

	.shape-circle-sm {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #555;
		flex-shrink: 0;
	}

	.lock-shape {
		width: 11px;
		height: 11px;
		border: 1.5px solid #ccc;
		background: #f0f0f0;
		position: relative;
		flex-shrink: 0;
	}

	.lock-shape::before {
		content: '';
		position: absolute;
		top: -5px;
		left: 50%;
		transform: translateX(-50%);
		width: 7px;
		height: 5px;
		border: 1.5px solid #ccc;
		border-bottom: none;
		border-radius: 4px 4px 0 0;
		background: transparent;
	}
</style>
