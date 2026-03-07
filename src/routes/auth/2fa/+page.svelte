<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import * as InputOTP from '$shadcn/input-otp';
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { totpCodeSchema } from '$lib/schema/auth/totpCodeSchema';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(totpCodeSchema),
		id: 'totpForm'
	};

	const totpForm = $derived.by(() => superForm(data?.totpForm ?? {}, formOptions));

	const { form: totpData, enhance: totpEnhance, message: totpMessage } = $derived(totpForm);

	$effect(() => {
		if ($totpMessage) {
			toast.error($totpMessage);
		}
	});
</script>

<div class="w-screen h-screen ccc">
	<Card.Root class="mx-auto w-full max-w-sm">
		<Card.Content class="pt-6">
			<form method="POST" action="?/totp" use:totpEnhance class="flex flex-col gap-6">
				<div class="flex flex-col items-center gap-2 text-center">
					<h1 class="text-xl font-bold">Authentification à deux facteurs</h1>
					<p class="text-sm text-muted-foreground">
						Saisissez le code à 6 chiffres affiché par votre application d'authentification.
					</p>
				</div>

				<Form.Field name="code" form={totpForm}>
					<Form.Control>
						<Form.Label for="totp-code" class="sr-only">Code de vérification</Form.Label>
						<InputOTP.Root
							id="totp-code"
							name="code"
							maxlength={6}
							required
							autocomplete="one-time-code"
							value={($totpData.code ?? '') as string}
							onValueChange={(v) => ($totpData.code = v)}
							class="gap-4 justify-center *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl"
						>
							{#snippet children({ cells })}
								<InputOTP.Group
									class="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl"
								>
									{#each cells.slice(0, 3) as cell, i (i)}
										<InputOTP.Slot {cell} />
									{/each}
								</InputOTP.Group>
								<InputOTP.Separator />
								<InputOTP.Group
									class="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl"
								>
									{#each cells.slice(3, 6) as cell, i (i)}
										<InputOTP.Slot {cell} />
									{/each}
								</InputOTP.Group>
							{/snippet}
						</InputOTP.Root>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Button type="submit" class="w-full">Vérifier</Button>

				<p class="text-center text-sm text-muted-foreground">
					<a href="/auth/2fa/reset" class="text-orange-700 hover:underline"
						>Utiliser un code de récupération</a
					>
				</p>
			</form>
		</Card.Content>
	</Card.Root>
</div>
