<script lang="ts">
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import * as InputOTP from '$shadcn/input-otp';
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { totpSchema } from '$lib/schema/auth/totpSchema';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(totpSchema),
		id: 'twoFactorForm'
	};

	const twoFactorForm = $derived.by(() => superForm(data.totpForm, formOptions));

	const { form: twoFactorData, enhance: formEnhance, message: formMessage } = $derived(twoFactorForm);

	$effect(() => {
		if ($formMessage === 'TOTP setup completed successfully') {
			toast.success($formMessage);
		} else if ($formMessage) {
			toast.error($formMessage);
		}
	});
</script>

<div class="w-screen h-screen ccc">
	<Card.Root class="mx-auto w-full max-w-sm">
		<Card.Content class="pt-6">
			<div class="flex flex-col items-center gap-6 text-center">
				<h1 class="text-xl font-bold">Configurer l'authentification à deux facteurs</h1>
				<p class="text-sm text-muted-foreground">
					Scannez le QR code avec votre application d'authentification, puis saisissez le code à 6
					chiffres ci-dessous.
				</p>

				<!-- QR Code -->
				<div class="w-64 h-64">
					{@html data.qrcode}
				</div>

				<form
					method="POST"
					use:formEnhance
					action="?/setuptotp"
					class="flex flex-col gap-6 w-full"
				>
					<input type="hidden" name="encodedTOTPKey" value={data.encodedTOTPKey} required />

					<Form.Field name="code" form={twoFactorForm}>
						<Form.Control>
							<Form.Label for="setup-totp-code" class="sr-only">Code de vérification</Form.Label>
							<InputOTP.Root
								id="setup-totp-code"
								name="code"
								maxlength={6}
								required
								value={($twoFactorData.code ?? '') as string}
								onValueChange={(v) => ($twoFactorData.code = v)}
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

					<Button type="submit" class="w-full" variant="outline">Valider</Button>
				</form>
			</div>
		</Card.Content>
	</Card.Root>
</div>
