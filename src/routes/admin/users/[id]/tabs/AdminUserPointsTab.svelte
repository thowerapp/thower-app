<script lang="ts">
	import * as Card from '$shadcn/card';
	import type { AdminUserOptions, UserSelected } from '../types';
	import { fmtDate, fmtDateShort } from '../types';

	let { userSelected, adminOptions }: { userSelected: UserSelected; adminOptions: AdminUserOptions } = $props();

	const pointTypes = [
		'WORKOUT_COMPLETE',
		'VIDEO_WATCHED',
		'DAILY_TASK',
		'BADGE_UNLOCK',
		'CHALLENGE_COMPLETE',
		'PHOTO_UPLOAD',
		'POINT_SPENT',
		'MONTHLY_CHECKIN'
	];

	function toDateTimeLocal(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 16) : '';
	}

	function metadataValue(value: Record<string, unknown> | null | undefined): string {
		return value ? JSON.stringify(value) : '';
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Événements de points</Card.Title>
			<Card.Description>Créer ou ajuster les gains et dépenses de points.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form method="POST" action="?/upsertPointEvent" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
				<label class="space-y-1 text-sm">
					<span class="font-medium">Type</span>
					<select class="w-full rounded-md border px-3 py-2" name="type">
						{#each pointTypes as type (type)}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Montant</span>
					<input class="w-full rounded-md border px-3 py-2" type="number" min="-100000" max="100000" name="amount" value="0" />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Date</span>
					<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="createdAt" />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Métadonnées JSON</span>
					<input class="w-full rounded-md border px-3 py-2" name="metadata" placeholder="JSON metadata" />
				</label>
				<div class="md:col-span-4">
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Ajouter un événement</button>
				</div>
			</form>

			{#if userSelected.pointEvents?.length}
				<div class="grid gap-3">
					{#each userSelected.pointEvents as e (e.id)}
						<form method="POST" action="?/upsertPointEvent" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
							<input type="hidden" name="id" value={e.id} />
							<label class="space-y-1 text-sm">
								<span class="font-medium">Type</span>
								<select class="w-full rounded-md border px-3 py-2" name="type">
									{#each pointTypes as type (type)}
										<option value={type} selected={e.type === type}>{type}</option>
									{/each}
								</select>
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Montant</span>
								<input class="w-full rounded-md border px-3 py-2" type="number" min="-100000" max="100000" name="amount" value={e.amount} />
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Date</span>
								<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="createdAt" value={toDateTimeLocal(e.createdAt)} />
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Métadonnées JSON</span>
								<input class="w-full rounded-md border px-3 py-2" name="metadata" value={metadataValue(e.metadata)} />
							</label>
							<div class="md:col-span-4">
								<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer ({fmtDate(e.createdAt)})</button>
							</div>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun événement de points.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Badges</Card.Title>
			<Card.Description>Progression et déblocage éditables.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.userBadges?.length}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each userSelected.userBadges as ub (ub.id)}
						<Card.Root class="border">
							<Card.Header class="py-3">
								<Card.Title class="text-base">{ub.badge?.name ?? 'Badge'}</Card.Title>
								{#if ub.badge?.description}
									<Card.Description>{ub.badge.description}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="text-sm space-y-3">
								<form method="POST" action="?/updateUserBadge" class="grid gap-3">
									<input type="hidden" name="id" value={ub.id} />
									<label class="space-y-1">
										<span class="font-medium">Progression (0 à 1)</span>
										<input class="w-full rounded-md border px-3 py-2" type="number" min="0" max="1" step="0.01" name="progress" value={ub.progress ?? 0} />
									</label>
									<label class="space-y-1">
										<span class="font-medium">Débloqué le</span>
										<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="unlockedAt" value={toDateTimeLocal(ub.unlockedAt)} />
									</label>
									<button class="w-fit rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer</button>
								</form>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<div class="space-y-2">
					<p class="text-muted-foreground text-sm">Aucun badge utilisateur à modifier.</p>
					{#if adminOptions.badges?.length}
						<p class="text-xs text-muted-foreground">Badges disponibles côté admin : {adminOptions.badges.map((badge) => badge.name).join(', ')}</p>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Photos de progression</Card.Title>
			<Card.Description>Créer ou modifier les photos par mois et angle.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form method="POST" action="?/upsertProgressPhoto" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
				<label class="space-y-1 text-sm">
					<span class="font-medium">Mois</span>
					<input class="w-full rounded-md border px-3 py-2" type="number" min="0" max="12" name="month" value="1" />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Angle</span>
					<select class="w-full rounded-md border px-3 py-2" name="angle">
						<option value="FRONT">Face</option>
						<option value="SIDE">Profil</option>
						<option value="BACK">Dos</option>
					</select>
				</label>
				<label class="space-y-1 text-sm md:col-span-2">
					<span class="font-medium">URL</span>
					<input class="w-full rounded-md border px-3 py-2" name="url" placeholder="/api/cloudflare/r2/image/photos/..." />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Upload</span>
					<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="uploadedAt" />
				</label>
				<div class="self-end md:col-span-3">
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Ajouter / remplacer la photo</button>
				</div>
			</form>

			{#if userSelected.progressPhotos?.length}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each userSelected.progressPhotos as p (p.id)}
						<form method="POST" action="?/upsertProgressPhoto" class="space-y-2 rounded-lg border p-2">
							<input type="hidden" name="id" value={p.id} />
							<img src={p.url} alt={p.angle} class="w-full h-32 object-cover rounded" />
							<div class="grid gap-2 sm:grid-cols-2">
								<label class="space-y-1 text-xs">
									<span class="font-medium">Mois</span>
									<input class="w-full rounded-md border px-2 py-1" type="number" min="0" max="12" name="month" value={p.month} />
								</label>
								<label class="space-y-1 text-xs">
									<span class="font-medium">Angle</span>
									<select class="w-full rounded-md border px-2 py-1" name="angle">
										<option value="FRONT" selected={p.angle === 'FRONT'}>Face</option>
										<option value="SIDE" selected={p.angle === 'SIDE'}>Profil</option>
										<option value="BACK" selected={p.angle === 'BACK'}>Dos</option>
									</select>
								</label>
							</div>
							<label class="space-y-1 text-xs">
								<span class="font-medium">URL</span>
								<input class="w-full rounded-md border px-2 py-1" name="url" value={p.url} />
							</label>
							<label class="space-y-1 text-xs">
								<span class="font-medium">Upload</span>
								<input class="w-full rounded-md border px-2 py-1" type="datetime-local" name="uploadedAt" value={toDateTimeLocal(p.uploadedAt)} />
							</label>
							<div class="flex items-center justify-between gap-2">
								<p class="text-xs text-muted-foreground">{fmtDateShort(p.uploadedAt)}</p>
								<button class="rounded-md border px-2 py-1 text-xs" type="submit">Sauver</button>
							</div>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune photo de progression.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
