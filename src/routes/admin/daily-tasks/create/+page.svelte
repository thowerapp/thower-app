<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import * as Form from '$shadcn/form';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import { dailyTaskSchema } from '$lib/schema/dailyTask/dailyTaskSchema';
	import VideoCombobox from '$components/VideoCombobox.svelte';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';

	let { data } = $props();

	const taskForm = $derived.by(() =>
		superForm(data.form, {
			validators: zodClient(dailyTaskSchema),
			id: 'adminDailyTaskCreate'
		})
	);

	const { form, enhance, message: formMessage } = $derived(taskForm);

	$effect(() => {
		if ($formMessage) toast.success($formMessage as string);
	});

	const isVideo = $derived($form.type === 'VIDEO');
</script>

<div class="mx-auto max-w-xl px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<a href="/admin/daily-tasks" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="size-5" />
		</a>
		<ClipboardList class="size-6 text-primary" />
		<div>
			<h1 class="text-2xl font-bold">Nouvelle tâche journalière</h1>
			<p class="text-sm text-muted-foreground">Visible dans la checklist quotidienne des utilisateurs.</p>
		</div>
	</div>

	<form method="POST" action="?/create" use:enhance class="space-y-5">

		<Form.Field name="type" form={taskForm}>
			<Form.Control>
				<Form.Label>Type *</Form.Label>
				<select
					name="type"
					bind:value={$form.type}
					class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="STANDARD">Standard (habitude)</option>
					<option value="VIDEO">Vidéo à consulter</option>
				</select>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		{#if isVideo}
			<Form.Field name="discoveryContentId" form={taskForm}>
				<Form.Control>
					<Form.Label>Vidéo associée *</Form.Label>
					<VideoCombobox
						videos={data.discoveryContents}
						bind:value={$form.discoveryContentId as string}
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		{/if}

		<Form.Field name="label" form={taskForm}>
			<Form.Control>
				<Form.Label>Libellé *</Form.Label>
				<Input name="label" bind:value={$form.label} placeholder="Ex : Boire 2L d'eau…" />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="grid grid-cols-2 gap-4">
			<Form.Field name="points" form={taskForm}>
				<Form.Control>
					<Form.Label>Points</Form.Label>
					<Input name="points" type="number" min="0" bind:value={$form.points} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="order" form={taskForm}>
				<Form.Control>
					<Form.Label>Ordre d'affichage</Form.Label>
					<Input name="order" type="number" min="0" bind:value={$form.order} />
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>

		<fieldset class="rounded-lg border p-4">
			<legend class="px-2 text-sm font-semibold">Restriction par jour de programme</legend>
			<p class="text-muted-foreground mt-1 mb-3 text-xs">
				Laisser vide pour afficher la tâche tous les jours. Ex : 1 / 1 = jour 1 uniquement.
			</p>
			<div class="grid grid-cols-2 gap-4">
				<Form.Field name="showFromDay" form={taskForm}>
					<Form.Control>
						<Form.Label>Jour de début</Form.Label>
						<Input
							name="showFromDay"
							type="number"
							min="1"
							max="91"
							placeholder="ex : 1"
							bind:value={$form.showFromDay as number}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="showUntilDay" form={taskForm}>
					<Form.Control>
						<Form.Label>Jour de fin</Form.Label>
						<Input
							name="showUntilDay"
							type="number"
							min="1"
							max="91"
							placeholder="ex : 1"
							bind:value={$form.showUntilDay as number}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</fieldset>

		<Form.Field name="active" form={taskForm}>
			<Form.Control>
				<label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
					<input type="checkbox" name="active" bind:checked={$form.active} class="size-4 rounded border" />
					Tâche active (visible dans la checklist)
				</label>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="outline" href="/admin/daily-tasks">Annuler</Button>
			<Button type="submit">Créer la tâche</Button>
		</div>
	</form>
</div>
