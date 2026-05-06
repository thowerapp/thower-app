<script lang="ts">
	import * as Sidebar from '$shadcn/sidebar/index.js';
	import { LogOut } from 'lucide-svelte';
	import SmoothScrollBar from '$lib/components/smoothScrollBar/SmoothScrollBar.svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { children } = $props();

	const navItems = [
		{ title: 'Accueil',       url: '/admin' },
		{ title: 'Ventes',        url: '/admin/sales' },
		{ title: 'Utilisateurs',  url: '/admin/users' },
		{ title: 'Recettes',      url: '/admin/recettes' },
		{ title: 'Contact',       url: '/admin/contact' },
		{ title: 'Vidéos',        url: '/admin/videos' }
	];
</script>

<div class="w-screen h-screen">
	<Sidebar.Provider>
		<Sidebar.Root class="border-none">
			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupLabel>Dashboard</Sidebar.GroupLabel>
					<Sidebar.Menu>
					{#each navItems as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={$page.url.pathname === item.url}>
								{#snippet child({ props })}
									<a
										href={item.url}
										data-sveltekit-preload-data="hover"
										data-sveltekit-preload-code="eager"
										{...props}
									>{item.title}</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
					</Sidebar.Menu>
				</Sidebar.Group>
			</Sidebar.Content>

			<Sidebar.Footer>
				<form method="POST" action="/auth?/signout" use:enhance>
					<button
						type="submit"
						class="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
					>
						<LogOut class="size-4 shrink-0" />
						<span>Déconnexion</span>
					</button>
				</form>
			</Sidebar.Footer>
		</Sidebar.Root>

		<!-- Contenu principal -->
		<Sidebar.Inset class="border rounded-[12px] m-3 max-h-[95vh] min-h-[95vh]">
			<SmoothScrollBar>
				<header class="absolute flex items-center gap-2 px-4 h-16">
					<Sidebar.Trigger />
				</header>

				<div class="py-[40px]">
					{@render children?.()}
				</div>
			</SmoothScrollBar>
		</Sidebar.Inset>
	</Sidebar.Provider>
</div>
