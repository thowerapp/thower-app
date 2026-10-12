<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import { Input } from '$shadcn/input';
	import { Label } from '$shadcn/label';
	import { Textarea } from '$shadcn/textarea';
	import { Building2 } from 'lucide-svelte';
	import type { CompanyProfileData } from '$lib/company/companyProfile';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Field = {
		name: keyof CompanyProfileData;
		label: string;
		hint?: string;
		placeholder?: string;
		type?: 'text' | 'email' | 'url' | 'textarea';
		wide?: boolean;
	};
	type Section = { title: string; description: string; fields: Field[] };

	const sections: Section[] = [
		{
			title: 'Identité',
			description:
				'Le nom affiché partout sur le site, et la raison sociale utilisée sur les documents.',
			fields: [
				{ name: 'brandName', label: 'Nom affiché sur le site', placeholder: 'Thower' },
				{
					name: 'legalName',
					label: 'Raison sociale',
					hint: 'Laisser vide si identique au nom affiché.',
					placeholder: 'Thower SAS'
				},
				{ name: 'legalForm', label: 'Forme juridique', placeholder: 'SAS' },
				{ name: 'shareCapital', label: 'Capital social', placeholder: '10 000 €' },
				{
					name: 'siret',
					label: 'SIRET',
					hint: '14 chiffres, espaces acceptés.',
					placeholder: '123 456 789 00012'
				},
				{ name: 'rcs', label: 'Immatriculation (RCS)', placeholder: 'RCS Paris B 123 456 789' },
				{ name: 'vatNumber', label: 'N° de TVA intracommunautaire', placeholder: 'FR12345678901' },
				{ name: 'apeCode', label: 'Code APE / NAF', placeholder: '9313Z' }
			]
		},
		{
			title: 'Adresse du siège',
			description: 'Affichée dans les mentions légales et sur les factures.',
			fields: [
				{ name: 'addressLine1', label: 'Adresse', wide: true },
				{ name: 'addressLine2', label: 'Complément d’adresse', wide: true },
				{ name: 'postalCode', label: 'Code postal' },
				{ name: 'city', label: 'Ville' },
				{ name: 'country', label: 'Pays', placeholder: 'France' }
			]
		},
		{
			title: 'Contact',
			description:
				'Repris dans la politique de confidentialité, les mentions légales et les factures.',
			fields: [
				{
					name: 'email',
					label: 'E-mail de contact',
					type: 'email',
					placeholder: 'contact@thower.fr'
				},
				{ name: 'phone', label: 'Téléphone', placeholder: '01 23 45 67 89' },
				{ name: 'website', label: 'Site web', type: 'url', placeholder: 'https://thower.com' }
			]
		},
		{
			title: 'Mentions légales',
			description:
				'Obligatoires pour un site professionnel : directeur de la publication et hébergeur.',
			fields: [
				{ name: 'publicationDirector', label: 'Directeur de la publication' },
				{ name: 'hostName', label: 'Hébergeur', placeholder: 'Vercel Inc.' },
				{ name: 'hostAddress', label: 'Adresse de l’hébergeur', wide: true },
				{
					name: 'hostWebsite',
					label: 'Site de l’hébergeur',
					type: 'url',
					placeholder: 'https://vercel.com'
				}
			]
		},
		{
			title: 'Factures',
			description:
				'Le PDF de facture reprend l’identité et l’adresse ci-dessus, avec le logo et la mention suivants.',
			fields: [
				{
					name: 'logoUrl',
					label: 'Logo',
					hint: 'Chemin d’un fichier du site (/logo-app.png) ou adresse https://. Facultatif.',
					placeholder: '/logo-app.png',
					wide: true
				},
				{
					name: 'invoiceNote',
					label: 'Mention de pied de facture',
					type: 'textarea',
					hint: 'Ex. « TVA non applicable, art. 293 B du CGI » ou conditions de paiement.',
					wide: true
				}
			]
		}
	];

	// Après une erreur, on reprend ce que l'admin avait saisi ; sinon la fiche enregistrée.
	const values = $derived(
		((form as { values?: Record<string, string> } | null)?.values ?? data.profile) as Record<
			string,
			string | null
		>
	);
	const errors = $derived(
		((form as { errors?: Record<string, string> } | null)?.errors ?? {}) as Record<string, string>
	);
	let saving = $state(false);

	$effect(() => {
		if (form?.success) toast.success(String(form.message));
		else if (form?.message) toast.error(String(form.message));
	});
</script>

<div class="ccc w-full max-w-3xl space-y-6 p-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<Building2 class="h-5 w-5 text-primary" />
			Informations de l’entreprise
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			Saisies une seule fois, elles sont reprises sur le site (mentions légales, politique de
			confidentialité, pied de page) et sur les PDF (factures, bordereaux, chiffre d’affaires).
		</p>
	</div>

	<form
		method="POST"
		action="?/save"
		class="space-y-6"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				saving = false;
				await update({ reset: false });
			};
		}}
	>
		{#each sections as section (section.title)}
			<Card.Root>
				<Card.Header>
					<Card.Title>{section.title}</Card.Title>
					<Card.Description>{section.description}</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-4 sm:grid-cols-2">
					{#each section.fields as field (field.name)}
						<div class="space-y-1.5 {field.wide ? 'sm:col-span-2' : ''}">
							<Label for="company-{field.name}">{field.label}</Label>
							{#if field.type === 'textarea'}
								<Textarea
									id="company-{field.name}"
									name={field.name}
									value={values[field.name] ?? ''}
									class="min-h-20"
								/>
							{:else}
								<Input
									id="company-{field.name}"
									name={field.name}
									type={field.type ?? 'text'}
									value={values[field.name] ?? ''}
									placeholder={field.placeholder}
								/>
							{/if}
							{#if errors[field.name]}
								<p class="text-sm text-destructive" role="alert">{errors[field.name]}</p>
							{:else if field.hint}
								<p class="text-xs text-muted-foreground">{field.hint}</p>
							{/if}
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}

		<Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
	</form>
</div>
