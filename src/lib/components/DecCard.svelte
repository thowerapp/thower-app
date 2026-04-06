<script lang="ts">
	export let title: string;
	export let sub: string = '';
	export let count: string = '';
	export let href: string = '#';
</script>

<a class="dec-card" href={href}>
	<div class="dec-icon">
		<slot name="icon" />
	</div>
	<div class="dec-body">
		<div class="dec-title">{title}</div>
		{#if sub}<div class="dec-sub">{sub}</div>{/if}
		{#if count}<div class="dec-count">{count}</div>{/if}
	</div>
	<div class="arrow-right"></div>
</a>

<style>
	.dec-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px 18px;
		border-bottom: 1px solid rgba(240, 237, 232, 0.08);
		cursor: pointer;
		text-decoration: none;
		transition: background 0.1s;
	}
	.dec-card:hover {
		background: rgba(201, 168, 76, 0.05);
	}
	.dec-icon {
		width: 44px;
		height: 44px;
		background: #c9a84c;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dec-body {
		flex: 1;
	}
	.dec-title {
		font-size: 0.78rem;
		font-weight: 600;
		color: #f0ede8;
	}
	.dec-sub {
		font-size: 0.58rem;
		color: rgba(240, 237, 232, 0.6);
		margin-top: 3px;
	}
	.dec-count {
		font-size: 0.5rem;
		color: #3ab8b8;
		margin-top: 2px;
	}
	.arrow-right {
		width: 6px;
		height: 6px;
		border-right: 1.5px solid #c9a84c;
		border-top: 1.5px solid #c9a84c;
		transform: rotate(45deg);
		flex-shrink: 0;
	}
</style>
