<script lang="ts">
	import Table from '$components/Table.svelte';
	import { deleteContactSchema } from '$lib/schema/contact/contactSchema';
	import { zodClient } from '$lib/superforms-zod';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import Trash from 'lucide-svelte/icons/trash';
	import Eye from 'lucide-svelte/icons/eye';
	import { formatDate } from '$lib/utils/formatDate';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(deleteContactSchema)
	};

	const deleteContact = $derived.by(() => superForm(data?.IdeleteContactSchema ?? {}, formOptions));

	const {
		form: deleteContactData,
		enhance: deleteContactEnhance,
		message: deleteContactMessage
	} = $derived(deleteContact);

	const contactColumns = $state([
		{ key: 'name', label: 'Nom' },
		{ key: 'email', label: 'Email' },
		{ key: 'subject', label: 'Sujet' },
		{
			key: 'message',
			label: 'Message',
			formatter: (v: unknown) => {
				const val = String(v ?? '');
				return val && val.length > 60 ? val.slice(0, 60) + '…' : val || '';
			}
		},
		{
			key: 'createdAt',
			label: 'Date',
			formatter: (v: unknown) => (v != null && v !== '' ? formatDate(String(v)) : '')
		}
	]);

	const contactActions = $derived.by(() => [
		{
			type: 'link',
			name: 'Voir',
			url: (item: { id: string }) => `/admin/contact/${item.id}`,
			icon: Eye
		},
		{
			type: 'form',
			name: 'delete',
			url: '?/deleteContact',
			enhanceAction: deleteContactEnhance,
			icon: Trash
		}
	]);

	$effect(() => {
		if ($deleteContactMessage) {
			toast.success($deleteContactMessage);
		}
	});
</script>

<div class="ccc w-full">
	<Table
		name="Messages contact"
		columns={contactColumns}
		data={data.allContacts ?? []}
		actions={contactActions}
	/>
</div>
