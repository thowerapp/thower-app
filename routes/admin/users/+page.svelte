<script lang="ts">
	import Table from '$components/Table.svelte';
	import { deleteUserSchema } from '$lib/schema/users/userSchema.js';
	import { zodClient } from '$lib/superforms-zod';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash from 'lucide-svelte/icons/trash';

	// Props
	let { data } = $props();

	// Form handling with superForm
	const formOptions = {
		validators: zodClient(deleteUserSchema)
	};

	const deleteUser = $derived.by(() => superForm(data?.IdeleteUserSchema ?? {}, formOptions));

	const {
		form: deleteUserData,
		enhance: deleteUserEnhance,
		message: deleteUserMessage
	} = $derived(deleteUser);

	// Define table columns
	const userColumns = $state([
		{ key: 'name', label: 'Nom' },
		{ key: 'email', label: 'Email' },
		{ key: 'role', label: 'Role' }
	]);

	// Define actions with icons
	const userActions = $derived.by(() => [
		{
			type: 'link',
			name: 'edit',
			url: (item: any) => `/admin/users/${item.id}`,
			icon: Pencil
		},
		{
			type: 'form',
			name: 'delete',
			url: '?/deleteUser',
			enhanceAction: deleteUserEnhance,
			icon: Trash
		}
	]);

	// Show toast on delete message
	$effect(() => {
		if ($deleteUserMessage) {
			toast.success($deleteUserMessage);
		}
	});
</script>

<!-- UI Table -->
<div class="ccc w-[100%]">
	<Table
		name="Utilisateurs"
		columns={userColumns}
		data={data.allUsers ?? []}
		actions={userActions}
		addLink="/admin/users/create"
	/>
</div>
