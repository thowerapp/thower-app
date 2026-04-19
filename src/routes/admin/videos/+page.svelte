<script lang="ts">
	import Table from '$components/Table.svelte';
	import { Button } from '$shadcn/button';
	import { deleteVideoSchema } from '$lib/schema/video/videoAdminSchema';
	import { zodClient } from '$lib/superforms-zod';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Plus from 'lucide-svelte/icons/plus';
	import Trash from 'lucide-svelte/icons/trash';

	let { data } = $props();

	const formOptions = { validators: zodClient(deleteVideoSchema) };
	const deleteForm = $derived.by(() => superForm(data?.IdeleteVideoSchema ?? {}, formOptions));
	const { enhance: deleteEnhance, message: deleteMessage } = $derived(deleteForm);

	const kindLabels: Record<string, string> = {
		workout: 'Sport',
		discovery: 'Découverte'
	};

	const categoryLabels: Record<string, string> = {
		MEDITATION: 'Méditation',
		MINDSET: 'Mindset',
		BREATHWORK: 'Breathwork',
		MOTIVATION: 'Motivation',
		EXPLICATION: 'Explication'
	};

	const positionLabels: Record<string, string> = {
		PRE: 'Pré-séance',
		VID1: 'Vidéo 1',
		VID2: 'Vidéo 2'
	};

	const statusLabels: Record<string, string> = {
		pending: 'En attente',
		pendingupload: 'À uploader',
		queued: 'En file',
		inprogress: 'Traitement',
		ready: 'Prêt',
		error: 'Erreur'
	};

	function formatDuration(v: unknown): string {
		const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
		if (!Number.isFinite(n) || n <= 0) return '—';
		const total = Math.round(n);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const videoColumns = $state([
		{
			key: 'kind',
			label: 'Type',
			formatter: (v: unknown) => kindLabels[String(v)] ?? String(v)
		},
		{ key: 'title', label: 'Titre' },
		{
			key: 'sessionName',
			label: 'Séance / Catégorie',
			formatter: (v: unknown) => {
				if (v == null || v === '') return '';
				const s = String(v);
				return categoryLabels[s] ?? s;
			}
		},
		{
			key: 'position',
			label: 'Position',
			formatter: (v: unknown) =>
				v == null || v === '' ? '—' : (positionLabels[String(v)] ?? String(v))
		},
		{
			key: 'durationSeconds',
			label: 'Durée',
			formatter: formatDuration
		},
		{
			key: 'status',
			label: 'Statut',
			formatter: (v: unknown) => statusLabels[String(v)] ?? String(v)
		},
		{
			key: 'cloudflareUid',
			label: 'UID Cloudflare'
		}
	]);

	// Combine sessionName / category dans la même colonne pour rester compact
	type VideoRow = {
		id: string;
		realId: string;
		kind: 'workout' | 'discovery';
		sessionName?: string | null;
		category?: string | null;
		[key: string]: unknown;
	};
	const tableData = $derived(
		((data?.videos ?? []) as VideoRow[]).map((v) => ({
			...v,
			sessionName: v.kind === 'workout' ? (v.sessionName ?? '—') : (v.category ?? '—')
		}))
	);

	const videoActions = $derived.by(() => [
		{
			type: 'link',
			name: 'Modifier',
			url: (item: { id: string; [k: string]: unknown }) => {
				const kind = item.kind as string;
				const realId = item.realId as string;
				return `/admin/videos/${kind}/${realId}`;
			},
			icon: Pencil
		},
		{
			type: 'form',
			name: 'delete',
			url: '?/deleteVideo',
			enhanceAction: deleteEnhance,
			icon: Trash
		}
	]);

	$effect(() => {
		if ($deleteMessage) toast.success($deleteMessage as string);
	});
</script>

<div class="ccc w-full space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="max-w-2xl text-sm text-muted-foreground">
			L’upload se fait sur la page <strong>Nouvelle vidéo</strong> : choix du fichier, envoi direct vers
			Cloudflare (tus), puis enregistrement des métadonnées. Prérequis : variables
			<code class="rounded bg-muted px-1 font-mono text-xs">CLOUDFLARE_ACCOUNT_ID</code> et
			<code class="rounded bg-muted px-1 font-mono text-xs">CLOUDFLARE_STREAM_API_TOKEN</code> dans
			<code class="rounded bg-muted px-1 font-mono text-xs">.env</code>.
		</p>
		<Button href="/admin/videos/create">
			<Plus class="size-4" />
			Nouvelle vidéo
		</Button>
	</div>
	<Table
		name="Vidéos Cloudflare Stream"
		columns={videoColumns}
		data={tableData}
		actions={videoActions}
		addLink="/admin/videos/create"
	/>
</div>
