<script lang="ts">
	export let title: string;
	export let sub: string = '';
</script>

<div class="sec-head">
	<div class="sh-title">{title}</div>
	{#if sub}
		<div class="sh-sub">{sub}</div>
	{/if}
</div>

<style>
	.sec-head {
		padding: 12px 18px 8px;
		border-bottom: 1px solid rgba(201, 168, 76, 0.15);
	}
	.sh-title {
		font-size: 0.72rem;
		font-weight: 600;
		color: #f0ede8;
		font-family: 'Bebas Neue', sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.sh-sub {
		font-size: 0.56rem;
		color: #c9a84c;
		margin-top: 2px;
		font-family: 'DM Sans', sans-serif;
	}
</style>
