<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from '$lib/superforms-zod';
	import * as Form from '$shadcn/form';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import { goto, invalidate } from '$app/navigation';
	import { enhance as kitFormEnhance } from '$app/forms';
	import { updateVideoSchema, type VideoKind } from '$lib/schema/video/videoAdminSchema';
	import {
		discoveryCategoryEnum
	} from '$lib/schema/discovery/discoveryContentSchema';
	import { workoutVideoPositionEnum } from '$lib/schema/workout/workoutVideoSchema';
	import { attachDayTypeEnum, type AttachDaySchema } from '$lib/schema/video/attachDaySchema';
	import { defaultProgramDayAttach } from '$lib/schema/video/defaultProgramDayAttach';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Video from 'lucide-svelte/icons/video';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import CalendarPlus from 'lucide-svelte/icons/calendar-plus';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	let { data } = $props();

	const videoForm = $derived.by(() =>
		superForm(data.form, {
			validators: zodClient(updateVideoSchema),
			dataType: 'json' as const,
			id: 'adminVideoEdit',
			invalidateAll: false,
			async onUpdated() {
				await invalidate('app:admin-video-program-items');
			}
		})
	);
	const { form, enhance, message: formMessage } = $derived(videoForm);

	$effect(() => {
		if ($formMessage) toast.success($formMessage as string);
	});

	const dayTypeOptions = attachDayTypeEnum.options.map((v) => ({
		value: v,
		label: ({
			VIDEO_OF_DAY: 'Vidéo du jour',
			BREATHWORK: 'Breathwork',
			SPORT_SESSION: 'Séance sport',
			MINDSET_VIDEO: 'Vidéo mindset',
			CUSTOM: 'Personnalisé'
		})[v]
	}));

	const allowedDayTypes = $derived(
		$form.kind === 'workout'
			? dayTypeOptions.filter((o) => o.value === 'SPORT_SESSION' || o.value === 'CUSTOM')
			: dayTypeOptions.filter((o) => o.value !== 'SPORT_SESSION')
	);

	const categoryOptions = discoveryCategoryEnum.options.map((v) => ({
		value: v,
		label: ({
			MEDITATION: 'Méditation',
			MINDSET: 'Mindset',
			BREATHWORK: 'Breathwork',
			MOTIVATION: 'Motivation',
			EXPLICATION: 'Explication'
		})[v]
	}));

	const positionOptions = workoutVideoPositionEnum.options.map((v) => ({
		value: v,
		label: ({ PRE: 'Pré-séance (facultative)', VID1: 'Vidéo 1', VID2: 'Vidéo 2' })[v]
	}));

	const sessions = (data.sessions ?? []) as Array<{ id: string; name: string; type: string }>;

	const cf = data.cloudflareDetails;

	function formatDuration(n: number | null | undefined): string {
		if (!n || n <= 0) return '—';
		const total = Math.round(n);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	/** Progressive enhancement + invalidation ciblée (sans rechargement complet de la page). */
	const detachProgramItemSubmit: import('@sveltejs/kit').SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') {
				await invalidate('app:admin-video-program-items');
			}
		};
	};
</script>

