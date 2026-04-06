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
		background: rgba(201, 168, 76, 0.1);
		border: 1px solid #c9a84c;
		padding: 10px 6px;
		text-align: center;
	}
	.sb-val {
		font-size: 1rem;
		font-weight: 700;
		color: #f0ede8;
	}
	.sb-lbl {
		font-size: 0.5rem;
		color: #c9a84c;
		margin-top: 2px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: 'DM Sans', sans-serif;
	}
</style>
