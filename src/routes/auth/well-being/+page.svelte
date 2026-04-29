<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod } from '$lib/superforms-zod';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import { wellBeingSchema } from '$lib/schema/well-being/wellBeingSchema';
	import StepBienEtre from '../measurement/StepBienEtre.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const formOptions = {
		validators: zod(wellBeingSchema),
		id: 'wellBeingForm',
		dataType: 'json' as const
	};

	const wellBeingForm = $derived.by(() => superForm(data.wellBeingForm, formOptions));
	const {
		form: wellBeingData,
		enhance: wellBeingEnhance,
		message: wellBeingMessage
	} = $derived(wellBeingForm);

	$effect(() => {
		if ($wellBeingMessage) toast.success($wellBeingMessage);
	});
</script>

<div class="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
	<div class="mb-6 sm:mb-8">
		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold font-['DM_Sans'] text-yellow-500 mb-2 tracking-wide">
			Ton Bien-être
		</h1>
		<p class="text-sm sm:text-base font-['Public_Sans'] font-light text-white/50 leading-relaxed">
			Donne-nous un snapshot honnête de où tu en es aujourd'hui. On le remettra à jour chaque mois.
		</p>
	</div>

	<form method="POST" use:wellBeingEnhance class="space-y-4 sm:space-y-6">
		<div class="overflow-hidden rounded-lg bg-black">
			<div class="p-4 sm:p-6">
				<StepBienEtre form={wellBeingForm} formData={wellBeingData} initialData={$wellBeingData} />
			</div>
		</div>

		<div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-between sm:items-center mt-4 sm:mt-6">
			<a
				href="/auth/photos"
				class="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 font-['DM_Sans'] text-sm font-medium uppercase tracking-wide text-white/70 transition-colors hover:bg-white/10"
			>
				Retour aux photos
			</a>

			<Button
				type="submit"
				class="w-full sm:w-auto gap-2 font-['DM_Sans'] font-bold bg-yellow-500 hover:bg-yellow-600 text-black uppercase tracking-widest"
			>
				Continuer vers formulaire
			</Button>
		</div>
	</form>
</div>
