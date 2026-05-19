<script lang="ts">
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import type { PageProps } from './$types';
	import {
		CreditCard,
		AlertCircle,
		CheckCircle,
		XCircle,
		LayoutDashboard,
		UtensilsCrossed,
		Dumbbell
	} from 'lucide-svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data }: PageProps = $props();

	type OfferRow = { id: string; slug: string; name: string; amountCentsMonthly: number; amountCentsAnnual: number };
	type PlanInfo = { amountCents: number; label: string; description: string };

	const offers = $derived((data as unknown as { offers?: OfferRow[] })?.offers ?? []);
	const SUBSCRIPTION_PLANS = $derived((data as unknown as { SUBSCRIPTION_PLANS?: Record<string, PlanInfo> })?.SUBSCRIPTION_PLANS ?? {});

	let selectedOfferSlugs = $state<string[]>([]);

	const offerMeta: Record<string, { icon: typeof UtensilsCrossed; blurb: string }> = {
		nutrition: {
			icon: UtensilsCrossed,
			blurb: 'Planning repas personnalisé, courses et suivi nutritionnel.'
		},
		sport: {
			icon: Dumbbell,
			blurb: 'Séances vidéo, programme hebdomadaire et suivi sportif.'
		}
	};

	function toggleOffer(slug: string) {
		if (selectedOfferSlugs.includes(slug)) {
			selectedOfferSlugs = selectedOfferSlugs.filter((s) => s !== slug);
		} else {
			selectedOfferSlugs = [...selectedOfferSlugs, slug];
		}
	}

	const plan = $derived.by(() => {
		const base = (SUBSCRIPTION_PLANS as Record<string, PlanInfo>).quarterly;
		if (!base || selectedOfferSlugs.length === 0) return null;
		const selected = offers.filter((p) => selectedOfferSlugs.includes(p.slug));
		const quarterlyCents = selected.reduce((s, p) => s + p.amountCentsMonthly * 3, 0);
		const labels = selected.map((p) => p.name).join(' + ');
		return {
			...base,
			amountCents: quarterlyCents,
			description: `Accompagnement Thower — ${labels} — 3 mois.`
		};
	});

	const canCheckout = $derived(selectedOfferSlugs.length > 0 && plan !== null);

	const success = $derived($page.url.searchParams.get('success') === '1');
	const canceled = $derived($page.url.searchParams.get('canceled') === '1');
	const errorMessage = $derived($page.form?.message);
	const hasValidPayment = $derived((data as unknown as { hasValidPayment?: boolean })?.hasValidPayment ?? false);
	const subscriptionEndsAt = $derived((data as unknown as { subscriptionEndsAt?: string | Date | null })?.subscriptionEndsAt ?? null);
	const entitlements = $derived((data as unknown as { entitlements?: { nutrition: boolean; sport: boolean } })?.entitlements ?? { nutrition: false, sport: false });
	const subscriptionLabel = $derived(
		subscriptionEndsAt
			? new Date(subscriptionEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
			: null
	);
	const formatPrice = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

	function quarterlyPrice(offer: OfferRow) {
		return offer.amountCentsMonthly * 3;
	}
</script>

<div class="container mx-auto max-w-2xl px-4 py-8 pb-[100px]">
	<h1 class="titleHome mb-8 text-3xl font-bold tracking-tight">Souscription</h1>

	{#if success}
		<Card.Root class="border-green-500/50 bg-green-500/5 mb-6">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-green-700 dark:text-green-400">
					<CheckCircle class="w-6 h-6" />
					<span>Paiement réussi</span>
				</Card.Title>
				<Card.Description>
					Merci pour votre souscription. Votre accompagnement Thower est actif. Vous pouvez maintenant commencer votre programme.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button href="/user" class="w-full gap-2">
					<LayoutDashboard class="w-4 h-4" />
					Accéder à l'application
				</Button>
			</Card.Content>
		</Card.Root>
	{:else if canceled}
		<Card.Root class="border-muted">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<XCircle class="w-6 h-6" />
					<span>Paiement annulé</span>
				</Card.Title>
				<Card.Description>
					Vous avez annulé le paiement. Vous pouvez réessayer quand vous le souhaitez.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else if errorMessage}
		<Card.Root class="border-destructive/50 bg-destructive/5">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<AlertCircle class="w-6 h-6" />
					<span>Erreur</span>
				</Card.Title>
				<Card.Description>{errorMessage}</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}

	{#if !success}
		{#if hasValidPayment && subscriptionLabel}
			<Card.Root class="border-green-500/50 bg-green-500/5 mb-4">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-green-700 dark:text-green-400">
						<CheckCircle class="w-6 h-6" />
						<span>Accès actif</span>
					</Card.Title>
					<Card.Description>
						Votre accompagnement est valide jusqu'au <strong>{subscriptionLabel}</strong>. Un paiement ci-dessous prolongera votre accès à partir de cette date (pas de perte de jours).
					</Card.Description>
				</Card.Header>
			</Card.Root>
		{/if}

		{#if hasValidPayment}
			<Card.Root class="border-muted mb-4">
				<Card.Header>
					<Card.Title class="text-sm font-medium">Programmes inclus</Card.Title>
				</Card.Header>
				<Card.Content class="flex gap-3 pt-0">
					<div class="flex items-center gap-2 rounded-lg border px-3 py-2 {entitlements.nutrition ? 'border-green-500/50 bg-green-500/5' : 'border-muted bg-muted/30 opacity-50'}">
						{#if entitlements.nutrition}
							<CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
						{:else}
							<XCircle class="w-4 h-4 text-muted-foreground flex-shrink-0" />
						{/if}
						<span class="text-sm font-medium">Nutrition</span>
					</div>
					<div class="flex items-center gap-2 rounded-lg border px-3 py-2 {entitlements.sport ? 'border-green-500/50 bg-green-500/5' : 'border-muted bg-muted/30 opacity-50'}">
						{#if entitlements.sport}
							<CheckCircle class="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
						{:else}
							<XCircle class="w-4 h-4 text-muted-foreground flex-shrink-0" />
						{/if}
						<span class="text-sm font-medium">Sport</span>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<CreditCard class="w-6 h-6 text-primary" />
					<span>{hasValidPayment ? "Renouveler à l'avance" : 'Choisissez vos programmes'}</span>
				</Card.Title>
				<Card.Description>
					{hasValidPayment
						? 'Sélectionnez Nutrition et/ou Sport pour prolonger votre accès de 3 mois. Paiement sécurisé par Stripe.'
						: 'Sélectionnez au moins un programme. Chaque programme est à 250 € pour 3 mois. Paiement sécurisé par Stripe.'}
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-3">
					<p class="text-sm font-medium">Programmes disponibles</p>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each offers as offer (offer.slug)}
							{@const selected = selectedOfferSlugs.includes(offer.slug)}
							{@const meta = offerMeta[offer.slug]}
							{@const Icon = meta?.icon ?? CreditCard}
							<button
								type="button"
								class="flex w-full flex-col rounded-xl border-2 p-4 text-left transition-colors {selected
									? 'border-primary bg-primary/5'
									: 'border-muted bg-card hover:border-primary/40 hover:bg-accent/30'}"
								onclick={() => toggleOffer(offer.slug)}
							>
								<div class="mb-3 flex items-start justify-between gap-2">
									<div class="flex items-center gap-2">
										<Icon class="h-5 w-5 text-primary" />
										<span class="font-semibold">{offer.name}</span>
									</div>
									<div
										class="flex h-5 w-5 shrink-0 items-center justify-center rounded border {selected
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input bg-background'}"
									>
										{#if selected}
											<CheckCircle class="h-3.5 w-3.5" />
										{/if}
									</div>
								</div>
								<p class="mb-3 text-sm text-muted-foreground">{meta?.blurb ?? offer.name}</p>
								<p class="text-2xl font-bold text-primary">{formatPrice(quarterlyPrice(offer))}</p>
								<p class="text-xs text-muted-foreground">pour 3 mois</p>
							</button>
						{/each}
					</div>
				</div>

				<form method="POST" action="?/createCheckout" use:enhance class="rounded-lg border-2 border-primary/50 bg-card p-6">
					<input type="hidden" name="selectedOfferSlugs" value={JSON.stringify(selectedOfferSlugs)} />
					{#if plan}
						<div class="mb-4 text-center">
							<div class="text-4xl font-bold text-primary">{formatPrice(plan.amountCents)}</div>
							<div class="mt-1 text-muted-foreground">total pour 3 mois</div>
							<p class="mt-2 text-sm text-muted-foreground">{plan.description}</p>
						</div>
					{:else}
						<p class="mb-4 text-center text-sm text-muted-foreground">
							Sélectionnez Nutrition et/ou Sport pour voir le total.
						</p>
					{/if}
					<Button type="submit" class="w-full gap-2 text-base" disabled={!canCheckout}>
						<CreditCard class="w-5 h-5" />
						{hasValidPayment ? 'Renouveler pour 3 mois' : 'Commencer — 3 mois'}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style lang="scss">
	.titleHome {
		font-family: 'Open Sans Variable', sans-serif;
		font-style: italic;
		font-size: 50px;
		margin-bottom: 12px;
		margin-top: 20px;
		-webkit-text-stroke: 1px black;
		color: transparent;
		text-transform: uppercase;
		font-weight: 900;
	}
</style>
