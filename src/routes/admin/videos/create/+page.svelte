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
		type CreateVideoSchema
	} from '$lib/schema/video/videoAdminSchema';
	import {
		discoveryCategoryEnum
	} from '$lib/schema/discovery/discoveryContentSchema';
	import { workoutVideoPositionEnum } from '$lib/schema/workout/workoutVideoSchema';
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
	const { form, enhance, message: formMessage } = $derived(videoForm);

	$effect(() => {
		if ($formMessage) toast.success($formMessage as string);
	});

	const kindOptions = [
		{ value: 'workout', label: 'Vidéo de séance sport' },
		{ value: 'discovery', label: 'Vidéo Découverte (méditation, mindset…)' }
	];

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

	async function startUpload() {
		if (!selectedFile) {
			toast.error('Choisis d\'abord un fichier vidéo.');
			return;
		}

		uploadStatus = 'uploading';
		uploadProgress = 0;
		uploadError = null;

		try {
			// 1. URL d’upload tus (API admin JSON stable — pas d’enveloppe d’action SvelteKit)
			const fd = new FormData();
			fd.append('filename', selectedFile.name);
			// 7200 s = 2 h max — élargir si besoin pour pré-séances longues
			fd.append('maxDurationSeconds', '7200');
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

			// 2. Envoi vers l’URL one-shot
			// L’URL `direct_upload` n’est *pas* un point de création TUS classique : un premier
			// POST TUS (Upload-Length) déclenche 400 « Decoding Error ». Jusqu’à 200 Mio, CF
			// documente un `multipart` simple (champ `file`) — c’est fiable. Au‑delà : TUS
			// avec `uploadUrl` seul (HEAD puis PATCH), *sans* `endpoint` (qui force un POST
			// de création invalide ici).
			const onDone = () => {
				uploadStatus = 'success';
				cloudflareUid = uid;
				($form as unknown as CreateVideoSchema).cloudflareUid = uid;
				toast.success('Vidéo uploadée — finalisation possible.');
			};
			if (selectedFile.size <= CLOUDFLARE_STREAM_BASIC_POST_MAX_BYTES) {
				await uploadCloudflareStreamBasicPost(
					selectedFile,
					uploadURL,
					(loaded, total) => {
						uploadProgress = total ? Math.round((loaded / total) * 100) : 0;
					}
				);
				onDone();
			} else {
				const upload = new tus.Upload(selectedFile, {
					uploadUrl: uploadURL,
					retryDelays: [0, 1000, 3000, 5000],
					chunkSize: 50 * 1024 * 1024,
					onError(error) {
						console.error('[tus] upload error', error);
						uploadStatus = 'error';
						uploadError = error.message;
						toast.error("Échec de l'upload : " + error.message);
					},
					onProgress(bytesUploaded, bytesTotal) {
						uploadProgress = Math.round((bytesUploaded / bytesTotal) * 100);
					},
					onSuccess() {
						onDone();
					}
				});
				upload.start();
			}
		} catch (err) {
			uploadStatus = 'error';
			uploadError = err instanceof Error ? err.message : String(err);
			toast.error('Erreur d\'upload : ' + uploadError);
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
		<Form.Field name="kind" form={videoForm}>
			<Form.Control>
				<Form.Label>Type de vidéo *</Form.Label>
				<select
					name="kind"
					bind:value={$form.kind}
					class="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
				>
					<option value="" disabled>Choisir…</option>
					{#each kindOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

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

		{#if $form.kind === 'discovery'}
			<fieldset class="rounded-lg border p-4 space-y-4">
				<legend class="px-2 text-sm font-semibold">Paramètres Découverte</legend>

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
					<div>
						<p class="font-medium text-destructive">Échec de l'upload</p>
						<p class="text-xs text-muted-foreground">{uploadError}</p>
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