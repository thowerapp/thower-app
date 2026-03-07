<script lang="ts">
	/* ── Deps ─────────────────────────────────────────────────────────────── */
	import { goto } from '$app/navigation';
	import * as Drawer from '$shadcn/drawer';
	import { Button, buttonVariants } from '$shadcn/button';
	import { Menu, Settings, Cog, LogOut } from 'lucide-svelte';
	import { mode } from 'mode-watcher';
	import { enhance } from '$app/forms';

	type User = { googleId?: string | null } | null;

	let { user = null }: { user?: User } = $props();

	const isLoggedIn = $derived(!!user);
	const showAccountLink = $derived(!!user && !user.googleId);
	const links = $derived([
		{ href: '/', label: 'Accueil' },
		{ href: '/reglementations', label: 'Reglementations' },
		{ href: '/contact', label: 'Contact' },
		...(isLoggedIn ? [] : [{ href: '/auth/login', label: 'Se connecter' }])
	]);

	/* ── State ────────────────────────────────────────────────────────────── */
	let drawerOpen = $state(false);
	let strokeColor = $derived(mode.current === 'light' ? '#00021a' : '#00c2ff');
	let isHovered = $state(false);

	/* ── Helpers ──────────────────────────────────────────────────────────── */
	function navigateAndClose(href: string) {
		goto(href);
		drawerOpen = false;
	}
</script>

<!-- Menu vertical à gauche -->
<div 
	class="navVertical"
	class:hovered={isHovered}
	onmouseenter={() => isHovered = true}
	onmouseleave={() => isHovered = false}
>
	<nav
		class="backdrop-blur-3xl shadow-xl border border-white/50 rounded-2xl
			   flex flex-col items-center p-4 space-y-4 h-auto"
	>
		<!-- ─── Drawer mobile (uniquement sur mobile) -->
		<div class="md:hidden w-full">
			<Drawer.Root bind:open={drawerOpen}>
				<Drawer.Trigger
					aria-label="Open navigation"
					class={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' w-full'}
				>
					<Menu size="24" />
				</Drawer.Trigger>

				<Drawer.Content class="pb-8 pt-6">
					<ul class="my-6 flex flex-col gap-4 text-lg font-medium">
						{#each links as { href, label }}
							<li>
								<a
									{href}
									onclick={() => navigateAndClose(href)}
									style={`-webkit-text-stroke-color:${strokeColor};`}
									class="fontStyle block uppercase tracking-wide w-full px-4 py-2"
								>
									{label}
								</a>
							</li>
						{/each}
						{#if isLoggedIn}
							<li>
								<a
									href="/auth"
									onclick={() => navigateAndClose('/auth')}
									style={`-webkit-text-stroke-color:${strokeColor};`}
									class="fontStyle flex items-center gap-2 uppercase tracking-wide w-full px-4 py-2"
								>
									<Settings size="20" />
									Paramètres
								</a>
							</li>
							{#if showAccountLink}
								<li>
									<a
										href="/auth/account"
										onclick={() => navigateAndClose('/auth/account')}
										style={`-webkit-text-stroke-color:${strokeColor};`}
										class="fontStyle flex items-center gap-2 uppercase tracking-wide w-full px-4 py-2"
									>
										<Cog size="20" />
										Compte (email, 2FA)
									</a>
								</li>
							{/if}
							<li>
								<form method="POST" action="/auth?/signout" use:enhance class="block w-full">
									<button
										type="submit"
										class="fontStyle flex items-center gap-2 uppercase tracking-wide w-full px-4 py-2 text-left"
										style={`-webkit-text-stroke-color:${strokeColor}; color: inherit; background: none; border: none; cursor: pointer;`}
										onclick={() => (drawerOpen = false)}
									>
										<LogOut size="20" />
										Déconnexion
									</button>
								</form>
							</li>
						{/if}
					</ul>

					<Drawer.Footer class="mt-6 flex justify-center gap-4">
						{#if !isLoggedIn}
							<Button size="sm" href="/auth/login" onclick={() => (drawerOpen = false)}
								>Se connecter</Button
							>
						{/if}
						<Button size="sm" variant="outline" onclick={() => (drawerOpen = false)}>Fermer</Button>
					</Drawer.Footer>
				</Drawer.Content>
			</Drawer.Root>
		</div>

		<!-- ─── Liens verticaux (desktop) -->
		<ul class="hidden md:flex flex-col items-center gap-3 w-full">
			{#each links as { href, label }}
				<li class="w-full">
					<a
						{href}
						class="fontStyle flex items-center justify-center rounded-xl h-12 px-6 font-medium
						   transition hover:-translate-y-[1px] hover:bg-white/10 w-full text-center"
					>
						{label}
					</a>
				</li>
			{/each}
			
			{#if isLoggedIn}
				<li class="w-full border-t border-white/20 my-2 pt-2"></li>
				
				<li class="w-full">
					<a
						href="/auth"
						class="fontStyle flex items-center justify-center gap-2 rounded-xl h-12 px-4 font-medium
						   transition hover:-translate-y-[1px] hover:bg-white/10 w-full"
						aria-label="Paramètres"
					>
						<Settings size="20" />
						<span>Paramètres</span>
					</a>
				</li>
				
				{#if showAccountLink}
					<li class="w-full">
						<a
							href="/auth/account"
							class="fontStyle flex items-center justify-center gap-2 rounded-xl h-12 px-4 font-medium
							   transition hover:-translate-y-[1px] hover:bg-white/10 w-full"
							aria-label="Compte"
						>
							<Cog size="20" />
							<span>Compte</span>
						</a>
					</li>
				{/if}
				
				<li class="w-full">
					<form method="POST" action="/auth?/signout" use:enhance class="w-full">
						<button
							type="submit"
							class="fontStyle flex items-center justify-center gap-2 rounded-xl h-12 px-4 font-medium
							   transition hover:-translate-y-[1px] hover:bg-white/10 w-full border-0 bg-transparent cursor-pointer"
							aria-label="Déconnexion"
						>
							<LogOut size="20" />
							<span>Déconnexion</span>
						</button>
					</form>
				</li>
			{/if}
		</ul>
	</nav>
</div>

<style lang="scss">
	.navVertical {
		position: fixed;
		left: 2rem;
		top: 50%;
		transform: translateY(-50%) rotateY(15deg) rotateX(5deg);
		z-index: 50;
		perspective: 1000px;
		transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
		
		&:hover {
			transform: translateY(-50%) rotateY(0deg) rotateX(0deg);
		}
		
		&.hovered {
			transform: translateY(-50%) rotateY(0deg) rotateX(0deg);
		}
		
		nav {
			min-width: 180px;
			background: rgba(20, 20, 30, 0.7);
			backdrop-filter: blur(12px);
			transition: all 0.3s ease;
			transform-style: preserve-3d;
			box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.3);
			
			&:hover {
				box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.5);
				background: rgba(30, 30, 40, 0.8);
			}
		}

		.fontStyle {
			font-family:
				Raleway Variable,
				sans-serif;
			font-weight: 500;
			letter-spacing: 0.5px;
			white-space: nowrap;
		}
		
		/* Adaptation mobile */
		@media (max-width: 768px) {
			left: 1rem;
			transform: translateY(-50%) rotateY(0deg) rotateX(0deg);
			
			nav {
				min-width: auto;
				padding: 0.5rem;
			}
		}
	}
</style>