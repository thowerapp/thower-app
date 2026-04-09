<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="hero">
	<div class="hero-brand">
		<div class="hero-title">Paramètres</div>
		<div class="hero-sub">Compte & préférences</div>
	</div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-square-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Profil & Données</div>
		<div class="li-sub">Objectif · Mesures · Allergies</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-circle-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Ma checklist journalière</div>
		<div class="li-sub">Activer / désactiver les tâches</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-square-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Abonnement</div>
		<div class="li-sub">Plan actif</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-circle-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Notifications</div>
		<div class="li-sub">Rappels séances · Horaires</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<div class="list-item">
	<div class="li-thumb"><div class="shape-square-sm"></div></div>
	<div class="li-body">
		<div class="li-title">Langue</div>
		<div class="li-sub">Français</div>
	</div>
	<div class="li-right"><div class="arrow-right"></div></div>
</div>

<style>
	.hero {
		background: #111;
		padding: 20px 18px;
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

	.list-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 11px 18px;
		border-bottom: 1px solid #f0f0f0;
		cursor: pointer;
		transition: background 0.1s;
	}

	.list-item:hover {
		background: #fafafa;
	}

	.li-thumb {
		width: 36px;
		height: 36px;
		background: #e8e8e8;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.li-body {
		flex: 1;
		min-width: 0;
	}

	.li-title {
		font-size: 0.7rem;
		font-weight: 500;
		color: #111;
	}

	.li-sub {
		font-size: 0.55rem;
		color: #aaa;
		margin-top: 2px;
	}

	.li-right {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.arrow-right {
		width: 6px;
		height: 6px;
		border-right: 1.5px solid #bbb;
		border-top: 1.5px solid #bbb;
		transform: rotate(45deg);
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
</style>
