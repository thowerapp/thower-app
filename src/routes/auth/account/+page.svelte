<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { toast } from 'svelte-sonner';
	import { emailSchema, passwordSchema } from '$lib/schema/auth/settingsSchemas';
	import { isMfaEnabledSchema } from '$lib/schema/users/MfaEnabledSchema.js';
	import { Mail, KeyRound, ShieldCheck, ArrowLeft, Cog } from 'lucide-svelte';
	import { Switch } from '$shadcn/switch/index.js';

	let { data } = $props();

	const emailFormOptions = { validators: zodClient(emailSchema), id: 'emailForm' };
	const passwordFormOptions = { validators: zodClient(passwordSchema), id: 'passwordForm' };
	const isMfaEnabledFormOptions = {
		validators: zodClient(isMfaEnabledSchema),
		id: 'isMfaEnabledForm'
	};

	const emailForm = $derived.by(() => superForm(data.emailForm, emailFormOptions));
	const passwordForm = $derived.by(() => superForm(data.passwordForm, passwordFormOptions));
	const isMfaEnabledForm = $derived.by(() =>
		superForm(data.isMfaEnabledForm, isMfaEnabledFormOptions)
	);

	const { form: emailData, enhance: emailEnhance, message: emailMessage } = $derived(emailForm);
	const { form: passwordData, enhance: passwordEnhance, message: passwordMessage } =
		$derived(passwordForm);
	const {
		form: isMfaEnabledData,
		enhance: isMfaEnabledEnhance,
		message: isMfaEnabledMessage
	} = $derived(isMfaEnabledForm);

	let mfaFormRef = $state<HTMLFormElement | null>(null);

	$effect(() => {
		if ($emailMessage) toast.success($emailMessage);
		if ($passwordMessage) toast.success($passwordMessage);
		if ($isMfaEnabledMessage && $isMfaEnabledMessage.text === 'Authentication modifiée') {
			$isMfaEnabledData.isMfaEnabled = $isMfaEnabledMessage.newStatus;
			toast.success($isMfaEnabledMessage.text);
		}
	});
</script>

<svelte:head>
	<title>Paramètres du compte — Thower</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-4 py-6 pb-28 sm:py-8 sm:pb-28">
	<header class="mb-8">
		<a
			href="/auth"
			class="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Retour aux paramètres
		</a>
		<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
			<Cog class="h-8 w-8 text-primary" />
			Paramètres du compte
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Modifiez votre email, mot de passe et authentification à deux facteurs.
		</p>
	</header>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Card.Root class="flex flex-col">
			<form method="POST" action="?/email" use:emailEnhance>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-base">
						<Mail class="w-5 h-5 text-primary" />
						<span>Email</span>
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<Form.Field name="email" form={emailForm}>
						<Form.Control>
							<Form.Label>Nouvel email</Form.Label>
							<Input
								type="email"
								name="email"
								bind:value={$emailData.email}
								placeholder="nouveau@email.com"
								required
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</Card.Content>
				<Card.Footer class="pt-0">
					<Button type="submit" class="w-full" size="sm">Mettre à jour</Button>
				</Card.Footer>
			</form>
		</Card.Root>

		<Card.Root class="flex flex-col">
			<form method="POST" action="?/password" use:passwordEnhance>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-base">
						<KeyRound class="w-5 h-5 text-primary" />
						<span>Mot de passe</span>
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<Form.Field name="password" form={passwordForm}>
						<Form.Control>
							<Form.Label>Mot de passe actuel</Form.Label>
							<Input
								type="password"
								name="password"
								bind:value={$passwordData.password}
								autocomplete="current-password"
								required
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field name="new_password" form={passwordForm}>
						<Form.Control>
							<Form.Label>Nouveau mot de passe</Form.Label>
							<Input
								type="password"
								name="new_password"
								bind:value={$passwordData.new_password}
								autocomplete="new-password"
								required
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</Card.Content>
				<Card.Footer class="pt-0">
					<Button type="submit" class="w-full" size="sm">Changer le mot de passe</Button>
				</Card.Footer>
			</form>
		</Card.Root>

		<Card.Root class="flex flex-col sm:col-span-2">
			<form method="POST" action="?/isMfaEnabled" use:isMfaEnabledEnhance bind:this={mfaFormRef}>
				<Card.Header class="pb-2">
					<Card.Title class="flex items-center gap-2 text-base">
						<ShieldCheck class="w-5 h-5 text-primary" />
						<span>Authentification à deux facteurs</span>
					</Card.Title>
					<Card.Description>
						Code depuis une app (Google Authenticator, etc.).
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-row items-center justify-between gap-4 py-2">
					<span class="text-sm font-medium">2FA activée</span>
					<Switch
						checked={Boolean($isMfaEnabledData.isMfaEnabled)}
						onclick={() => mfaFormRef?.requestSubmit()}
					/>
				</Card.Content>
				{#if data.user.registered2FA}
					<Card.Footer class="pt-0">
						<Button href="/auth/recovery-code" variant="outline" class="w-full" size="sm">
							Code de récupération
						</Button>
					</Card.Footer>
				{/if}
			</form>
		</Card.Root>
	</div>
</div>