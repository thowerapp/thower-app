<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import gsap from 'gsap';
	import { House, Ruler, CreditCard, Settings2, LogOut } from 'lucide-svelte';

	let { data, children } = $props();

	const AUTH_FLOW_PREFIXES = [
		'/auth/login',
		'/auth/signup',
		'/auth/verify-email',
		'/auth/forgot-password',
		'/auth/reset-password',
		'/auth/recovery-code'
	];

	const showNav = $derived(
		!!data.user &&
			!AUTH_FLOW_PREFIXES.some((p) => page.url.pathname.startsWith(p)) &&
			!(page.url.pathname === '/auth/2fa' || page.url.pathname.startsWith('/auth/2fa/reset'))
	);

	const tabs = [
		{ href: '/auth', label: 'Accueil', icon: House, exact: true },
		{ href: '/auth/measurement', label: 'Mesures', icon: Ruler, exact: false },
		{ href: '/auth/subscription', label: 'Abonnement', icon: CreditCard, exact: false },
		{ href: '/auth/account', label: 'Compte', icon: Settings2, exact: false }
	];

	function isActive(tab: { href: string; exact: boolean }): boolean {
		if (tab.exact) return page.url.pathname === tab.href;
		return page.url.pathname.startsWith(tab.href);
	}

	function portal(node: HTMLElement) {
		if (!browser) return {};
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}

	// ── Transitions de page GSAP ───────────────────────────────
	let pageEl: HTMLElement | null = $state(null);

	function rm(): boolean {
		if (!browser) return true;
		return matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/**
	 * Collecteur récursif de "blocs-feuilles" :
	 * descend dans le DOM jusqu'aux premiers éléments qui méritent d'être
	 * animés comme une unité (Card, heading, paragraphe, bouton, lien…).
	 * Les wrappers purs (div sans sémantique) sont traversés, pas animés.
	 */
	function collectBlocks(node: Element, depth: number, out: Element[]): void {
		if (out.length >= 18) return;
		const el = node as HTMLElement;

		// Ignorer : inputs cachés, aria-hidden, éléments sans présence visuelle
		if ((el as HTMLInputElement).type === 'hidden') return;
		if (el.getAttribute('aria-hidden') === 'true') return;
		if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;

		const kids = Array.from(node.children).filter(
			(c) =>
				(c as HTMLInputElement).type !== 'hidden' &&
				c.getAttribute('aria-hidden') !== 'true' &&
				(c as HTMLElement).tagName !== 'SCRIPT'
		);

		// Critères pour traiter ce nœud comme un bloc-feuille atomique
		const isUnit =
			// shadcn Card/Tabs/Separator/Badge…
			node.hasAttribute('data-slot') ||
			// Titres
			/^H[1-6]$/.test(node.tagName) ||
			// Paragraphes, labels, boutons, liens standalone
			node.tagName === 'P' ||
			node.tagName === 'BUTTON' ||
			node.tagName === 'A' ||
			node.tagName === 'LABEL' ||
			// Vrais nœuds feuilles
			kids.length === 0 ||
			// Éléments spécifiques du wizard
			el.classList.contains('step-heading') ||
			el.classList.contains('activity-card') ||
			el.classList.contains('radio-card') ||
			el.classList.contains('objective-chip') ||
			el.classList.contains('equipment-chip') ||
			el.classList.contains('slider-block') ||
			el.classList.contains('intro-steps-preview') ||
			el.classList.contains('wizard-nav') ||
			// À partir d'une certaine profondeur, bloc compact = unité
			(depth >= 5 && kids.length <= 3);

		if (isUnit) {
			out.push(node);
		} else {
			for (const kid of kids) {
				collectBlocks(kid, depth + 1, out);
			}
		}
	}

	function staggerTargets(): Element[] {
		if (!pageEl) return [];
		const out: Element[] = [];
		for (const root of Array.from(pageEl.children)) {
			collectBlocks(root, 0, out);
		}
		return out;
	}

	beforeNavigate(() => {
		if (rm()) return;
		const t = staggerTargets();
		if (!t.length) return;
		gsap.killTweensOf(t);
		// Sortie rapide en cascade : chaque bloc part légèrement vers le haut
		gsap.to(t, {
			opacity: 0,
			y: -10,
			scale: 0.975,
			duration: 0.13,
			stagger: { each: 0.018, from: 'start' },
			ease: 'power2.in',
			overwrite: true
		});
	});

	afterNavigate(async () => {
		await tick();
		const t = staggerTargets();
		if (!t.length) return;
		if (rm()) {
			gsap.set(t, { clearProps: 'all' });
			return;
		}
		// Entrée : cascade douce du haut vers le bas, chaque unité monte en place
		gsap.fromTo(
			t,
			{ opacity: 0, y: 20, scale: 0.982 },
			{
				opacity: 1,
				y: 0,
				scale: 1,
				duration: 0.46,
				stagger: { each: 0.042, from: 'start' },
				ease: 'power3.out',
				clearProps: 'transform,opacity,scale'
			}
		);
	});
</script>

<div bind:this={pageEl} class="page-shell">
	{@render children()}
</div>

{#if showNav}
	<nav use:portal class="bottom-nav" aria-label="Navigation principale">
		<!-- 4 onglets principaux -->
		{#each tabs as tab}
			<a
				href={tab.href}
				class="nav-item"
				class:is-active={isActive(tab)}
				aria-current={isActive(tab) ? 'page' : undefined}
			>
				<span class="icon-shell">
					{#if isActive(tab)}<span class="active-bg" aria-hidden="true"></span>{/if}
					<tab.icon class="icon" />
				</span>
				<span class="label">{tab.label}</span>
			</a>
		{/each}

		<!-- Séparateur vertical -->
		<span class="sep" aria-hidden="true"></span>

		<!-- Déconnexion -->
		<form
			method="POST"
			action="/auth/signout"
			use:enhance={() => async () => { await goto('/auth/login'); }}
			class="logout-form"
		>
			<button type="submit" class="nav-item logout-btn" aria-label="Se déconnecter">
				<span class="icon-shell">
					<LogOut class="icon" />
				</span>
				<span class="label">Sortir</span>
			</button>
		</form>
	</nav>
{/if}

<style lang="scss">
	/* ── Shell transparent (ne casse pas le layout) ─────────── */
	.page-shell {
		display: contents;
	}

	/* ── Conteneur principal ──────────────────────────────── */
	:global(.bottom-nav) {
		position: fixed !important;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 9999;
		display: flex;
		align-items: stretch;
		/* hauteur fixe + safe area iPhone (notch bas) */
		height: calc(64px + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: color-mix(in oklch, var(--background) 88%, transparent);
		backdrop-filter: blur(24px) saturate(1.8);
		-webkit-backdrop-filter: blur(24px) saturate(1.8);
		border-top: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
		box-shadow: 0 -8px 32px color-mix(in oklch, var(--foreground) 5%, transparent);
	}

	/* ── Onglet générique ─────────────────────────────────── */
	:global(.bottom-nav .nav-item) {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		text-decoration: none;
		color: var(--muted-foreground);
		background: none;
		border: none;
		cursor: pointer;
		font: inherit;
		padding: 0 4px;
		min-width: 0;
		transition: color 0.15s ease;
		-webkit-tap-highlight-color: transparent;
		user-select: none;

		&:active {
			scale: 0.92;
		}
	}

	:global(.bottom-nav .nav-item.is-active) {
		color: var(--primary);
	}

	/* ── Icône + pill d'activation ────────────────────────── */
	:global(.bottom-nav .icon-shell) {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
	}

	:global(.bottom-nav .active-bg) {
		position: absolute;
		inset: 0;
		border-radius: 12px;
		background: color-mix(in oklch, var(--primary) 14%, transparent);
		animation: pill-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes pill-in {
		from { transform: scale(0.5); opacity: 0; }
		to   { transform: scale(1);   opacity: 1; }
	}

	:global(.bottom-nav .icon) {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		position: relative;
		z-index: 1;
	}

	/* ── Label ────────────────────────────────────────────── */
	:global(.bottom-nav .label) {
		font-size: 0.58rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
		line-height: 1;
	}

	/* ── Séparateur ───────────────────────────────────────── */
	:global(.bottom-nav .sep) {
		width: 1px;
		margin: 12px 0;
		background: var(--border);
		flex-shrink: 0;
		align-self: stretch;
	}

	/* ── Bouton déconnexion ───────────────────────────────── */
	:global(.bottom-nav .logout-form) {
		display: flex;
		flex: 0 0 64px;
	}

	:global(.bottom-nav .logout-btn) {
		width: 100%;
		color: color-mix(in oklch, var(--destructive) 65%, var(--muted-foreground));
		transition: color 0.15s ease, scale 0.1s;

		&:hover {
			color: var(--destructive);
		}

		&:active {
			color: var(--destructive);
			scale: 0.88;
		}
	}
</style>
