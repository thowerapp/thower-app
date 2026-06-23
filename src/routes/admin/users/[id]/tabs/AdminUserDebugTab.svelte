<script lang="ts">
	import * as Collapsible from '$shadcn/collapsible';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import type { UserSelected } from '../types';

	let { userSelected }: { userSelected: UserSelected } = $props();
	let open = $state(false);
</script>

<div class="space-y-6">
	<section class="rounded-lg border bg-muted/30 p-4">
		<h2 class="mb-3 text-sm font-semibold text-muted-foreground">Accès techniques</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<h3 class="text-sm font-medium">Sessions</h3>
				{#if userSelected.sessions?.length}
					<div class="space-y-2">
						{#each userSelected.sessions as session (session.id)}
							<form method="POST" action="?/deleteSession" class="rounded-md border bg-background p-3 text-xs">
								<input type="hidden" name="id" value={session.id} />
								<p class="font-mono break-all">{session.id}</p>
								<p class="text-muted-foreground">Expire : {session.expiresAt}</p>
								<p class="text-muted-foreground">2FA : {session.twoFactorVerified ? 'oui' : 'non'} · OAuth : {session.oauthProvider ?? '—'}</p>
								<button class="mt-2 rounded-md border px-2 py-1 text-destructive" type="submit">Supprimer la session</button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">Aucune session.</p>
				{/if}
			</div>

			<div class="space-y-2">
				<h3 class="text-sm font-medium">Push subscriptions</h3>
				{#if userSelected.pushSubscriptions?.length}
					<div class="space-y-2">
						{#each userSelected.pushSubscriptions as push (push.id)}
							<form method="POST" action="?/deletePushSubscription" class="rounded-md border bg-background p-3 text-xs">
								<input type="hidden" name="id" value={push.id} />
								<p class="font-mono break-all">{push.endpoint}</p>
								<p class="text-muted-foreground">Créée : {push.createdAt}</p>
								<button class="mt-2 rounded-md border px-2 py-1 text-destructive" type="submit">Supprimer le push</button>
							</form>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">Aucune subscription push.</p>
				{/if}
			</div>
		</div>
	</section>

	<Collapsible.Root bind:open>
		<Collapsible.Trigger class="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-left text-sm font-medium hover:bg-muted/50">
			<ChevronDown class="size-4 transition-transform {open ? 'rotate-180' : ''}" />
			Données brutes (JSON)
		</Collapsible.Trigger>
		<Collapsible.Content>
			<div class="mt-2 rounded-lg border bg-muted/30 overflow-auto p-4">
				<pre class="text-xs font-mono whitespace-pre-wrap break-all">{JSON.stringify(userSelected, null, 2)}</pre>
			</div>
		</Collapsible.Content>
	</Collapsible.Root>
</div>
