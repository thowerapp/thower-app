<script lang="ts">
	let { label, pts, checked = false } = $props<{ label: string; pts: number; checked?: boolean }>();

	function toggle() {
		checked = !checked;
	}
</script>

<div class="check-item" on:click={toggle} role="checkbox" aria-checked={checked} tabindex="0"
	on:keydown={(e) => e.key === 'Enter' && toggle()}>
	<div class="check-box" class:checked>
		{#if checked}
			<svg width="9" height="7" viewBox="0 0 9 7" fill="none">
				<path d="M1 3.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</div>
	<div class="check-label" class:done={checked}>{label}</div>
	<div class="check-pts" class:earned={checked}>
		{#if checked}{pts} pts ✓{:else}+{pts} pts{/if}
	</div>
</div>

<style>
	.check-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 0;
		border-bottom: 1px solid rgba(240, 237, 232, 0.08);
		cursor: pointer;
	}
	.check-item:last-child {
		border-bottom: none;
	}
	.check-box {
		width: 16px;
		height: 16px;
		border: 1.5px solid rgba(201, 168, 76, 0.3);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.1s;
	}
	.check-box.checked {
		background: #c9a84c;
		border-color: #c9a84c;
	}
	.check-label {
		font-size: 0.64rem;
		color: #f0ede8;
		flex: 1;
	}
	.check-label.done {
		text-decoration: line-through;
		color: rgba(240, 237, 232, 0.4);
	}
	.check-pts {
		font-size: 0.5rem;
		color: rgba(240, 237, 232, 0.5);
		flex-shrink: 0;
	}
	.check-pts.earned {
		color: #c9a84c;
		font-weight: 600;
	}
</style>
