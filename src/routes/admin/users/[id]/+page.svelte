<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { adminUpdateUserSchema } from '$lib/schema/users/userSchema.js';
	import * as Form from '$shadcn/form';
	import * as DropdownMenu from '$shadcn/dropdown-menu';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let { data } = $props();

	$effect(() => {
		if (data !== undefined && !data?.formSchema) {
			throw new Error('Missing form data');
		}
	});

	const formOptions = {
		validators: zodClient(adminUpdateUserSchema),
		id: 'updateUser',
		onResult: (result: { result?: { type?: string; data?: { form?: { message?: string }; message?: string } } }) => {
			const r = result?.result as { type?: string; data?: { form?: { message?: string }; message?: string } } | undefined;
			if (r?.type === 'success' && r?.data?.form?.message === 'User updated successfully') {
				toast.success(r.data.form.message);
				setTimeout(() => goto('/admin/users'), 0);
			}
			if (r?.type === 'failure' && r?.data?.message === 'Email déjà utilisé') {
				toast.error('Email déjà utilisé');
			}
		}
	};

	const updateUserForm = $derived.by(() =>
		superForm(data.formSchema!, formOptions)
	);

	const { form, enhance } = $derived(updateUserForm);
	const roleOptions = ['ADMIN', 'CLIENT'] as const;
	const userSelected = $derived(data?.userSelected ?? {});
</script>

<div class="min-h-screen min-w-[100vw] absolute">
	<div class="container mx-auto p-4 max-w-2xl">
		<h1 class="text-2xl font-bold mb-4">Modifier l'utilisateur</h1>

		<!-- Infos système (lecture seule) -->
		<div class="mb-6 p-4 rounded-lg border bg-muted/30">
			<h2 class="text-sm font-semibold text-muted-foreground mb-2">Infos système</h2>
			<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
				<dt class="text-muted-foreground">ID</dt>
				<dd class="font-mono truncate">{userSelected.id ?? '—'}</dd>
				<dt class="text-muted-foreground">Créé le</dt>
				<dd>{userSelected.createdAt ? new Date(userSelected.createdAt).toLocaleString('fr-FR') : '—'}</dd>
				{#if userSelected.googleId}
					<dt class="text-muted-foreground">Google ID</dt>
					<dd class="font-mono truncate">{userSelected.googleId}</dd>
				{/if}
			</dl>
		</div>

		<form method="POST" action="?/updateUser" use:enhance class="space-y-6">
			<!-- Profil -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">Profil</h2>
				<Form.Field name="email" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Email</Form.Label>
						<Input type="email" bind:value={$form.email} />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="username" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Nom d'utilisateur</Form.Label>
						<Input value={$form.username ?? ''} oninput={(e) => ($form.username = e.currentTarget.value || null)} placeholder="Optionnel" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="name" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Nom</Form.Label>
						<Input value={$form.name ?? ''} oninput={(e) => ($form.name = e.currentTarget.value || null)} placeholder="Optionnel" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="picture" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Photo (URL)</Form.Label>
						<Input value={$form.picture ?? ''} oninput={(e) => ($form.picture = e.currentTarget.value || null)} placeholder="Optionnel" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<!-- Sécurité & accès -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">Sécurité & accès</h2>
				<Form.Field name="role" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Rôle</Form.Label>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button variant="outline" type="button">
									{$form.role ?? 'Sélectionner'}
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content class="w-56">
								<DropdownMenu.Label>Rôle</DropdownMenu.Label>
								<DropdownMenu.Separator />
								{#each roleOptions as option}
									<DropdownMenu.Item onclick={() => ($form.role = option)}>
										{option}
									</DropdownMenu.Item>
								{/each}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="isMfaEnabled" form={updateUserForm}>
					<Form.Control>
						<Form.Label>2FA activé</Form.Label>
						<input
							type="checkbox"
							checked={Boolean($form.isMfaEnabled)}
							onchange={(e) => ($form.isMfaEnabled = e.currentTarget.checked)}
							aria-label="2FA"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="emailVerified" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Email vérifié</Form.Label>
						<input
							type="checkbox"
							checked={Boolean($form.emailVerified)}
							onchange={(e) => ($form.emailVerified = e.currentTarget.checked)}
							aria-label="Email vérifié"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field name="passwordHash" form={updateUserForm} class="w-full max-w-md">
					<Form.Control>
						<Form.Label>
							Mot de passe (laisser vide pour ne pas modifier)<br />
							<span class="text-muted-foreground text-sm"
								>Minimum 8 caractères, majuscule, minuscule, chiffre et caractère spécial</span
							>
						</Form.Label>
						<Input type="password" bind:value={$form.passwordHash} placeholder="••••••••" />
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<!-- Abonnement -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold">Abonnement</h2>
				<Form.Field name="subscriptionEndsAt" form={updateUserForm}>
					<Form.Control>
						<Form.Label>Fin d'abonnement</Form.Label>
						<Input
							type="datetime-local"
							value={$form.subscriptionEndsAt ?? ''}
							oninput={(e) => ($form.subscriptionEndsAt = e.currentTarget.value || null)}
							placeholder="Optionnel"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<Button type="submit">Enregistrer</Button>
		</form>
	</div>
</div>
