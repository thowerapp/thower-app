<script lang="ts">
	import Table from '$components/Table.svelte';
	import { toast } from 'svelte-sonner';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash from 'lucide-svelte/icons/trash';

	let { data } = $props();

	const taskColumns = $state([
		{ key: 'order', label: '#' },
		{ key: 'label', label: 'Libellé' },
		{
			key: 'type',
			label: 'Type',
			formatter: (v: unknown) => (v === 'VIDEO' ? 'Vidéo' : 'Standard')
		},
		{ key: 'videoTitle', label: 'Vidéo associée' },
		{
			key: 'points',
			label: 'Points',
			formatter: (v: unknown) => `${v} pts`
		},
		{ key: 'joursLabel', label: 'Jours' },
		{
			key: 'active',
			label: 'Statut',
			formatter: (v: unknown) => (v ? 'Actif' : 'Inactif')
		}
	]);

	const taskActions = [
		{
			type: 'link',
			name: 'Modifier',
			url: (item: { id: string }) => `/admin/daily-tasks/${item.id}`,
			icon: Pencil
		},
		{
			type: 'form',
			name: 'deleteTask',
			url: '?/deleteTask',
			icon: Trash,
			onSuccess: () => toast.success('Tâche supprimée.')
		}
	];
</script>

<div class="ccc w-full">
	<Table
		name={`Tâches journalières (${data.tasks?.length ?? 0})`}
		columns={taskColumns}
		data={data.tasks ?? []}
		actions={taskActions}
		addLink="/admin/daily-tasks/create"
	/>
</div>
