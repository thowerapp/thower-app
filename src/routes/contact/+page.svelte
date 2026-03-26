<script lang="ts">
	import type { PageProps } from './$types';
	import * as Form from '$shadcn/form';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { Textarea } from '$shadcn/textarea';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from '$lib/superforms-zod';
	import { contactSchema } from '$lib/schema/contact/contactSchema';
	import { toast } from 'svelte-sonner';
	import SEO from '$lib/components/SEO.svelte';

	let { data }: PageProps = $props();

	const formOptions = {
		validators: zodClient(contactSchema),
		id: 'contactForm',
		resetForm: true
	};

	const contactForm = $derived.by(() => superForm(data.form, formOptions));

	const { form, enhance, message: formMessage } = $derived(contactForm);

	const errorMessage = $derived(
		'message' in data && typeof (data as { message?: string }).message === 'string'
			? (data as { message: string }).message
			: null
	);

	$effect(() => {
		const msg = $formMessage;
		if (msg) toast.success(msg);
	});

	$effect(() => {
		if (errorMessage) toast.error(errorMessage);
	});
</script>

<SEO pageKey="contact" />

<main class="page">
	<header class="page-header">
		<p class="page-eyebrow">— Nous contacter</p>
		<h1>Envoyer un <span class="gold">message</span></h1>
		<p class="page-subtitle">
			Une question ou un projet ? Envoyez-nous un message, nous vous répondrons rapidement.
		</p>
	</header>

	<div class="mx-auto max-w-lg w-full px-4">
		<form
			method="POST"
			action="?/submit"
			use:enhance
			class="card p-6 space-y-5"
		>
			<Form.Field name="name" form={contactForm}>
				<Form.Control>
					<Form.Label>Nom</Form.Label>
					<Input
						name="name"
						type="text"
						bind:value={$form.name}
						placeholder="Votre nom"
						required
						autocomplete="name"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="email" form={contactForm}>
				<Form.Control>
					<Form.Label>Email</Form.Label>
					<Input
						name="email"
						type="email"
						bind:value={$form.email}
						placeholder="votre@email.fr"
						required
						autocomplete="email"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="subject" form={contactForm}>
				<Form.Control>
					<Form.Label>Sujet <span style="color: rgba(240, 237, 232, 0.5); font-weight: 300;">(optionnel)</span></Form.Label>
					<Input
						name="subject"
						type="text"
						bind:value={$form.subject}
						placeholder="Objet de votre message"
						autocomplete="off"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field name="message" form={contactForm}>
				<Form.Control>
					<Form.Label>Message</Form.Label>
					<Textarea
						name="message"
						bind:value={$form.message as string}
						placeholder="Décrivez votre demande ou votre projet..."
						rows={5}
						required
						class="min-h-[120px] resize-y"
					/>
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="pt-2">
				<Button type="submit" class="w-full sm:w-auto btn-primary">Envoyer le message</Button>
			</div>
		</form>
	</div>
</main>