<div class="mx-auto max-w-3xl px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<a href="/admin/videos" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="size-5" />
		</a>
		<Video class="size-6 text-primary" />
		<div>
			<h1 class="text-2xl font-bold">Modifier la vidéo</h1>
			<p class="text-sm text-muted-foreground">
				Type : <span class="font-medium">{data.kind === 'workout' ? 'Sport' : 'Découverte'}</span>
			</p>
		</div>
	</div>

	<!-- Aperçu Cloudflare -->
	<div class="mb-6 rounded-lg border p-4 space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-base font-semibold">Statut Cloudflare Stream</h2>
			<form method="POST" action="?/syncFromCloudflare">
				<Button type="submit" size="sm" variant="outline">
					<RefreshCw class="mr-2 size-3" /> Resynchroniser
				</Button>
			</form>
		</div>

		<dl class="grid grid-cols-2 gap-2 text-sm">
			<dt class="text-muted-foreground">UID</dt>
			<dd class="font-mono text-xs">{$form.cloudflareUid}</dd>

			<dt class="text-muted-foreground">Statut</dt>
			<dd>
				{#if cf}
					<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" class:bg-green-100={cf.status === 'ready'} class:text-green-800={cf.status === 'ready'} class:bg-amber-100={cf.status !== 'ready' && cf.status !== 'error'} class:text-amber-800={cf.status !== 'ready' && cf.status !== 'error'} class:bg-destructive={cf.status === 'error'}>
						{cf.status}
					</span>
				{:else}
					<span class="text-muted-foreground">non synchronisé</span>
				{/if}
			</dd>

			<dt class="text-muted-foreground">Durée</dt>
			<dd>{formatDuration(cf?.duration)}</dd>

			<dt class="text-muted-foreground">Vignette</dt>
			<dd>
				{#if cf?.thumbnail}
					<a href={cf.thumbnail} target="_blank" rel="noopener" class="text-xs underline">
						voir
					</a>
				{:else}
					—
				{/if}
			</dd>
		</dl>

		{#if data.previewEmbedUrl}
			<div class="aspect-video overflow-hidden rounded border bg-black">
				<iframe
					src={data.previewEmbedUrl}
					title="Preview Cloudflare Stream"
					allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
					allowfullscreen
					class="h-full w-full"
				></iframe>
			</div>
		{:else}
			<p class="text-xs text-muted-foreground">
				La preview apparaîtra dès que Cloudflare aura terminé le transcodage de la vidéo.
			</p>
		{/if}
	</div>

	<form method="POST" action="?/updateVideo" use:enhance class="space-y-6">
		<input type="hidden" name="kind" bind:value={$form.kind} />
		<input type="hidden" name="cloudflareUid" bind:value={$form.cloudflareUid} />

		<Form.Field name="title" form={videoForm}>
			<Form.Control>
				<Form.Label>Titre *</Form.Label>
				<Input name="title" bind:value={$form.title} />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		{#if $form.kind === 'workout'}
			<fieldset class="rounded-lg border p-4 space-y-4">
				<legend class="px-2 text-sm font-semibold">Paramètres séance sport</legend>

				<Form.Field name="sessionId" form={videoForm}>
					<Form.Control>
						<Form.Label>Séance *</Form.Label>
						<select
							name="sessionId"
							bind:value={$form.sessionId}
							class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
						>
							{#each sessions as s}
								<option value={s.id}>{s.name} ({s.type})</option>
							{/each}
						</select>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<div class="grid grid-cols-2 gap-4">
					<Form.Field name="position" form={videoForm}>
						<Form.Control>
							<Form.Label>Position *</Form.Label>
							<select
								name="position"
								bind:value={$form.position}
								class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
							>
								{#each positionOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field name="order" form={videoForm}>
						<Form.Control>
							<Form.Label>Ordre</Form.Label>
							<Input name="order" type="number" min="0" bind:value={$form.order} />
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<label class="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						class="size-4 rounded border"
						checked={$form.isOptional === true}
						onchange={(e) => ($form.isOptional = e.currentTarget.checked)}
					/>
					Vidéo facultative (pré-séance par exemple)
				</label>
			</fieldset>
		{/if}

		{#if $form.kind === 'discovery'}
			<fieldset class="rounded-lg border p-4 space-y-4">
				<legend class="px-2 text-sm font-semibold">Paramètres Découverte</legend>

				<div class="grid grid-cols-2 gap-4">
					<Form.Field name="category" form={videoForm}>
						<Form.Control>
							<Form.Label>Catégorie *</Form.Label>
							<select
								name="category"
								bind:value={$form.category}
								class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
							>
								{#each categoryOptions as opt}
									<option value={opt.value}>{opt.label}</option>
								{/each}
							</select>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field name="order" form={videoForm}>
						<Form.Control>
							<Form.Label>Ordre</Form.Label>
							<Input name="order" type="number" min="0" bind:value={$form.order} />
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<Form.Field name="unlockThreshold" form={videoForm}>
					<Form.Control>
						<Form.Label>Seuil de déblocage (points)</Form.Label>
						<Input
							name="unlockThreshold"
							type="number"
							min="0"
							bind:value={$form.unlockThreshold}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="breathworkIntent" form={videoForm}>
					<Form.Control>
						<Form.Label>Intention breathwork (optionnel)</Form.Label>
						<Input
							name="breathworkIntent"
							bind:value={$form.breathworkIntent as string}
							placeholder="cohérence cardiaque, anti-stress…"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field name="tags" form={videoForm}>
					<Form.Control>
						<Form.Label>Tags</Form.Label>
						<Input
							name="tags"
							value={(($form.tags as string[]) ?? []).join(', ')}
							placeholder="méditation, focus (séparer par virgules)"
							oninput={(e) => {
								$form.tags = e.currentTarget.value
									.split(',')
									.map((s) => s.trim())
									.filter(Boolean);
							}}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</fieldset>
		{/if}

		<section class="rounded-lg border p-4 space-y-4">
			<header class="flex items-center gap-2">
				<CalendarPlus class="size-5 text-primary" />
				<h2 class="text-base font-semibold">Programme 91 jours (à l’enregistrement)</h2>
			</header>

			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="size-4 rounded border"
					checked={$form.attachToProgramDay === true}
					onchange={(e) => {
						const on = e.currentTarget.checked;
						$form.attachToProgramDay = on;
						if (!on) {
							$form.programDayAttach = undefined;
							return;
						}
						$form.programDayAttach = defaultProgramDayAttach(
							$form.kind as VideoKind,
							$form.category as string | null | undefined
						);
					}}
				/>
				Ajouter un rattachement au programme lors de l’enregistrement du formulaire
			</label>

			{#if $form.attachToProgramDay === true && $form.programDayAttach}
				{@const pa = $form.programDayAttach as AttachDaySchema}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-5 rounded-md border bg-muted/30 p-3">
					<div>
						<label for="edit-att-dayIndex" class="mb-1 block text-xs font-medium text-muted-foreground">
							Jour
						</label>
						<Input id="edit-att-dayIndex" type="number" min={1} max={91} bind:value={pa.dayIndex} />
					</div>
					<div class="sm:col-span-2">
						<label for="edit-att-type" class="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
						<select
							id="edit-att-type"
							bind:value={pa.type}
							class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
						>
							{#each allowedDayTypes as opt}
								<option value={opt.value}>{opt.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="edit-att-points" class="mb-1 block text-xs font-medium text-muted-foreground">
							Points
						</label>
						<Input id="edit-att-points" type="number" min={0} max={1000} bind:value={pa.points} />
					</div>
					<div class="sm:col-span-5">
						<label for="edit-att-label" class="mb-1 block text-xs font-medium text-muted-foreground">
							Libellé affiché (optionnel)
						</label>
						<Input
							id="edit-att-label"
							placeholder="Ex. : Vidéo intro mindset"
							bind:value={pa.label as string}
						/>
					</div>
				</div>
				<Form.Field name="programDayAttach" form={videoForm}>
					<Form.FieldErrors />
				</Form.Field>
			{/if}
			<p class="text-xs text-muted-foreground">
				Les rattachements existants sont listés ci‑dessous ; la case permet d’en ajouter un en une fois avec le reste du formulaire.
			</p>
		</section>

		<div class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => goto('/admin/videos')}>Retour</Button>
			<Button type="submit">Enregistrer</Button>
		</div>
	</form>

	<!-- Rattachements existants au programme 91 jours -->
	<section class="mt-8 rounded-lg border p-4 space-y-4">
		<header class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<CalendarPlus class="size-5 text-primary" />
				<h2 class="text-base font-semibold">Programme 91 jours — rattachements actuels</h2>
			</div>
			<span class="text-xs text-muted-foreground">
				{data.programDayItems.length} rattachement{data.programDayItems.length > 1 ? 's' : ''}
			</span>
		</header>

		{#if data.programDayItems.length === 0}
			<p class="text-sm text-muted-foreground">
				Cette vidéo n'est rattachée à aucun jour du programme.
			</p>
		{:else}
			<ul class="divide-y rounded border">
				{#each data.programDayItems as item (item.programDayItemId)}
					<li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
						<div class="flex items-center gap-3">
							<span class="inline-flex h-7 min-w-[3rem] items-center justify-center rounded bg-primary/10 px-2 text-xs font-semibold text-primary">
								Jour {item.dayIndex}
							</span>
							<span class="font-medium">{item.label ?? item.type}</span>
							<span class="text-xs text-muted-foreground">{item.type}</span>
							<span class="text-xs text-muted-foreground">{item.points} pts</span>
						</div>
						<form method="POST" action="?/detachFromDay" use:kitFormEnhance={detachProgramItemSubmit}>
							<input type="hidden" name="programDayItemId" value={item.programDayItemId} />
							<Button type="submit" size="sm" variant="ghost">
								<Trash2 class="size-4" />
							</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
