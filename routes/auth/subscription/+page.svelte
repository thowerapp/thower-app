<script lang="ts">
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import type { PageProps } from './$types';
	import { CreditCard, Ruler, AlertCircle, CheckCircle, XCircle } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { data }: PageProps = $props();

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
	type PlansData = { monthly?: { amountCents: number; label: string; description: string }; annual?: { amountCents: number; label: string; description: string } };
	const plans = $derived((data as unknown as { plans?: PlansData })?.plans ?? ({} as PlansData));
	const formatPrice = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
</script>

<div class="container mx-auto max-w-2xl px-4 py-8 pb-[100px]">
	<h1 class="titleHome mb-8 text-3xl font-bold tracking-tight">Souscription</h1>

	{#if success}
		<Card.Root class="border-green-500/50 bg-green-500/5">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-green-700 dark:text-green-400">
					<CheckCircle class="w-6 h-6" />
					<span>Paiement réussi</span>
				</Card.Title>
				<Card.Description>
					Merci pour votre souscription. Votre accompagnement Thower est actif. Vous pouvez accéder à l'app depuis vos paramètres.
				</Card.Description>
			</Card.Header>
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

	{#if !data.hasMeasurements}
		<Card.Root class="border-amber-500/50 bg-amber-500/5">
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-amber-700 dark:text-amber-400">
					<AlertCircle class="w-6 h-6" />
					<span>Profil physique requis</span>
				</Card.Title>
				<Card.Description class="text-base">
					Pour continuer vers le paiement et souscrire à l'accompagnement Thower, nous avons besoin de
					vos mesures et de votre profil physique. Cela permet à votre coach d'adapter votre programme
					dès le premier jour.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-muted-foreground">
					Rendez-vous sur la page <strong>Mon profil physique</strong> pour enregistrer au moins une
					fiche (âge, taille, poids, objectifs, etc.). Une fois vos données enregistrées, vous
					pourrez revenir ici et procéder au paiement.
				</p>
				<Button href="/auth/measurement" class="w-full gap-2">
					<Ruler class="w-4 h-4" />
					Remplir mon profil physique
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
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
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-muted-foreground">
					{hasValidPayment
						? 'Votre accès sera prolongé à partir de la date de fin actuelle.'
						: 'Votre profil physique est à jour. Sélectionnez une offre puis procédez au paiement.'}
				</p>
				<div class="grid gap-3 sm:grid-cols-2">
					{#if plans.monthly}
						<form method="POST" action="?/createCheckout" use:enhance class="rounded-lg border bg-card p-4">
							<input type="hidden" name="plan" value="monthly" />
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
