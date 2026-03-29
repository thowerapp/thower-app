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
		border-bottom: 1px solid #f0f0f0;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.1s;
	}
	.dec-card:hover {
		background: #fafafa;
	}
	.dec-icon {
		width: 44px;
		height: 44px;
		background: #111;
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
		color: #111;
	}
	.dec-sub {
		font-size: 0.58rem;
		color: #aaa;
		margin-top: 3px;
	}
	.dec-count {
		font-size: 0.5rem;
		color: #bbb;
		margin-top: 2px;
	}
	.arrow-right {
		width: 6px;
		height: 6px;
		border-right: 1.5px solid #bbb;
		border-top: 1.5px solid #bbb;
		transform: rotate(45deg);
		flex-shrink: 0;
	}
</style>
