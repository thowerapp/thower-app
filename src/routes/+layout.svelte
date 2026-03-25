<script lang="ts">
  import Navigation from './../lib/components/Navigation.svelte';
  import '@fontsource-variable/open-sans';
  import '@fontsource-variable/raleway';
  import '../app.css';

  import { initializeLayoutState, setupNavigationEffect, isClient } from './layout.svelte';

  import { ModeWatcher } from 'mode-watcher';
  import Toaster from '$lib/components/shadcn/ui/sonner/sonner.svelte';

  import SmoothScrollBar from '$lib/components/smoothScrollBar/SmoothScrollBar.svelte';
  import {
    firstLoadComplete,
    setFirstOpen,
    setRessourceToValide
  } from '$lib/store/initialLoaderStore';
  import { page } from '$app/stores';
  import { pwaInstallPrompt } from '$lib/store/pwaInstallStore';

  import SmoothScrollBarStore from '$lib/store/SmoothScrollBarStore';
  import type Scrollbar from 'smooth-scrollbar';

  let { data, children } = $props();

  let pwaNeedRefresh = $state(false);
  let pwaOfflineReady = $state(false);
  let pwaUpdateServiceWorker = $state<(reload?: boolean) => Promise<void>>(async () => {});

  $effect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let removeVisibility: (() => void) | null = null;
    const handler = (e: Event) => {
      e.preventDefault();
      pwaInstallPrompt.set(e as unknown as import('$lib/store/pwaInstallStore').DeferredInstallPrompt);
    };
    const installedHandler = () => { pwaInstallPrompt.set(null); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if ('serviceWorker' in navigator) {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          if (cancelled) return;
          const updateSW = registerSW({
            immediate: true,
            onNeedRefresh: () => { if (!cancelled) pwaNeedRefresh = true; },
            onOfflineReady: () => { if (!cancelled) pwaOfflineReady = true; }
          });
          if (!cancelled) {
            pwaUpdateServiceWorker = () => updateSW(true);
            const onVisible = () => {
              if (cancelled || document.visibilityState !== 'visible') return;
              navigator.serviceWorker.ready.then((reg) => reg.update()).catch(() => {});
            };
            document.addEventListener('visibilitychange', onVisible);
            removeVisibility = () => document.removeEventListener('visibilitychange', onVisible);
          }
        })
        .catch(() => {
          if (!cancelled) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
        });
    }

		return () => {
			cancelled = true;
			removeVisibility?.();
			window.removeEventListener('beforeinstallprompt', handler);
			window.removeEventListener('appinstalled', installedHandler);
		};
	});
	
	$effect(() => {
		const unsubscribe = page.subscribe((currentPage) => {
			initializeLayoutState(currentPage);
		});
		setupNavigationEffect();
		setFirstOpen(true);
		setRessourceToValide(true);
		return unsubscribe;
	});

  $effect(() => {
    const unsubscribe = page.subscribe((currentPage) => {
      initializeLayoutState(currentPage);
    });
    setupNavigationEffect();
    setFirstOpen(true);
    setRessourceToValide(true);
    return unsubscribe;
  });

  let contentRef: HTMLElement | null = $state(null);

  $effect(() => {
    if (!contentRef) return;
    const observer = new ResizeObserver(() => {
      updateSmoothScroll();
    });
    observer.observe(contentRef);
    return () => observer.disconnect();
  });

  function updateSmoothScroll() {
    let scrollbarInstance: Scrollbar | null = null;
    SmoothScrollBarStore.update((state) => {
      scrollbarInstance = state.smoothScroll as Scrollbar | null;
      return state;
    });
    if (scrollbarInstance != null) {
      (scrollbarInstance as Scrollbar).update();
    }
  }
</script>

<svelte:head>
  <link rel="icon" href="/favicon.png" />
  <meta name="viewport" content="width=device-width" />
  <link rel="manifest" href="/pwa/manifest.webmanifest" />
  <meta name="theme-color" content="#4285f4" />
</svelte:head>

{#if !$firstLoadComplete}
  <!-- <Loader /> -->
{/if}
{#if $isClient}
  <div class="wrapper">
    <ModeWatcher />
    <!-- <Navigation user={data?.user ?? null} /> -->
    <div class="container">
      <div class="wrapperScroll">
        <SmoothScrollBar>
          <main class="mainLayout">
            <div class="content" bind:this={contentRef}>
              {@render children()}
            </div>
          </main>
        </SmoothScrollBar>
      </div>
    </div>
    <Toaster />
    {#if pwaNeedRefresh || pwaOfflineReady}
      <div class="pwa-toast" role="alert">
        <div class="pwa-toast-message">
          {#if pwaNeedRefresh}
            Nouvelle version disponible. Rechargez pour mettre à jour.
          {:else}
            L'application peut fonctionner hors ligne.
          {/if}
        </div>
        <div class="pwa-toast-actions">
          {#if pwaNeedRefresh}
            <button type="button" onclick={() => pwaUpdateServiceWorker()}>Recharger</button>
          {/if}
          <button type="button" onclick={() => { pwaNeedRefresh = false; pwaOfflineReady = false; }}>
            Fermer
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  /* ── Variables globales ── */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --black: #0a0a0a;
    --white: #f0ede8;
    --gold: #c9a84c;
    --teal: #3ab8b8;
    --gray: #2a2a2a;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    background: var(--black);
    color: var(--white);
    font-family: 'DM Sans', sans-serif;
    overflow-x: hidden;
    cursor: none;
  }

  /* ── Layout ── */
  .wrapper {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: relative;
  }

  .container {
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    max-width: none;
    overflow: hidden;
    position: relative;
  }

  .mainLayout {
    width: 100%;
    overflow: hidden;
  }

  .wrapperScroll {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  /*
   * .content : ne plus forcer position:absolute ni ccc (flex centré).
   * La page gère elle-même son centrage.
   * On garde juste z-index et width:100% pour que le contenu prenne toute la largeur.
   */
  .content {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 100vh;
  }

  /* ── PWA Toast ── */
  .pwa-toast {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: var(--pwa-toast-bg, #fff);
    color: var(--pwa-toast-fg, #111);
    font-size: 0.875rem;
  }

  .pwa-toast-message { margin-bottom: 0.5rem; }

  .pwa-toast-actions {
    display: flex;
    gap: 0.5rem;
  }

  .pwa-toast button {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    border: 1px solid rgba(0, 0, 0, 0.2);
    background: transparent;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .pwa-toast button:hover {
    background: rgba(0, 0, 0, 0.05);
  }
</style>