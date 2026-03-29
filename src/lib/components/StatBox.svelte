<script lang="ts">
	export let value: string | number;
	export let label: string;
</script>

<div class="stat-box">
	<div class="sb-val">{value}</div>
	<div class="sb-lbl">{label}</div>
</div>

<style>
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
