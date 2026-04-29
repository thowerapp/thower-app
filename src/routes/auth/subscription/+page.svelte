<script lang="ts">
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import type { PageProps } from './$types';
	import { CreditCard, Ruler, AlertCircle, CheckCircle, XCircle, LayoutDashboard } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data }: PageProps = $props();

	type OfferRow = { id: string; slug: string; name: string; amountCentsMonthly: number; amountCentsAnnual: number };
	type PlanInfo = { amountCents: number; label: string; description: string };
	type PlansData = { monthly?: PlanInfo; annual?: PlanInfo };

	const offers = $derived((data as unknown as { offers?: OfferRow[] })?.offers ?? []);
	const defaultPlans = $derived((data as unknown as { defaultPlans?: PlansData })?.defaultPlans ?? ({} as PlansData));
	const SUBSCRIPTION_PLANS = $derived((data as unknown as { SUBSCRIPTION_PLANS?: PlansData })?.SUBSCRIPTION_PLANS ?? {});

	let selectedOfferSlugs = $state<string[]>([]);

	function toggleOffer(slug: string) {
		if (selectedOfferSlugs.includes(slug)) {
			selectedOfferSlugs = selectedOfferSlugs.filter((s) => s !== slug);
		} else {
			selectedOfferSlugs = [...selectedOfferSlugs, slug];
		}
	}

	const plans = $derived.by(() => {
		const base = SUBSCRIPTION_PLANS as Record<string, PlanInfo>;
		if (selectedOfferSlugs.length === 0) {
			return {
				monthly: defaultPlans.monthly ?? base.monthly,
				annual: defaultPlans.annual ?? base.annual
			};
		}
		const selected = offers.filter((p) => selectedOfferSlugs.includes(p.slug));
		const monthlyCents = selected.reduce((s, p) => s + p.amountCentsMonthly, 0);
		const annualCents = selected.reduce((s, p) => s + p.amountCentsAnnual, 0);
		return {
			monthly: base.monthly
				? { ...base.monthly, amountCents: monthlyCents || (defaultPlans.monthly?.amountCents ?? base.monthly.amountCents) }
				: undefined,
			annual: base.annual
				? { ...base.annual, amountCents: annualCents || (defaultPlans.annual?.amountCents ?? base.annual.amountCents) }
				: undefined
		};
	});

	const success = $derived($page.url.searchParams.get('success') === '1');
	const canceled = $derived($page.url.searchParams.get('canceled') === '1');
	const errorMessage = $derived($page.form?.message);
	const hasValidPayment = $derived((data as unknown as { hasValidPayment?: boolean })?.hasValidPayment ?? false);
	const subscriptionEndsAt = $derived((data as unknown as { subscriptionEndsAt?: string | Date | null })?.subscriptionEndsAt ?? null);
	const subscriptionLabel = $derived(
		subscriptionEndsAt
			? new Date(subscriptionEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
			: null
	);
	const formatPrice = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
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
			<Card.Root class="border-green-500/50 bg-green-500/5">
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

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<CreditCard class="w-6 h-6 text-primary" />
					<span>{hasValidPayment ? "Renouveler à l'avance" : 'Paiement sécurisé'}</span>
				</Card.Title>
				<Card.Description>
					{hasValidPayment
						? 'Choisissez une formule pour prolonger votre accès. Paiement sécurisé par Stripe.'
						: 'Choisissez votre formule. Paiement sécurisé par Stripe.'}
					Sélectionnez une ou plusieurs offres ci-dessous : le tarif s'adapte à votre choix.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if offers.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">Offres</p>
						<div class="flex flex-wrap gap-3">
							{#each offers as offer}
								<label class="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 cursor-pointer hover:bg-accent/50">
									<input
										type="checkbox"
										checked={selectedOfferSlugs.includes(offer.slug)}
										onchange={() => toggleOffer(offer.slug)}
										class="h-4 w-4 rounded border-input"
									/>
									<span>{offer.name}</span>
									<span class="text-muted-foreground text-sm">
										{formatPrice(offer.amountCentsMonthly)}/mois — {formatPrice(offer.amountCentsAnnual)}/an
									</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}
				<p class="text-muted-foreground">
					{hasValidPayment
						? 'Votre accès sera prolongé à partir de la date de fin actuelle.'
						: 'Sélectionnez une ou plusieurs offres puis choisissez la formule (mensuel ou annuel).'}
				</p>
				<div class="grid gap-3 sm:grid-cols-2">
					{#if plans.monthly}
						<form method="POST" action="?/createCheckout" use:enhance class="rounded-lg border bg-card p-4">
							<input type="hidden" name="plan" value="monthly" />
							<input type="hidden" name="selectedOfferSlugs" value={JSON.stringify(selectedOfferSlugs)} />
							<div class="mb-3">
								<div class="font-semibold">{plans.monthly.label}</div>
								<div class="text-2xl font-bold text-primary">{formatPrice(plans.monthly.amountCents)}<span class="text-sm font-normal text-muted-foreground">/mois</span></div>
								<p class="mt-1 text-sm text-muted-foreground">{plans.monthly.description}</p>
							</div>
							<Button type="submit" class="w-full gap-2" variant="outline">
								<CreditCard class="w-4 h-4" />
								{hasValidPayment ? 'Renouveler (mensuel)' : 'Choisir mensuel'}
							</Button>
						</form>
					{/if}
					{#if plans.annual}
						<form method="POST" action="?/createCheckout" use:enhance class="rounded-lg border-2 border-primary/50 bg-card p-4">
							<input type="hidden" name="plan" value="annual" />
							<input type="hidden" name="selectedOfferSlugs" value={JSON.stringify(selectedOfferSlugs)} />
							<div class="mb-3">
								<span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Avantageux</span>
								<div class="mt-2 font-semibold">{plans.annual.label}</div>
								<div class="text-2xl font-bold text-primary">{formatPrice(plans.annual.amountCents)}<span class="text-sm font-normal text-muted-foreground">/an</span></div>
								<p class="mt-1 text-sm text-muted-foreground">{plans.annual.description}</p>
							</div>
							<Button type="submit" class="w-full gap-2">
								<CreditCard class="w-4 h-4" />
								{hasValidPayment ? 'Renouveler (annuel)' : 'Choisir annuel'}
							</Button>
						</form>
					{/if}
				</div>
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
