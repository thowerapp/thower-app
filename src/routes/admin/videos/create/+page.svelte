<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from '$lib/superforms-zod';
	import * as Form from '$shadcn/form';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import * as tus from 'tus-js-client';
	import {
		CLOUDFLARE_STREAM_BASIC_POST_MAX_BYTES,
		uploadCloudflareStreamBasicPost
	} from '$lib/client/cloudflareStreamDirectUpload';
	import {
		createVideoSchema,
		type ChecklistTaskSchema,
		type CreateVideoSchema
	} from '$lib/schema/video/videoAdminSchema';
	import type { Readable, Writable } from 'svelte/store';
	import {
		discoveryCategoryEnum
	} from '$lib/schema/discovery/discoveryContentSchema';
	import { workoutVideoPositionEnum } from '$lib/schema/workout/workoutVideoSchema';
	import { workoutSessionTypeEnum } from '$lib/schema/workout/workoutSessionSchema';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Video from 'lucide-svelte/icons/video';
	import UploadCloud from 'lucide-svelte/icons/upload-cloud';
	import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(createVideoSchema),
		dataType: 'json' as const,
		id: 'adminVideoCreate'
	};

	const videoForm = $derived.by(() => superForm(data.form, formOptions));
	const { form, errors, enhance, message: formMessage } = $derived(videoForm);

	/** superforms infère mal les champs imbriqués de l'intersection zod (`checklist` → `{}`). */
	type ChecklistErrors = { fromDay?: string[]; untilDay?: string[]; _errors?: string[] };
	const checklistForm = $derived(
		form as unknown as Writable<{ checklist?: ChecklistTaskSchema }>
	);
	const checklistErrors = $derived(
		errors as unknown as Readable<{ checklist?: ChecklistErrors }>
	);

	$effect(() => {
		if ($formMessage) toast.success($formMessage as string);
	});

	type Placement = 'workout' | 'discovery' | 'checklist';
	const placementOptions: { value: Placement; label: string; hint: string }[] = [
		{
			value: 'workout',
			label: 'Séance sport',
			hint: 'Dans la séance choisie (A, B, C…), chaque semaine.'
		},
		{
			value: 'discovery',
			label: 'Hub Découverte',
			hint: 'Dans l’onglet Découverte (méditation, mindset, breathwork…).'
		},
		{
			value: 'checklist',
			label: 'Checklist d’un jour',
			hint: 'Tâche à cocher dans la journée de l’utilisateur, cochée seule quand la vidéo est regardée.'
		}
	];

	const placement = $derived<Placement | ''>(
		$form.addToChecklist ? 'checklist' : (($form.kind as Placement | undefined) ?? '')
	);

	/** « Checklist » = vidéo Découverte + tâche quotidienne VIDEO créée avec elle. */
	function choosePlacement(p: Placement) {
		$form.kind = p === 'workout' ? 'workout' : 'discovery';
		$form.addToChecklist = p === 'checklist';
		if (p === 'checklist' && !$checklistForm.checklist) {
			$checklistForm.checklist = { fromDay: 1, untilDay: 1, points: 20, label: '' };
		}
	}

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

	const sessionTypeOptions = workoutSessionTypeEnum.options.map((v) => ({
		value: v,
		label: ({
			MAIN_A: 'Séance A',
			MAIN_B: 'Séance B',
			MAIN_C: 'Séance C',
			DISCOVERY: 'Découverte'
		})[v]
	}));

	let selectedFile = $state<File | null>(null);
	let uploadProgress = $state(0);
	let uploadStatus = $state<'idle' | 'uploading' | 'success' | 'error'>('idle');
	let uploadError = $state<string | null>(null);
	let cloudflareUid = $state<string | null>(null);

	function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		selectedFile = file;
		uploadStatus = 'idle';
		uploadProgress = 0;
		uploadError = null;
		cloudflareUid = null;
	}

	async function fetchUploadUrl(file: File): Promise<{ uploadURL: string; uid: string }> {
		// URL d’upload tus (API admin JSON stable — pas d’enveloppe d’action SvelteKit)
		const fd = new FormData();
		fd.append('filename', file.name);
		// 7200 s = 2 h max — élargir si besoin pour pré-séances longues
		fd.append('maxDurationSeconds', '7200');
		// > 200 Mio : le serveur crée un upload tus (direct_user) au lieu d’une URL Basic POST
		if (file.size > CLOUDFLARE_STREAM_BASIC_POST_MAX_BYTES) {
			fd.append('uploadLength', String(file.size));
		}
		const res = await fetch('/api/admin/cloudflare-stream/upload-url', {
			method: 'POST',
			body: fd,
			credentials: 'include',
			headers: { Accept: 'application/json' }
		});
		const raw = await res.json().catch(() => ({}));
		if (!res.ok) {
			const msg =
				typeof raw === 'object' && raw && 'message' in raw
					? String((raw as { message: string }).message)
					: res.statusText;
			throw new Error(msg || 'Impossible d’obtenir l’URL d’upload.');
		}
		const { uploadURL, uid } = raw as { uploadURL?: string; uid?: string };
		if (!uploadURL || !uid) {
			throw new Error('URL d’upload Cloudflare non reçue.');
		}
		return { uploadURL, uid };
	}

	async function startUpload() {
		if (!selectedFile) {
			toast.error('Choisis d\'abord un fichier vidéo.');
			return;
		}

		uploadStatus = 'uploading';
		uploadProgress = 0;
		uploadError = null;

		const file = selectedFile;
		try {
			// 1. URL d’upload one-shot, demandée à chaque tentative
			const { uploadURL, uid } = await fetchUploadUrl(file);

			// 2. Envoi vers l’URL one-shot
			// ≤ 200 Mio : URL `direct_upload` en Basic POST multipart (champ `file`) — elle
			// refuse tout HEAD/PATCH tus (400). Au‑delà : URL tus déjà créée côté serveur
			// (`direct_user=true`), reprise avec `uploadUrl` seul (HEAD puis PATCH).
			const onDone = () => {
				uploadStatus = 'success';
				cloudflareUid = uid;
				($form as unknown as CreateVideoSchema).cloudflareUid = uid;
				toast.success('Vidéo uploadée — finalisation possible.');
			};
			if (file.size <= CLOUDFLARE_STREAM_BASIC_POST_MAX_BYTES) {
				await uploadCloudflareStreamBasicPost(file, uploadURL, (loaded, total) => {
					uploadProgress = total ? Math.round((loaded / total) * 100) : 0;
				});
				onDone();
			} else {
				await new Promise<void>((resolve, reject) => {
					const upload = new tus.Upload(file, {
						uploadUrl: uploadURL,
						retryDelays: [0, 1000, 3000, 5000],
						chunkSize: 50 * 1024 * 1024,
						onError(error) {
							reject(error);
						},
						onProgress(bytesUploaded, bytesTotal) {
							uploadProgress = Math.round((bytesUploaded / bytesTotal) * 100);
						},
						onSuccess() {
							onDone();
							resolve();
						}
					});
					upload.start();
				});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error('[upload] échec', err);
			uploadStatus = 'error';
			uploadError = message;
			toast.error("Échec de l'upload : " + message);
		}
	}
</script>

<div class="mx-auto max-w-3xl px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<a href="/admin/videos" class="text-muted-foreground hover:text-foreground">
			<ArrowLeft class="size-5" />
		</a>
		<Video class="size-6 text-primary" />
		<div>
			<h1 class="text-2xl font-bold">Nouvelle vidéo Cloudflare Stream</h1>
			<p class="text-sm text-muted-foreground">
				Upload direct (tus) vers Cloudflare ; la fiche est créée à la finalisation.
			</p>
		</div>
	</div>

	<form method="POST" action="?/createVideo" use:enhance class="space-y-6">
		<fieldset class="space-y-2">
			<legend class="mb-2 text-sm font-medium">Où doit apparaître cette vidéo ? *</legend>
			<div class="grid gap-2 sm:grid-cols-3">
				{#each placementOptions as opt (opt.value)}
					<label
						class="flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 {placement ===
						opt.value
							? 'border-primary bg-primary/5'
							: ''}"
					>
						<span class="flex items-center gap-2 font-medium">
							<input
								type="radio"
								name="placement"
								value={opt.value}
								checked={placement === opt.value}
								onchange={() => choosePlacement(opt.value)}
								class="size-4"
							/>
							{opt.label}
						</span>
						<span class="text-xs text-muted-foreground">{opt.hint}</span>
					</label>
				{/each}
			</div>
			<Form.Field name="kind" form={videoForm}>
				<Form.FieldErrors />
			</Form.Field>
		</fieldset>

		<Form.Field name="title" form={videoForm}>
			<Form.Control>
				<Form.Label>Titre *</Form.Label>
				<Input name="title" bind:value={$form.title} placeholder="Vidéo 1 — Renforcement haut du corps" />
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

	{#if $form.kind === 'workout'}
		<fieldset class="rounded-lg border p-4 space-y-4">
			<legend class="px-2 text-sm font-semibold">Paramètres séance sport</legend>

			<Form.Field name="sessionType" form={videoForm}>
				<Form.Control>
					<Form.Label>Séance *</Form.Label>
					<select
						name="sessionType"
						bind:value={$form.sessionType}
						class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
					>
						<option value="" disabled selected>Choisir…</option>
						{#each sessionTypeOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="position" form={videoForm}>
				<Form.Control>
					<Form.Label>Position *</Form.Label>
					<select
						name="position"
						bind:value={$form.position}
						class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
					>
						<option value="" disabled selected>Choisir…</option>
						{#each positionOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

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

		{#if placement === 'checklist' && $checklistForm.checklist}
			<fieldset class="rounded-lg border p-4 space-y-4">
				<legend class="px-2 text-sm font-semibold">Tâche dans la checklist</legend>
				<div class="grid grid-cols-3 gap-3">
					<div>
						<label for="cl-from" class="mb-1 block text-xs text-muted-foreground">Du jour (1-91) *</label>
						<Input
							id="cl-from"
							type="number"
							min={1}
							max={91}
							bind:value={$checklistForm.checklist.fromDay}
							oninput={() => {
								if ($checklistForm.checklist && $checklistForm.checklist.untilDay < $checklistForm.checklist.fromDay)
									$checklistForm.checklist.untilDay = $checklistForm.checklist.fromDay;
							}}
						/>
					</div>
					<div>
						<label for="cl-until" class="mb-1 block text-xs text-muted-foreground">Au jour (1-91) *</label>
						<Input id="cl-until" type="number" min={1} max={91} bind:value={$checklistForm.checklist.untilDay} />
					</div>
					<div>
						<label for="cl-points" class="mb-1 block text-xs text-muted-foreground">Points *</label>
						<Input id="cl-points" type="number" min={0} bind:value={$checklistForm.checklist.points} />
					</div>
				</div>
				<div>
					<label for="cl-label" class="mb-1 block text-xs text-muted-foreground">
						Texte de la tâche (facultatif)
					</label>
					<Input
						id="cl-label"
						bind:value={$checklistForm.checklist.label}
						placeholder={`Regarde la vidéo : ${$form.title || '…'}`}
					/>
				</div>
				{#if $checklistErrors.checklist?.untilDay || $checklistErrors.checklist?._errors}
					<p class="text-sm text-destructive">
						{$checklistErrors.checklist?.untilDay?.[0] ?? $checklistErrors.checklist?._errors?.[0]}
					</p>
				{/if}
			</fieldset>
		{/if}

		{#if $form.kind === 'discovery'}
			<fieldset class="rounded-lg border p-4 space-y-4">
				<legend class="px-2 text-sm font-semibold">
					{placement === 'checklist' ? 'Catégorie (où la retrouver dans Découverte)' : 'Paramètres Découverte'}
				</legend>

			<Form.Field name="category" form={videoForm}>
				<Form.Control>
					<Form.Label>Catégorie *</Form.Label>
					<select
						name="category"
						bind:value={$form.category}
						class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
					>
						<option value="" disabled selected>Choisir…</option>
						{#each categoryOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

		</fieldset>
		{/if}

	<!-- Upload tus -->
		<fieldset class="rounded-lg border p-4 space-y-4">
			<legend class="px-2 text-sm font-semibold">Fichier vidéo (Cloudflare Stream)</legend>

			<input
				type="file"
				accept="video/*"
				onchange={onFileChange}
				class="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
			/>

			{#if selectedFile}
				<p class="text-xs text-muted-foreground">
					{selectedFile.name} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} Mo
				</p>
			{/if}

			{#if uploadStatus === 'idle' && selectedFile}
				<Button type="button" variant="outline" onclick={startUpload}>
					<UploadCloud class="mr-2 size-4" /> Démarrer l'upload
				</Button>
			{/if}

			{#if uploadStatus === 'uploading'}
				<div class="space-y-2">
					<div class="h-2 w-full overflow-hidden rounded bg-muted">
						<div class="h-full bg-primary transition-all" style="width: {uploadProgress}%"></div>
					</div>
					<p class="text-xs text-muted-foreground">Upload en cours… {uploadProgress} %</p>
				</div>
			{/if}

			{#if uploadStatus === 'success' && cloudflareUid}
				<div class="flex items-start gap-2 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm">
					<CheckCircle2 class="size-5 text-green-600 shrink-0" />
					<div>
						<p class="font-medium text-green-700">Upload terminé</p>
						<p class="font-mono text-xs text-muted-foreground">UID Cloudflare : {cloudflareUid}</p>
						<p class="text-xs text-muted-foreground">
							Le statut passera à <span class="font-semibold">ready</span> dès que Cloudflare aura
							terminé le transcodage (webhook).
						</p>
					</div>
				</div>
			{/if}

			{#if uploadStatus === 'error'}
				<div class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
					<AlertCircle class="size-5 text-destructive shrink-0" />
					<div class="space-y-2">
						<p class="font-medium text-destructive">Échec de l'upload</p>
						<p class="text-xs text-muted-foreground">{uploadError}</p>
						<Button type="button" variant="outline" size="sm" onclick={startUpload}>
							<UploadCloud class="mr-2 size-4" /> Réessayer
						</Button>
					</div>
				</div>
			{/if}

			<input type="hidden" name="cloudflareUid" bind:value={$form.cloudflareUid} />
			<Form.Field name="cloudflareUid" form={videoForm}>
				<Form.FieldErrors />
			</Form.Field>
		</fieldset>

		<div class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => goto('/admin/videos')}>Annuler</Button>
			<Button type="submit" disabled={uploadStatus !== 'success'}>
				Créer la vidéo
			</Button>
		</div>
	</form>
</div>