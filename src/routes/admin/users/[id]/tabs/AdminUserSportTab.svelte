<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import type { AdminUserOptions, UserSelected } from '../types';
	import { fmtDate } from '../types';
	import { SESSION_TYPE_LABELS } from '$lib/utils/adminVideoDays';

	const KIND_LABELS = {
		HIDE: 'Retirer la séance',
		REPLACE: 'Remplacer les vidéos',
		ADD: 'Ajouter des vidéos'
	} as const;

	let { userSelected, adminOptions }: { userSelected: UserSelected; adminOptions: AdminUserOptions } = $props();

	function toDateTimeLocal(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 16) : '';
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Personnalisation du plan sport</Card.Title>
			<Card.Description>
				Adapte le plan commun à cet utilisateur (blessure, rattrapage, séance spécifique). Un seul
				réglage par jour du plan ; le jour est celui du plan global (J1–J91).
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if userSelected.sportOverrides?.length}
				<div class="grid gap-2">
					{#each userSelected.sportOverrides as o (o.id)}
						<form method="POST" action="?/deleteSportOverride" class="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
							<input type="hidden" name="id" value={o.id} />
							<span class="font-medium">J{o.dayIndex}</span>
							<span>{KIND_LABELS[o.kind]}</span>
							{#if o.workoutVideoIds.length}
								<span class="text-muted-foreground">
									{o.workoutVideoIds
										.map((id) => adminOptions.workoutVideos?.find((v) => v.id === id)?.title ?? id)
										.join(', ')}
								</span>
							{/if}
							{#if o.note}<span class="text-muted-foreground italic">{o.note}</span>{/if}
							<button class="ml-auto rounded-md border px-2 py-1 text-xs" type="submit">Supprimer</button>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune personnalisation : cet utilisateur suit le plan commun.</p>
			{/if}

			<form method="POST" action="?/addSportOverride" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
				<label class="space-y-1 text-sm">
					<span class="font-medium">Jour du plan</span>
					<input class="w-full rounded-md border px-3 py-2" type="number" min="1" max="91" name="dayIndex" required />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Action</span>
					<select class="w-full rounded-md border px-3 py-2" name="kind">
						{#each Object.entries(KIND_LABELS) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-sm md:col-span-2">
					<span class="font-medium">Note (optionnel)</span>
					<input class="w-full rounded-md border px-3 py-2" type="text" name="note" maxlength="500" />
				</label>
				<label class="space-y-1 text-sm md:col-span-4">
					<span class="font-medium">Vidéos (remplacer / ajouter ; ignoré pour « Retirer »)</span>
					<select class="h-40 w-full rounded-md border px-3 py-2" name="workoutVideoIds" multiple>
						{#each adminOptions.workoutVideos ?? [] as v (v.id)}
							<option value={v.id}>
								{SESSION_TYPE_LABELS[v.sessionType ?? ''] ?? '—'} · {v.position} · {v.title}
							</option>
						{/each}
					</select>
				</label>
				<div class="md:col-span-4">
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer (remplace le réglage existant du jour)</button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Title>Séances planifiées (workoutDays)</Card.Title>
			<Card.Description>Jours programme et statut éditables.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.workoutDays?.length}
				<div class="hidden">
					{#each userSelected.workoutDays as w (w.id)}
						<form id={`workout-${w.id}`} method="POST" action="?/updateWorkoutDay">
							<input type="hidden" name="id" value={w.id} />
						</form>
					{/each}
				</div>
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Séance</Table.Head>
								<Table.Head>Jour programme</Table.Head>
								<Table.Head>Date prévue</Table.Head>
								<Table.Head>Complété</Table.Head>
								<Table.Head>Verrouillé</Table.Head>
								<Table.Head>Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.workoutDays as w (w.id)}
								<Table.Row>
									<Table.Cell>{w.session?.name ?? '—'}</Table.Cell>
									<Table.Cell><input form={`workout-${w.id}`} class="w-20 rounded-md border px-2 py-1" type="number" min="1" max="1000" name="dayIndex" value={w.dayIndex} /></Table.Cell>
									<Table.Cell><input form={`workout-${w.id}`} class="w-40 rounded-md border px-2 py-1" type="datetime-local" name="scheduledDate" value={toDateTimeLocal(w.scheduledDate)} /></Table.Cell>
									<Table.Cell><input form={`workout-${w.id}`} class="w-40 rounded-md border px-2 py-1" type="datetime-local" name="completedAt" value={toDateTimeLocal(w.completedAt)} /></Table.Cell>
									<Table.Cell><input form={`workout-${w.id}`} type="checkbox" name="isLocked" checked={w.isLocked} /></Table.Cell>
									<Table.Cell><button form={`workout-${w.id}`} class="rounded-md border px-2 py-1 text-xs" type="submit">Sauver</button></Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune séance planifiée.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Progression vidéos</Card.Title>
			<Card.Description>Position maximale, heartbeat et complétion.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if userSelected.videoProgress?.length}
				<div class="grid gap-3">
					{#each userSelected.videoProgress as progress (progress.id)}
						<form method="POST" action="?/updateVideoProgress" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
							<input type="hidden" name="id" value={progress.id} />
							<p class="text-sm font-medium md:col-span-4">{progress.workoutVideo?.title ?? progress.discoveryContent?.title ?? progress.workoutVideoId ?? progress.discoveryContentId ?? 'Vidéo'}</p>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Position max (sec)</span>
								<input class="w-full rounded-md border px-3 py-2" type="number" min="0" max="100000" name="maxPositionSec" value={progress.maxPositionSec ?? 0} />
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Dernier heartbeat</span>
								<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="lastHeartbeatAt" value={toDateTimeLocal(progress.lastHeartbeatAt)} />
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Complété le</span>
								<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="completedAt" value={toDateTimeLocal(progress.completedAt)} />
							</label>
							<div class="flex items-end">
								<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer</button>
							</div>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune progression vidéo.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Complétions programme</Card.Title>
			<Card.Description>Valider ou ajuster les items de programme terminés.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form method="POST" action="?/upsertProgramDayItemCompletion" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
				<label class="space-y-1 text-sm md:col-span-2">
					<span class="font-medium">Item programme</span>
					<select class="w-full rounded-md border px-3 py-2" name="programDayItemId">
						{#each adminOptions.programDayItems ?? [] as item (item.id)}
							<option value={item.id}>{item.order ?? '—'} - {item.label ?? item.type ?? item.id}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Complété le</span>
					<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="completedAt" />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Pas</span>
					<input class="w-full rounded-md border px-3 py-2" type="number" min="0" name="stepsValue" />
				</label>
				<div class="md:col-span-4">
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Ajouter / mettre à jour</button>
				</div>
			</form>

			{#if userSelected.programDayItemCompletions?.length}
				<div class="grid gap-3">
					{#each userSelected.programDayItemCompletions as completion (completion.id)}
						<form method="POST" action="?/upsertProgramDayItemCompletion" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
							<input type="hidden" name="id" value={completion.id} />
							<label class="space-y-1 text-sm md:col-span-2">
								<span class="font-medium">Item programme</span>
								<select class="w-full rounded-md border px-3 py-2" name="programDayItemId">
									{#each adminOptions.programDayItems ?? [] as item (item.id)}
										<option value={item.id} selected={completion.programDayItemId === item.id}>{item.order ?? '—'} - {item.label ?? item.type ?? item.id}</option>
									{/each}
								</select>
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Complété le</span>
								<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="completedAt" value={toDateTimeLocal(completion.completedAt)} />
							</label>
							<label class="space-y-1 text-sm">
								<span class="font-medium">Pas</span>
								<input class="w-full rounded-md border px-3 py-2" type="number" min="0" name="stepsValue" value={completion.stepsValue ?? ''} />
							</label>
							<div class="md:col-span-4">
								<button class="rounded-md border px-3 py-2 text-sm" type="submit">Enregistrer</button>
							</div>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune complétion programme.</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
