<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	export let data: LayoutData;

	$: currentTab = getTabFromRoute($page.url.pathname);
	$: isNutritionRoute = $page.url.pathname.includes('/nutrition');

	function getTabFromRoute(pathname: string): string {
		if (pathname.includes('/decouverte')) return 'decouverte';
		if (pathname.includes('/journee')) return 'journee';
		if (pathname.includes('/progression')) return 'progression';
		if (pathname.includes('/parametres')) return 'parametres';
		return 'home';
	}
</script>

<div class="screen">

	<!-- Status bar -->
	<div class="sbar"></div>

	<!-- Hero - Hidden on nutrition routes -->
	{#if !isNutritionRoute}
		<div class="hero">
			<div class="hero-top">
				<div class="hero-brand">
					<div class="hero-title">Thower</div>
					<div class="hero-sub">Semaine 4 · Jour 21</div>
				</div>
				<div class="hero-right">
					<div class="logo-shape">
						<svg viewBox="0 0 44 38" fill="none">
							<polygon points="22,2 42,36 2,36" fill="#222" />
							<polygon points="22,2 42,36 22,24" fill="#333" />
						</svg>
					</div>
					<div class="profile-btn">
						<div class="sq"></div>
						<div class="notif-dot"></div>
					</div>
				</div>
			</div>
			<div class="hero-pills">
				<div class="hero-pill">Aujourd'hui</div>
				<div class="hero-pill">Profil</div>
			</div>
		</div>
	{/if}

	<!-- Page content -->
	<div class="scroll">
		<slot />
	</div>

	<!-- Bottom nav -->
	<div class="bottom-nav">
		<div class="nav-tabs">
			<a href="/user/decouverte" class="nav-i" class:on={currentTab === 'decouverte'}>
				<div class="nav-dot"></div>
				<div class="nl">Découverte</div>
				<div class="ni-bar"></div>
			</a>
			<a href="/user/journee" class="nav-i" class:on={currentTab === 'journee'}>
				<div class="nav-dot"></div>
				<div class="nl">Journée</div>
				<div class="ni-bar"></div>
			</a>
			<a href="/user/progression" class="nav-i" class:on={currentTab === 'progression'}>
				<div class="nav-dot"></div>
				<div class="nl">Progression</div>
				<div class="ni-bar"></div>
			</a>
			<a href="/user/parametres" class="nav-i" class:on={currentTab === 'parametres'}>
				<div class="nav-dot"></div>
				<div class="nl">Paramètres</div>
				<div class="ni-bar"></div>
			</a>
		</div>
	</div>

</div>

<style>
	*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

	:global(body) {
		font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #0a0a0a;
		min-height: 100dvh;
		color: #f0ede8;
	}

	.screen {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		background: #0a0a0a;
	}

	.sbar {
		padding: 28px 20px 0;
		display: flex;
		justify-content: space-between;
		font-size: 0.52rem;
		color: #3ab8b8;
		flex-shrink: 0;
		background: #0a0a0a;
	}

	.hero {
		background: #0a0a0a;
		padding: 10px 18px 24px;
		flex-shrink: 0;
		min-height: 320px;
	}
	.hero-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}
	.hero-brand {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.hero-title {
		font-size: 1.6rem;
		font-weight: 700;
		color: #f0ede8;
		letter-spacing: -0.03em;
		line-height: 1;
		font-family: 'Bebas Neue', sans-serif;
		text-transform: uppercase;
	}
	.hero-sub {
		font-size: 0.6rem;
		color: #c9a84c;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-family: 'DM Sans', sans-serif;
		font-weight: 500;
	}
	.hero-right {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}
	.logo-shape {
		width: 44px;
		height: 38px;
	}
	.logo-shape svg {
		width: 100%;
		height: 100%;
	}
	.profile-btn {
		width: 32px;
		height: 32px;
		background: rgba(58, 184, 184, 0.1);
		border: 1px solid #3ab8b8;
		cursor: pointer;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}
	.profile-btn .sq {
		width: 12px;
		height: 12px;
		background: #c9a84c;
	}
	.profile-btn .notif-dot {
		position: absolute;
		top: -3px;
		right: -3px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #f0ede8;
		border: 1.5px solid #0a0a0a;
	}
	.hero-pills {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.hero-pill {
		padding: 5px 12px;
		border: 1px solid #c9a84c;
		color: #c9a84c;
		background: transparent;
		cursor: pointer;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.6rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		font-weight: 500;
	}

	.scroll {
		flex: 1;
		overflow-y: auto;
		background: #0a0a0a;
		min-height: 0;
	}

	.bottom-nav {
		display: flex;
		align-items: center;
		padding: 8px 0;
		padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
		border-top: 1px solid rgba(201, 168, 76, 0.15);
		background: #0a0a0a;
		flex-shrink: 0;
	}
	.nav-tabs {
		display: flex;
		justify-content: space-around;
		flex: 1;
	}
	.nav-i {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		cursor: pointer;
		padding: 4px 8px;
		flex: 1;
		text-decoration: none;
		color: inherit;
	}
	.nav-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(240, 237, 232, 0.2);
	}
	.nav-i.on .nav-dot {
		background: #c9a84c;
	}
	.nl {
		font-size: 0.38rem;
		color: rgba(240, 237, 232, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		text-align: center;
		font-family: 'DM Sans', sans-serif;
	}
	.nav-i.on .nl {
		color: #c9a84c;
		font-weight: 600;
	}	.ni-bar {
		width: 20px;
		height: 1.5px;
		background: transparent;
		margin-top: 1px;
	}
	.nav-i.on .ni-bar {
		background: #c9a84c;
	}
</style>
