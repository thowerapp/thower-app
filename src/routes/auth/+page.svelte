<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import {
		UserCircle,
		ReceiptText,
		Ruler,
		CreditCard,
		Smartphone,
		Bell,
		LayoutDashboard,
		Download,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
	import { pwaInstallPrompt } from '$lib/store/pwaInstallStore';
	import {
		showTestNotification,
		isNotificationSupported,
		getNotificationPermission,
		NOTIFICATION_DENIED_HELP
	} from '$lib/pwa/notifications';

	let { data } = $props();

	let pwaStepsExpanded = $state(false);

	async function handlePwaInstall() {
		const prompt = $pwaInstallPrompt;
		if (prompt) {
			try {
				await prompt.prompt();
				const choice = await prompt.userChoice;
				if (choice.outcome === 'accepted') {
					toast.success("L'app Thower a été installée.");
				}
				pwaInstallPrompt.set(null);
			} catch (err) {
				console.error('[PWA] erreur prompt:', err);
			}
		} else {
			await goto('/');
		}
	}

	async function handleTestNotification() {
		try {
			await showTestNotification();
			notificationPermission = 'granted';
			toast.success('Notification de test envoyée.');
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Impossible d'afficher la notification.";
			notificationPermission = getNotificationPermission();
			toast.error(msg);
		}
	}

	let notificationPermission = $state<'default' | 'granted' | 'denied'>('default');
	$effect(() => {
		if (typeof window !== 'undefined' && isNotificationSupported()) {
			notificationPermission = getNotificationPermission();
		}
	});

	const hasMeasurements = $derived(data?.hasMeasurements ?? false);
	const hasValidPayment = $derived(data?.hasValidPayment ?? false);
	const hasAnyTransaction = $derived(
		(data as { hasAnyTransaction?: boolean } | null)?.hasAnyTransaction ?? false
	);
	const subscriptionEndsAt = $derived(data?.subscriptionEndsAt ?? null);
	const subscriptionLabel = $derived(
		subscriptionEndsAt
			? new Date(subscriptionEndsAt).toLocaleDateString('fr-FR', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: null
	);
	const isGoogleUser = $derived(!!data?.user?.googleId);
</script>

<div class="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:py-8 sm:pb-28">
	<header class="mb-8 text-center sm:text-left">
		<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Paramètres</h1>
		<p class="mt-1 text-sm text-muted-foreground">Gérez votre compte et installez l'application Thower.</p>
		<div class="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary">
			<span class="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true"></span>
			Application installable — disponible sur tous vos appareils
		</div>
	</header>

	<div class="grid gap-10 lg:grid-cols-[1fr_minmax(340px,400px)]">
		<!-- Section Mon compte -->
		<section class="flex flex-col" aria-labelledby="section-compte">
			<h2 id="section-compte" class="mb-4 flex items-center gap-2 text-lg font-semibold sm:mb-5">
				<UserCircle class="h-5 w-5 text-primary" />
				Mon compte
			</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- Profil -->
				<Card.Root class="flex flex-col">
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-base">
							<UserCircle class="w-5 h-5 text-primary" />
							<span>Profil</span>
						</Card.Title>
						<Card.Description>Vos informations de base.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-2 text-sm">
						{#if data.user.name}
							<p><span class="text-muted-foreground">Nom</span> — {data.user.name}</p>
						{/if}
						<p><span class="text-muted-foreground">Email</span> — {data.user.email}</p>
					</Card.Content>
					{#if !isGoogleUser}
						<Card.Footer class="pt-0">
							<Button href="/auth/account" variant="outline" class="w-full" size="sm">
								Email, mot de passe et 2FA
							</Button>
						</Card.Footer>
					{/if}
				</Card.Root>

				{#if data.user.role === 'CLIENT' && hasAnyTransaction}
					<Card.Root class="flex flex-col">
						<Card.Header class="pb-2">
							<Card.Title class="flex items-center gap-2 text-base">
								<ReceiptText class="w-5 h-5 text-primary" />
								<span>Facturation</span>
							</Card.Title>
							<Card.Description>Historique de vos factures.</Card.Description>
						</Card.Header>
						<Card.Footer class="pt-0">
							<Button href="/auth/factures" class="w-full" variant="outline"
								>Mes factures</Button
							>
						</Card.Footer>
					</Card.Root>
				{/if}

				{#if data.user.role === 'ADMIN'}
					<Card.Root class="flex flex-col">
						<Card.Header class="pb-2">
							<Card.Title class="flex items-center gap-2 text-base">
								<LayoutDashboard class="w-5 h-5 text-primary" />
								<span>Administration</span>
							</Card.Title>
							<Card.Description>Tableau de bord admin.</Card.Description>
						</Card.Header>
						<Card.Footer class="pt-0">
							<Button href="/admin" class="w-full" variant="outline"
								>Dashboard Admin</Button
							>
						</Card.Footer>
					</Card.Root>
				{/if}

				<!-- Stepper 3 étapes : au-dessus de Mesures (compte non-Google) -->
				{#if !isGoogleUser}
					<div class="col-span-full procedure-stepper mb-4" role="list" aria-label="Étapes pour obtenir l'application">
						<div class="procedure-step" role="listitem">
							<a
								href="/auth/measurement"
								class="procedure-step-point {hasMeasurements ? 'procedure-step-done' : 'procedure-step-current'}"
								aria-current={!hasMeasurements ? 'step' : undefined}
								title="Formulaire physique"
							>
								{#if hasMeasurements}
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									<span class="text-xs font-bold">1</span>
								{/if}
							</a>
							<span class="procedure-step-label">Formulaire physique</span>
						</div>
						<div class="procedure-step-line" aria-hidden="true"></div>
						<div class="procedure-step" role="listitem">
							<a
								href="/auth/subscription"
								class="procedure-step-point {hasValidPayment ? 'procedure-step-done' : hasMeasurements ? 'procedure-step-current' : 'procedure-step-pending'}"
								aria-current={hasMeasurements && !hasValidPayment ? 'step' : undefined}
								title="Paiement"
							>
								{#if hasValidPayment}
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									<span class="text-xs font-bold">2</span>
								{/if}
							</a>
							<span class="procedure-step-label">Paiement</span>
						</div>
						<div class="procedure-step-line" aria-hidden="true"></div>
						<div class="procedure-step" role="listitem">
							<span
								class="procedure-step-point {hasValidPayment ? 'procedure-step-current' : 'procedure-step-pending'}"
								aria-current={hasValidPayment ? 'step' : undefined}
								title="Téléchargement de l'application"
							>
								<span class="text-xs font-bold">3</span>
							</span>
							<span class="procedure-step-label">Téléchargement</span>
						</div>
					</div>

					<Card.Root
						class="flex flex-col {!hasMeasurements ? 'measurements-card-blink border-amber-500 bg-amber-500/10' : ''}"
					>
						<Card.Header class="pb-2">
							<Card.Title
								class="flex items-center gap-2 text-base {!hasMeasurements ? 'text-amber-700 dark:text-amber-400' : ''}"
							>
								<Ruler class="w-5 h-5 {!hasMeasurements ? 'text-amber-600' : 'text-primary'}" />
								<span>Mesures</span>
								{#if !hasMeasurements}
									<span
										class="rounded bg-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200"
										>À remplir</span
									>
								{/if}
							</Card.Title>
							<Card.Description>Profil physique et mensurations.</Card.Description>
						</Card.Header>
						<Card.Footer class="pt-0">
							<Button href="/auth/measurement" class="w-full" variant={!hasMeasurements ? 'default' : 'outline'} size="sm">
								{!hasMeasurements ? 'Remplir mon profil' : 'Modifier'}
							</Button>
						</Card.Footer>
					</Card.Root>

					{#if hasMeasurements}
						<Card.Root class="flex flex-col">
							<Card.Header class="pb-2">
								<Card.Title class="flex items-center gap-2 text-base">
									<CreditCard class="w-5 h-5 text-primary" />
									<span>Souscription</span>
								</Card.Title>
								<Card.Description>
									{#if hasValidPayment}
										{#if subscriptionLabel}
											Valide jusqu'au {subscriptionLabel}.
										{:else}
											Accès à vie.
										{/if}
									{:else}
										Paiement sécurisé Stripe.
									{/if}
								</Card.Description>
							</Card.Header>
							<Card.Footer class="pt-0">
								<Button href="/auth/subscription" class="w-full" size="sm">
									{hasValidPayment ? 'Voir / Renouveler' : 'Paiement / Souscription'}
								</Button>
							</Card.Footer>
						</Card.Root>
					{/if}
				{/if}
			</div>
		</section>

		<!-- Section Procédure : stepper + téléchargement -->
		<aside
			class="flex flex-col border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
			aria-labelledby="section-procedure"
		>
			<h2 id="section-procedure" class="mb-5 flex items-center gap-2 text-lg font-semibold sm:mb-6">
				<Smartphone class="h-5 w-5 text-primary" />
				Obtenir l'application
			</h2>

			{#if hasValidPayment}
				<Card.Root class="flex flex-col lg:sticky lg:top-6 lg:self-start">
					<Card.Header class="pb-3">
						<Card.Title class="text-lg">Installer Thower</Card.Title>
						<Card.Description>
							Utilisez Thower comme une application sur votre téléphone ou ordinateur.
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Étape 1 : Installer -->
						<div class="space-y-2">
							<div class="flex items-center gap-2 font-medium">
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
									>1</span
								>
								<span>Installer l'app</span>
							</div>
							<p class="text-sm text-muted-foreground pl-9">
								{#if $pwaInstallPrompt}
									Cliquez sur le bouton ci-dessous pour installer sur cet appareil.
								{:else}
									Ouvrez Thower dans le navigateur, puis suivez les instructions selon votre appareil.
								{/if}
							</p>
							<div class="pl-9">
								<Button
									type="button"
									class="w-full gap-2"
									onclick={handlePwaInstall}
								>
									<Download class="w-4 h-4" />
									{$pwaInstallPrompt ? "Installer l'app" : "Ouvrir l'app"}
								</Button>
							</div>
							<button
								type="button"
								class="flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
								onclick={() => (pwaStepsExpanded = !pwaStepsExpanded)}
								aria-expanded={pwaStepsExpanded}
							>
								{#if pwaStepsExpanded}
									<ChevronUp class="w-4 h-4" />
								{:else}
									<ChevronDown class="w-4 h-4" />
								{/if}
								Instructions selon l'appareil
							</button>
							{#if pwaStepsExpanded}
								<ul class="text-sm text-muted-foreground space-y-1.5 pl-9 list-disc list-inside">
									<li><strong>Chrome / Edge (PC)</strong> : menu ⋮ → « Installer l'application »</li>
									<li><strong>Chrome (Android)</strong> : menu ⋮ → « Ajouter à l'écran d'accueil »</li>
									<li><strong>Safari (iPhone/iPad)</strong> : Partager → « Sur l'écran d'accueil »</li>
								</ul>
							{/if}
						</div>

						<!-- Étape 2 : Notifications -->
						{#if isNotificationSupported()}
							<div class="space-y-2 border-t border-border pt-4">
								<div class="flex items-center gap-2 font-medium">
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
										>2</span
									>
									<span>Notifications</span>
								</div>
								<p class="text-sm text-muted-foreground pl-9">
									Autorisez les notifications pour ne rien manquer. Un rappel quotidien sera envoyé à 20h40 (même si l'app est fermée).
								</p>
								{#if notificationPermission === 'denied'}
									<div class="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200 pl-9">
										<p class="font-medium">Notifications désactivées</p>
										<p class="mt-1 text-muted-foreground">{NOTIFICATION_DENIED_HELP}</p>
									</div>
								{/if}
								<div class="pl-9 pt-1">
									<Button
										type="button"
										variant="outline"
										class="w-full gap-2"
										size="sm"
										onclick={handleTestNotification}
									>
										<Bell class="w-4 h-4" />
										Notification de test
									</Button>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{:else}
				<p class="text-sm text-muted-foreground">
					{#if !hasMeasurements}
						<a href="/auth/measurement" class="underline font-medium text-foreground hover:no-underline"
							>Remplissez votre profil physique</a
						>
						pour débloquer le paiement, puis le téléchargement de l'app.
					{:else}
						<a href="/auth/subscription" class="underline font-medium text-foreground hover:no-underline"
							>Finalisez votre souscription</a
						>
						pour débloquer le téléchargement de l'application.
					{/if}
				</p>
			{/if}
		</aside>
	</div>
</div>

<style lang="scss">
	/* Stepper procédure : 3 points + ligne */
	.procedure-stepper {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0;
		width: 100%;
	}

	.procedure-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		flex: 0 0 auto;
	}

	.procedure-step-point {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: 2px solid var(--border);
		background: var(--background);
		color: var(--muted-foreground);
		transition: border-color 0.2s, background 0.2s, color 0.2s;
		text-decoration: none;
	}

	.procedure-step-point:hover {
		border-color: var(--ring);
	}

	.procedure-step-done {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.procedure-step-current {
		border-color: var(--primary);
		background: var(--primary);
		color: var(--primary-foreground);
		box-shadow: 0 0 0 3px var(--ring);
	}

	.procedure-step-pending {
		border-color: var(--border);
		background: var(--muted);
		color: var(--muted-foreground);
		cursor: default;
		pointer-events: none;
	}

	.procedure-step-line {
		flex: 1 1 0;
		min-width: 0.5rem;
		height: 2px;
		margin-top: 0.875rem;
		background: var(--border);
	}

	.procedure-step-label {
		font-size: 0.75rem;
		line-height: 1.2;
		text-align: center;
		color: var(--muted-foreground);
		max-width: 4.5rem;
	}

	@keyframes measurements-blink {
		0%,
		100% {
			box-shadow: 0 0 0 2px rgb(245 158 11 / 0.5);
		}
		50% {
			box-shadow: 0 0 0 6px rgb(245 158 11 / 0.8), 0 0 20px rgb(245 158 11 / 0.3);
		}
	}

	:global(.measurements-card-blink) {
		animation: measurements-blink 1.2s ease-in-out infinite;
	}
</style>
