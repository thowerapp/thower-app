<script lang="ts">
	import type { PageProps } from './$types';
	import { formatDate } from '$lib/utils/formatDate';
	import { Button } from '$shadcn/button';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';

	let { data }: PageProps = $props();

	const contact = $derived(data.contact as {
		id: string;
		name: string;
		email: string;
		subject: string | null;
		message: string;
		createdAt: string;
	});
</script>

<div class="mx-auto max-w-2xl px-4 py-8">
	<a href="/admin/contact">
		<Button variant="ghost" class="mb-6 -ml-2">
			<ArrowLeft class="mr-2 size-4" />
			Retour aux messages
		</Button>
	</a>

	<article class="rounded-xl border bg-card shadow-sm overflow-hidden">
		<div class="border-b bg-muted/50 px-6 py-4">
			<h1 class="text-xl font-semibold">Message de {contact.name}</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{formatDate(contact.createdAt)}
			</p>
		</div>

		<dl class="divide-y divide-border">
			<div class="px-6 py-4">
				<dt class="text-sm font-medium text-muted-foreground">Email</dt>
				<dd class="mt-1">
					<a
						href="mailto:{contact.email}"
						class="text-primary hover:underline"
					>
						{contact.email}
					</a>
				</dd>
			</div>

			{#if contact.subject}
				<div class="px-6 py-4">
					<dt class="text-sm font-medium text-muted-foreground">Sujet</dt>
					<dd class="mt-1">{contact.subject}</dd>
				</div>
			{/if}

			<div class="px-6 py-4">
				<dt class="text-sm font-medium text-muted-foreground">Message</dt>
				<dd class="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-[15px] leading-relaxed">
					{contact.message}
				</dd>
			</div>
		</dl>
	</article>
</div>
