<script lang="ts">
	import '../auth-styles.css';
	import * as Form from '$shadcn/form';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { toast } from 'svelte-sonner';
	import { emailSchema, passwordSchema } from '$lib/schema/auth/settingsSchemas';
	import { isMfaEnabledSchema } from '$lib/schema/users/MfaEnabledSchema.js';
	import { Mail, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-svelte';
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

<div class="page">
	<header class="page-header">
		<a
			href="/auth"
			class="btn-ghost"
		>
			<ArrowLeft class="h-4 w-4" />
			Retour aux paramètres
		</a>
		<h1 class="page-title" style="margin-bottom: 14px; font-size: clamp(2rem, 6vw, 3.5rem);">
			Paramètres du compte
		</h1>
		<p class="page-subtitle">
			Modifiez votre email, mot de passe et authentification à deux facteurs.
		</p>
	</header>

	<main class="page-main">
		<section class="section">
			<div class="cards-col">
			<!-- Carte Email -->
			<div class="card">
				<div class="card-head">
					<span class="card-icon"><Mail class="w-5 h-5" /></span>
					<div>
						<div class="card-title">Email</div>
						<div class="card-desc">Mettez à jour votre adresse email</div>
					</div>
				</div>
				<form method="POST" action="?/email" use:emailEnhance>
					<div class="card-body">
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
					</div>
					<div class="card-foot">
						<Button type="submit" class="w-full" size="sm">Mettre à jour</Button>
					</div>
				</form>
			</div>

			<!-- Carte Mot de passe -->
			<div class="card">
				<div class="card-head">
					<span class="card-icon"><KeyRound class="w-5 h-5" /></span>
					<div>
						<div class="card-title">Mot de passe</div>
						<div class="card-desc">Changez votre mot de passe</div>
					</div>
				</div>
				<form method="POST" action="?/password" use:passwordEnhance>
					<div class="card-body">
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
					</div>
					<div class="card-foot">
						<Button type="submit" class="w-full" size="sm">Changer le mot de passe</Button>
					</div>
				</form>
			</div>

			<!-- Carte 2FA -->
			<div class="card">
				<div class="card-head">
					<span class="card-icon"><ShieldCheck class="w-5 h-5" /></span>
					<div>
						<div class="card-title">Authentification à deux facteurs</div>
						<div class="card-desc">Sécurisez votre compte</div>
					</div>
				</div>
				<form method="POST" action="?/isMfaEnabled" use:isMfaEnabledEnhance bind:this={mfaFormRef}>
					<div class="card-body" style="flex-direction: row; align-items: center; justify-content: space-between; gap: 20px;">
						<span style="font-size: 0.8rem; font-weight: 500;">2FA activée</span>
						<Switch
							checked={Boolean($isMfaEnabledData.isMfaEnabled)}
							onclick={() => mfaFormRef?.requestSubmit()}
						/>
					</div>
					{#if data.user.registered2FA}
						<div class="card-foot">
							<a href="/auth/recovery-code" class="btn btn-outline w-full">
								Code de récupération
							</a>
						</div>
					{/if}
				</form>
			</div>
		</div>
		</section>
	</main>
</div>
