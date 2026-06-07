<script lang="ts">
	import * as Card from '$shadcn/card';
	import * as Table from '$shadcn/table';
	import type { AdminUserOptions, UserSelected } from '../types';
	import { fmtDate, fmtDateShort } from '../types';

	let { userSelected, adminOptions }: { userSelected: UserSelected; adminOptions: AdminUserOptions } = $props();

	function toDateInput(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 10) : '';
	}

	function toDateTimeLocal(iso: string | null | undefined): string {
		return iso ? iso.slice(0, 16) : '';
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Tâches quotidiennes complétées</Card.Title>
			<Card.Description>Créer ou corriger les validations.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form method="POST" action="?/upsertDailyTaskCompletion" class="grid gap-3 rounded-lg border p-3 md:grid-cols-4">
				<label class="space-y-1 text-sm">
					<span class="font-medium">Tâche</span>
					<select class="w-full rounded-md border px-3 py-2" name="taskId">
						{#each adminOptions.dailyTasks ?? [] as task (task.id)}
							<option value={task.id}>{task.label}</option>
						{/each}
					</select>
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Date</span>
					<input class="w-full rounded-md border px-3 py-2" type="date" name="date" />
				</label>
				<label class="space-y-1 text-sm">
					<span class="font-medium">Complété le</span>
					<input class="w-full rounded-md border px-3 py-2" type="datetime-local" name="completedAt" />
				</label>
				<div class="flex items-end">
					<button class="rounded-md border px-3 py-2 text-sm" type="submit">Ajouter</button>
				</div>
			</form>

			{#if userSelected.dailyTaskCompletions?.length}
				<div class="hidden">
					{#each userSelected.dailyTaskCompletions as c (c.id)}
						<form id={`task-completion-${c.id}`} method="POST" action="?/upsertDailyTaskCompletion">
							<input type="hidden" name="id" value={c.id} />
						</form>
					{/each}
				</div>
				<div class="rounded-md border overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Tâche</Table.Head>
								<Table.Head>Date</Table.Head>
								<Table.Head>Complété le</Table.Head>
								<Table.Head>Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each userSelected.dailyTaskCompletions as c (c.id)}
								<Table.Row>
									<Table.Cell>
										<select form={`task-completion-${c.id}`} class="w-48 rounded-md border px-2 py-1" name="taskId">
											{#each adminOptions.dailyTasks ?? [] as task (task.id)}
												<option value={task.id} selected={c.taskId === task.id}>{task.label}</option>
											{/each}
										</select>
									</Table.Cell>
									<Table.Cell><input form={`task-completion-${c.id}`} class="w-36 rounded-md border px-2 py-1" type="date" name="date" value={toDateInput(c.date)} /></Table.Cell>
									<Table.Cell><input form={`task-completion-${c.id}`} class="w-40 rounded-md border px-2 py-1" type="datetime-local" name="completedAt" value={toDateTimeLocal(c.completedAt)} /></Table.Cell>
									<Table.Cell><button form={`task-completion-${c.id}`} class="rounded-md border px-2 py-1 text-xs" type="submit">Sauver</button></Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucune tâche complétée.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Opt-out tâches</Card.Title>
			<Card.Description>Ajouter un opt-out, ou envoyer un opt-out existant pour le supprimer côté serveur.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<form method="POST" action="?/upsertDailyTaskOptOut" class="flex flex-wrap items-end gap-3 rounded-lg border p-3">
				<label class="space-y-1 text-sm">
					<span class="font-medium">Tâche</span>
					<select class="w-64 rounded-md border px-3 py-2" name="taskId">
						{#each adminOptions.dailyTasks ?? [] as task (task.id)}
							<option value={task.id}>{task.label}</option>
						{/each}
					</select>
				</label>
				<button class="rounded-md border px-3 py-2 text-sm" type="submit">Ajouter opt-out</button>
			</form>

			{#if userSelected.dailyTaskOptOuts?.length}
				<div class="flex flex-wrap gap-2">
					{#each userSelected.dailyTaskOptOuts as optOut (optOut.id)}
						<form method="POST" action="?/upsertDailyTaskOptOut" class="rounded-md border px-3 py-2 text-sm">
							<input type="hidden" name="id" value={optOut.id} />
							<input type="hidden" name="taskId" value={optOut.taskId} />
							<span>{optOut.task?.label ?? optOut.taskId}</span>
							<button class="ml-2 text-destructive" type="submit">Retirer</button>
						</form>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun opt-out.</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Défis</Card.Title>
			<Card.Description>Défis rejoints et complétion éditable.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if userSelected.challenges?.length}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each userSelected.challenges as uc (uc.id)}
						<Card.Root class="border">
							<Card.Header class="py-3">
								<Card.Title class="text-base">{uc.challenge?.name ?? 'Défi'}</Card.Title>
								{#if uc.challenge?.description}
									<Card.Description>{uc.challenge.description}</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="text-sm space-y-1">
								<p>Durée : {uc.challenge?.durationDays ?? '—'} jours — Bonus : {uc.challenge?.bonusPoints ?? '—'} pts</p>
								<p>Période : {uc.challenge?.startAt ? fmtDateShort(uc.challenge.startAt) : '—'} → {uc.challenge?.endAt ? fmtDateShort(uc.challenge.endAt) : '—'}</p>
								<p>Rejoint le : {fmtDate(uc.joinedAt)}</p>
								<form method="POST" action="?/updateUserChallenge" class="flex flex-wrap items-end gap-2 pt-2">
									<input type="hidden" name="id" value={uc.id} />
									<label class="space-y-1">
										<span class="font-medium">Complété le</span>
										<input class="w-44 rounded-md border px-3 py-2" type="datetime-local" name="completedAt" value={toDateTimeLocal(uc.completedAt)} />
									</label>
									<button class="rounded-md border px-3 py-2" type="submit">Enregistrer</button>
								</form>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">Aucun défi rejoint.</p>
			{/if}
			{#if adminOptions.adminChallenges?.length}
				<p class="text-xs text-muted-foreground">Défis disponibles côté admin : {adminOptions.adminChallenges.map((challenge) => challenge.name).join(', ')}</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
