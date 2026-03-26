<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import gsap from 'gsap';

	let { data, children } = $props();

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

<style lang="scss">
	/* ── Shell transparent (ne casse pas le layout) ─────────── */
	.page-shell {
		display: contents;
	}
</style>
