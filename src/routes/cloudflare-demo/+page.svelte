<script lang="ts">
	import * as tus from 'tus-js-client';

	// ── Stream ──────────────────────────────────────────────────────────────────
	let videoFile = $state<File | null>(null);
	let videoUid = $state<string | null>(null);
	let videoProgress = $state(0);
	let videoStatus = $state<'idle' | 'uploading' | 'done' | 'error'>('idle');
	let videoError = $state('');

	function onVideoChange(e: Event) {
		const input = e.target as HTMLInputElement;
		videoFile = input.files?.[0] ?? null;
		videoUid = null;
		videoStatus = 'idle';
		videoProgress = 0;
	}

	async function uploadVideo() {
		if (!videoFile) return;
		videoStatus = 'uploading';
		videoProgress = 0;
		videoError = '';

		try {
			const res = await fetch('/api/cloudflare/stream/upload-url', { method: 'POST' });
			const { uploadURL, uid } = await res.json();

			await new Promise<void>((resolve, reject) => {
				const upload = new tus.Upload(videoFile!, {
					endpoint: uploadURL,
					uploadUrl: uploadURL,
					retryDelays: [0, 1000, 3000],
					metadata: { filename: videoFile!.name, filetype: videoFile!.type },
					onProgress(bytesUploaded, bytesTotal) {
						videoProgress = Math.round((bytesUploaded / bytesTotal) * 100);
					},
					onSuccess() {
						videoUid = uid;
						videoStatus = 'done';
						resolve();
					},
					onError(err) {
						videoError = err.message;
						videoStatus = 'error';
						reject(err);
					}
				});
				upload.start();
			});
		} catch (err: unknown) {
			if (videoStatus !== 'error') {
				videoError = err instanceof Error ? err.message : 'Erreur inconnue';
				videoStatus = 'error';
			}
		}
	}

	// ── R2 ──────────────────────────────────────────────────────────────────────
	let imageFile = $state<File | null>(null);
	let imageKey = $state<string | null>(null);
	let imageStatus = $state<'idle' | 'uploading' | 'done' | 'error'>('idle');
	let imageError = $state('');

	function onImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		imageFile = input.files?.[0] ?? null;
		imageKey = null;
		imageStatus = 'idle';
	}

	async function uploadImage() {
		if (!imageFile) return;
		imageStatus = 'uploading';
		imageError = '';

		try {
			const form = new FormData();
			form.append('file', imageFile);

			const res = await fetch('/api/cloudflare/r2/upload', { method: 'POST', body: form });
			const data = await res.json();

			if (!res.ok) throw new Error(data.error ?? 'Erreur upload');

			imageKey = data.key;
			imageStatus = 'done';
		} catch (err: unknown) {
			imageError = err instanceof Error ? err.message : 'Erreur inconnue';
			imageStatus = 'error';
		}
	}

	const secureImageUrl = $derived(
		imageKey ? `/api/cloudflare/r2/image/${encodeURIComponent(imageKey)}` : null
	);
</script>

<svelte:head>
	<title>Cloudflare Demo</title>
</svelte:head>

<main class="min-h-screen bg-background px-4 py-12">
	<div class="mx-auto max-w-3xl space-y-10">

		<div class="text-center">
			<h1 class="text-2xl font-bold tracking-tight">Cloudflare Demo</h1>
			<p class="mt-1 text-sm text-muted-foreground">Stream · R2</p>
		</div>

		<!-- ── Cloudflare Stream ─────────────────────────────────────────────── -->
		<section class="rounded-2xl border bg-card p-6 shadow-sm">
			<div class="mb-5 flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82z"/>
					</svg>
				</div>
				<div>
					<h2 class="font-semibold">Cloudflare Stream</h2>
					<p class="text-xs text-muted-foreground">Upload & lecture vidéo</p>
				</div>
			</div>

			<div class="space-y-4">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium">Fichier vidéo</span>
					<input
						type="file"
						accept="video/*"
						onchange={onVideoChange}
						class="block w-full cursor-pointer rounded-lg border bg-background px-3 py-2 text-sm
						       file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1
						       file:text-xs file:font-medium file:text-primary-foreground"
					/>
				</label>

				{#if videoFile}
					<p class="text-xs text-muted-foreground">
						{videoFile.name} — {(videoFile.size / 1024 / 1024).toFixed(1)} Mo
					</p>
				{/if}

				<button
					onclick={uploadVideo}
					disabled={!videoFile || videoStatus === 'uploading'}
					class="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground
					       transition-opacity hover:opacity-90 disabled:opacity-40"
				>
					{videoStatus === 'uploading' ? 'Upload en cours…' : 'Uploader la vidéo'}
				</button>

				{#if videoStatus === 'uploading'}
					<div class="space-y-1">
						<div class="flex justify-between text-xs text-muted-foreground">
							<span>Progression</span>
							<span>{videoProgress}%</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-primary transition-all duration-300"
								style="width: {videoProgress}%"
							></div>
						</div>
					</div>
				{/if}

				{#if videoStatus === 'error'}
					<p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{videoError}</p>
				{/if}

				{#if videoStatus === 'done' && videoUid}
					<div class="space-y-2">
						<p class="text-xs text-muted-foreground">
							UID : <code class="rounded bg-muted px-1">{videoUid}</code>
						</p>
						<div class="overflow-hidden rounded-xl border bg-black aspect-video">
							<iframe
								src="https://iframe.cloudflarestream.com/{videoUid}"
								title="Vidéo uploadée"
								allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
								allowfullscreen
								class="h-full w-full"
							></iframe>
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- ── Cloudflare R2 ─────────────────────────────────────────────────── -->
		<section class="rounded-2xl border bg-card p-6 shadow-sm">
			<div class="mb-5 flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
					</svg>
				</div>
				<div>
					<h2 class="font-semibold">Cloudflare R2</h2>
					<p class="text-xs text-muted-foreground">Stockage image sécurisé — accès proxifié</p>
				</div>
			</div>

			<div class="space-y-4">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium">Image</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						onchange={onImageChange}
						class="block w-full cursor-pointer rounded-lg border bg-background px-3 py-2 text-sm
						       file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1
						       file:text-xs file:font-medium file:text-primary-foreground"
					/>
				</label>

				{#if imageFile}
					<p class="text-xs text-muted-foreground">
						{imageFile.name} — {(imageFile.size / 1024).toFixed(0)} Ko
					</p>
				{/if}

				<button
					onclick={uploadImage}
					disabled={!imageFile || imageStatus === 'uploading'}
					class="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground
					       transition-opacity hover:opacity-90 disabled:opacity-40"
				>
					{imageStatus === 'uploading' ? 'Upload en cours…' : "Uploader l'image"}
				</button>

				{#if imageStatus === 'error'}
					<p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{imageError}</p>
				{/if}

				{#if imageStatus === 'done' && secureImageUrl}
					<div class="space-y-2">
						<p class="text-xs text-muted-foreground">
							Clé R2 : <code class="rounded bg-muted px-1">{imageKey}</code>
						</p>
						<p class="text-xs text-muted-foreground">
							URL sécurisée (proxifiée) :
							<code class="break-all rounded bg-muted px-1">{secureImageUrl}</code>
						</p>
						<div class="overflow-hidden rounded-xl border">
							<img
								src={secureImageUrl}
								alt="Fichier uploadé sur R2"
								class="max-h-80 w-full object-contain"
							/>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>
</main>
