<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as DropdownMenu from '$shadcn/dropdown-menu';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { UserSelected } from '../types';
	import { fmtDate } from '../types';

	let {
		userSelected,
		updateUserForm
	}: {
		userSelected: UserSelected;
		updateUserForm: SuperForm<Record<string, unknown>>;
	} = $props();

	const roleOptions = ['ADMIN', 'CLIENT'] as const;
	const { form, enhance } = $derived(updateUserForm);
</script>

<div class="space-y-6">
	<div class="p-4 rounded-lg border bg-muted/30">
		<h2 class="text-sm font-semibold text-muted-foreground mb-2">Infos système</h2>
		<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
			<dt class="text-muted-foreground">ID</dt>
			<dd class="font-mono truncate">{userSelected.id ?? '—'}</dd>
			<dt class="text-muted-foreground">Créé le</dt>
			<dd>{fmtDate(userSelected.createdAt)}</dd>
			{#if userSelected.googleId}
				<dt class="text-muted-foreground">Google ID</dt>
				<dd class="font-mono truncate">{userSelected.googleId}</dd>
			{/if}
		</dl>
	</div>

	<form method="POST" action="?/updateUser" use:enhance class="space-y-6">
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
		<div class="space-y-4">
			<h2 class="text-lg font-semibold">Sécurité et accès</h2>
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

	<div class="p-4 rounded-lg border {userSelected.programPausedAt ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}">
		<h2 class="text-sm font-semibold mb-3 {userSelected.programPausedAt ? 'text-destructive' : 'text-muted-foreground'}">
			Programme
		</h2>
		{#if userSelected.programPausedAt}
			<p class="text-sm mb-1">
				<span class="font-medium text-destructive">Stoppé</span> le {fmtDate(userSelected.programPausedAt)}
			</p>
			{#if userSelected.programPausedReason}
				<p class="text-sm text-muted-foreground mb-3">Motif : {userSelected.programPausedReason}</p>
			{/if}
			<form method="POST" action="?/resumeProgram">
				<Button type="submit" variant="outline" size="sm">Reprendre le programme</Button>
			</form>
		{:else}
			<p class="text-sm text-muted-foreground mb-3">Programme actif.</p>
			<form method="POST" action="?/pauseProgram" class="space-y-2">
				<textarea
					name="reason"
					rows="2"
					placeholder="Motif (optionnel)"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				></textarea>
				<Button type="submit" variant="destructive" size="sm">Stopper le programme</Button>
			</form>
		{/if}
	</div>
</div>
