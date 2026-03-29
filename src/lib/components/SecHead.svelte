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
</style>
