<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { adminUpdateUserSchema } from '$lib/schema/users/userSchema.js';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import * as Tabs from '$shadcn/tabs';
	import { Button } from '$shadcn/button';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import type { UserSelected } from './types';
	import AdminUserCompteTab from './tabs/AdminUserCompteTab.svelte';
	import AdminUserProfilTab from './tabs/AdminUserProfilTab.svelte';
	import AdminUserPaiementTab from './tabs/AdminUserPaiementTab.svelte';
	import AdminUserSportTab from './tabs/AdminUserSportTab.svelte';
	import AdminUserCalendrierTab from './tabs/AdminUserCalendrierTab.svelte';
	import AdminUserPointsTab from './tabs/AdminUserPointsTab.svelte';
	import AdminUserNutritionTab from './tabs/AdminUserNutritionTab.svelte';
	import AdminUserTachesTab from './tabs/AdminUserTachesTab.svelte';
	import AdminUserDebugTab from './tabs/AdminUserDebugTab.svelte';

	let { data } = $props();

	$effect(() => {
		if (data !== undefined && !data?.formSchema) {
			throw new Error('Missing form data');
		}
	});

	const formOptions = {
		validators: zodClient(adminUpdateUserSchema),
		id: 'updateUser',
		onResult: (result: { result?: { type?: string; data?: { form?: { message?: string }; message?: string } } }) => {
			const r = result?.result as { type?: string; data?: { form?: { message?: string }; message?: string } } | undefined;
			if (r?.type === 'success' && r?.data?.form?.message === 'User updated successfully') {
				toast.success(r.data.form.message);
				setTimeout(() => goto('/admin/users'), 0);
			}
			if (r?.type === 'failure' && r?.data?.message === 'Email déjà utilisé') {
				toast.error('Email déjà utilisé');
			}
		}
	};

	const updateUserForm = $derived.by(() => superForm(data.formSchema!, formOptions));
	const userSelected = $derived((data?.userSelected ?? {}) as UserSelected);
</script>

<div class="min-h-screen absolute">
	<div class="container mx-auto p-4 w-[100%]">
		<a href="/admin/users">
			<Button variant="ghost" class="mb-4 -ml-2">
				<ArrowLeft class="mr-2 size-4" />
				Retour aux utilisateurs
			</Button>
		</a>
		<h1 class="text-2xl font-bold mb-4">Modifier l'utilisateur</h1>

		<Tabs.Root value="compte" class="w-full">
			<Tabs.List class="grid w-full grid-cols-4 lg:grid-cols-9 gap-1 mb-4">
				<Tabs.Trigger value="compte">Compte</Tabs.Trigger>
				<Tabs.Trigger value="profil">Profil & santé</Tabs.Trigger>
				<Tabs.Trigger value="paiement">Paiement</Tabs.Trigger>
				<Tabs.Trigger value="sport">Sport</Tabs.Trigger>
				<Tabs.Trigger value="calendrier">Calendrier</Tabs.Trigger>
				<Tabs.Trigger value="points">Points & badges</Tabs.Trigger>
				<Tabs.Trigger value="nutrition">Nutrition & courses</Tabs.Trigger>
				<Tabs.Trigger value="taches">Tâches & défis</Tabs.Trigger>
				<Tabs.Trigger value="debug">Debug</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="compte" class="space-y-6">
				<AdminUserCompteTab {userSelected} {updateUserForm} />
			</Tabs.Content>

			<Tabs.Content value="profil" class="space-y-6">
				<AdminUserProfilTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="paiement" class="space-y-6">
				<AdminUserPaiementTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="sport" class="space-y-6">
				<AdminUserSportTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="calendrier" class="space-y-6">
				<AdminUserCalendrierTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="points" class="space-y-6">
				<AdminUserPointsTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="nutrition" class="space-y-6">
				<AdminUserNutritionTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="taches" class="space-y-6">
				<AdminUserTachesTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="debug" class="space-y-6">
				<AdminUserDebugTab {userSelected} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
