<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data } = $props<{ data: PageData }>();

	let validated = $state(false);
	let checkingStatus = $state(false);

	onMount(() => {
		// Vérifier l'état immédiatement
		checkStatus();

		// Polling toutes les 15 secondes
		const interval = setInterval(checkStatus, 15000);

		return () => {
			clearInterval(interval);
		};
	});

	async function checkStatus() {
		try {
			checkingStatus = true;
			const response = await fetch('/api/check-photo-status');
			if (!response.ok) return;

			const { validated: isValidated } = (await response.json()) as {
				validated: boolean;
			};

			if (isValidated) {
				validated = true;
				// Redirect automatique après 1s
				setTimeout(() => {
					goto('/auth/measurement');
				}, 1000);
			}
		} catch (error) {
			console.error('Erreur lors de la vérification du statut:', error);
		} finally {
			checkingStatus = false;
		}
	}
</script>

<div class="pending-container">
	<div class="pending-card">
		{#if validated}
			<div class="success-state">
				<div class="success-icon">✓</div>
				<h1>Photos validées !</h1>
				<p>Redirection en cours...</p>
			</div>
		{:else}
			<div class="waiting-state">
				<div class="loader">
					<div class="spinner"></div>
				</div>
				<h1>Analyse en cours</h1>
				<p class="description">
					Vos photos sont en cours d'analyse par notre équipe. Cela peut prendre quelques minutes.
				</p>
				<p class="status">
					{checkingStatus ? 'Vérification du statut...' : 'En attente de validation'}
				</p>
			</div>
		{/if}

		<div class="footer">
			<p class="support-text">
				Besoin d'aide ? <a href="mailto:support@thower.app">Contacter le support</a>
			</p>
		</div>
	</div>
</div>

<style>
	.pending-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: 20px;
		background: var(--bg);
	}

	.pending-card {
		width: 100%;
		max-width: 480px;
		padding: 60px 40px;
		background: var(--s1);
		border-radius: 8px;
		border: 1px solid var(--br);
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.waiting-state,
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}

	.loader {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
	}

	.spinner {
		width: 60px;
		height: 60px;
		border: 3px solid rgba(0, 229, 255, 0.2);
		border-top-color: var(--cy);
		border-radius: 50%;
		animation: spin 1.2s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.success-icon {
		width: 80px;
		height: 80px;
		background: rgba(51, 255, 170, 0.15);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		color: var(--g);
		font-weight: 700;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
		color: var(--tx);
		font-family: var(--fh2);
	}

	.description {
		font-size: 0.875rem;
		color: var(--txd);
		margin: 0;
		line-height: 1.5;
		max-width: 380px;
	}

	.status {
		font-size: 0.75rem;
		color: var(--tx2);
		margin: 0;
		font-family: var(--fb);
		animation: blink 2s ease-in-out infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	.footer {
		border-top: 1px solid var(--br);
		padding-top: 20px;
	}

	.support-text {
		font-size: 0.75rem;
		color: var(--txd);
		margin: 0;
	}

	a {
		color: var(--cy);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
