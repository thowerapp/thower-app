<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	export let data: LayoutData;

	$: currentTab = getTabFromRoute($page.url.pathname);

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

	<!-- Hero -->
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
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #fff;
		min-height: 100dvh;
	}

	.screen {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		background: #fff;
	}

	.sbar {
		padding: 28px 20px 0;
		display: flex;
		justify-content: space-between;
		font-size: 0.52rem;
		color: #666;
		flex-shrink: 0;
		background: #111;
	}

	.hero {
		background: #111;
		padding: 10px 18px 18px;
		flex-shrink: 0;
		min-height: 250px;
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
		background: #2a2a2a;
		border: 1px solid #3a3a3a;
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
		background: #666;
	}
	.profile-btn .notif-dot {
		position: absolute;
		top: -3px;
		right: -3px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #fff;
		border: 1.5px solid #111;
	}
	.hero-pills {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.hero-pill {
		padding: 5px 12px;
		border: 1px solid #333;
		color: #aaa;
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.6rem;
		letter-spacing: 0.03em;
	}

	.scroll {
		flex: 1;
		overflow-y: auto;
		background: #fff;
	}

	.bottom-nav {
		display: flex;
		align-items: center;
		padding: 8px 0;
		padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
		border-top: 1px solid #eee;
		background: #fff;
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
		background: #ddd;
	}
	.nav-i.on .nav-dot {
		background: #111;
	}
	.nl {
		font-size: 0.38rem;
		color: #bbb;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		text-align: center;
	}
	.nav-i.on .nl {
		color: #111;
		font-weight: 600;
	}
	.ni-bar {
		width: 20px;
		height: 1.5px;
		background: transparent;
		margin-top: 1px;
	}
	.nav-i.on .ni-bar {
		background: #111;
	}
</style>
