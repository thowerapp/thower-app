<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { adminUpdateUserSchema } from '$lib/schema/users/userSchema.js';
	import { goto } from '$app/navigation';
	import * as Tabs from '$shadcn/tabs';
	import * as Alert from '$shadcn/alert';
	import { Button } from '$shadcn/button';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import type { AdminUserOptions, UserSelected } from './types';
	import AdminUserCompteTab from './tabs/AdminUserCompteTab.svelte';
	import AdminUserProfilTab from './tabs/AdminUserProfilTab.svelte';
	import AdminUserPaiementTab from './tabs/AdminUserPaiementTab.svelte';
	import AdminUserSportTab from './tabs/AdminUserSportTab.svelte';
	import AdminUserCalendrierTab from './tabs/AdminUserCalendrierTab.svelte';
	import AdminUserPointsTab from './tabs/AdminUserPointsTab.svelte';
	import AdminUserNutritionTab from './tabs/AdminUserNutritionTab.svelte';
	import AdminUserTachesTab from './tabs/AdminUserTachesTab.svelte';
	import UserCog from 'lucide-svelte/icons/user-cog';
	import HeartPulse from 'lucide-svelte/icons/heart-pulse';
	import CreditCard from 'lucide-svelte/icons/credit-card';
	import Dumbbell from 'lucide-svelte/icons/dumbbell';
	import Calendar from 'lucide-svelte/icons/calendar';
	import Award from 'lucide-svelte/icons/award';
	import Salad from 'lucide-svelte/icons/salad';
	import ListChecks from 'lucide-svelte/icons/list-checks';

	let { data, form } = $props();

	type AdminAlert = {
		type: 'success' | 'error';
		title: string;
		description: string;
	};

	type ProgramSettingsActionResult = {
		action?: string;
		success?: boolean;
		message?: string;
		regenerated?: boolean;
	};

	let adminAlert = $state<AdminAlert | null>(null);

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
				adminAlert = {
					type: 'success',
					title: 'Utilisateur mis à jour',
					description: 'Les modifications ont été enregistrées. Redirection vers la liste des utilisateurs...'
				};
				setTimeout(() => goto('/admin/users'), 900);
			}
			if (r?.type === 'failure' && r?.data?.message === 'Email déjà utilisé') {
				adminAlert = {
					type: 'error',
					title: 'Email déjà utilisé',
					description: 'Choisissez une autre adresse email pour ce compte utilisateur.'
				};
			}
		}
	};

	function programSettingsActionToAlert(form: ProgramSettingsActionResult | undefined): AdminAlert | null {
		if (form?.action !== 'updateProgramSettings') return null;

		if (form.success) {
			return {
				type: 'success',
				title: 'Paramètres enregistrés',
				description: form.regenerated
					? 'Les paramètres du programme ont été enregistrés et le programme a été régénéré.'
					: 'Les paramètres du programme ont été enregistrés.'
			};
		}

		if (form.message) {
			return {
				type: 'error',
				title: 'Paramètres non enregistrés',
				description: form.message
			};
		}

		return null;
	}

	$effect(() => {
		const alert = programSettingsActionToAlert(form as ProgramSettingsActionResult | undefined);
		if (alert) adminAlert = alert;
	});

	const updateUserForm = $derived.by(() => superForm(data.formSchema!, formOptions));
	const userSelected = $derived((data?.userSelected ?? {}) as UserSelected);
	const adminOptions = $derived((data?.adminOptions ?? {}) as AdminUserOptions);
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

		{#if adminAlert}
			<Alert.Root
				variant={adminAlert.type === 'error' ? 'destructive' : 'default'}
				class={[
					'mb-4',
					adminAlert.type === 'success' &&
						'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
				]}
			>
				{#if adminAlert.type === 'success'}
					<CircleCheck class="text-emerald-600 dark:text-emerald-400" />
				{:else}
					<TriangleAlert />
				{/if}
				<Alert.Title>{adminAlert.title}</Alert.Title>
				<Alert.Description>{adminAlert.description}</Alert.Description>
			</Alert.Root>
		{/if}

		<Tabs.Root value="compte" class="w-full">
			<Tabs.List
				class="mb-4 grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8"
			>
				<Tabs.Trigger value="compte" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<UserCog class="size-4 shrink-0" />
					Compte
				</Tabs.Trigger>
				<Tabs.Trigger value="profil" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<HeartPulse class="size-4 shrink-0" />
					Profil & santé
				</Tabs.Trigger>
				<Tabs.Trigger value="paiement" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<CreditCard class="size-4 shrink-0" />
					Paiement
				</Tabs.Trigger>
				<Tabs.Trigger value="sport" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<Dumbbell class="size-4 shrink-0" />
					Sport
				</Tabs.Trigger>
				<Tabs.Trigger value="calendrier" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<Calendar class="size-4 shrink-0" />
					Calendrier
				</Tabs.Trigger>
				<Tabs.Trigger value="points" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<Award class="size-4 shrink-0" />
					Points & badges
				</Tabs.Trigger>
				<Tabs.Trigger value="nutrition" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<Salad class="size-4 shrink-0" />
					Nutrition & courses
				</Tabs.Trigger>
				<Tabs.Trigger value="taches" class="h-auto flex-col gap-1 whitespace-normal py-2 text-xs sm:flex-row sm:text-sm">
					<ListChecks class="size-4 shrink-0" />
					Tâches & défis
				</Tabs.Trigger>
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
				<AdminUserSportTab {userSelected} {adminOptions} />
			</Tabs.Content>

			<Tabs.Content value="calendrier" class="space-y-6">
				<AdminUserCalendrierTab {userSelected} />
			</Tabs.Content>

			<Tabs.Content value="points" class="space-y-6">
				<AdminUserPointsTab {userSelected} {adminOptions} />
			</Tabs.Content>

			<Tabs.Content value="nutrition" class="space-y-6">
				<AdminUserNutritionTab {userSelected} {adminOptions} />
			</Tabs.Content>

			<Tabs.Content value="taches" class="space-y-6">
				<AdminUserTachesTab {userSelected} {adminOptions} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>
