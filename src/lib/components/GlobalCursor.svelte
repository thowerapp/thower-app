<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Détecte si c'est un appareil tactile/mobile (pas de souris)
    const isMobileOrTouchDevice = () => {
      return (
        window.matchMedia('(hover: none)').matches || // Aucun support hover (tactile)
        ('ontouchstart' in window) || // Support tactile présent
        navigator.maxTouchPoints > 0 // Points tactiles disponibles
      );
    };

    // N'affiche le curseur personnalisé que sur bureau avec souris
    if (isMobileOrTouchDevice()) {
      return; // Quitter si c'est mobile - utilise le curseur par défaut
    }

    // Créer le curseur personnalisé (triangle cyan)
    const cursor = document.createElement('div');
    cursor.id = 'thower-cursor';
    cursor.style.cssText = `
      position: fixed;
      z-index: 9999;
      width: 14px;
      height: 12px;
      pointer-events: none;
      transform: translate(-50%, -50%);
      background: var(--thower-teal, #3ab8b8);
      clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
      mix-blend-mode: difference;
      transition: width 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                  height 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                  background 0.15s ease;
      top: 0;
      left: 0;
    `;
    document.body.appendChild(cursor);

    // Événement mousemove pour suivre la souris
    const onMouseMove = (e: MouseEvent) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    };
    document.addEventListener('mousemove', onMouseMove);

    // Sélecteurs d'éléments interactifs
    const interactiveSelectors = [
      'button', 'a', 'select', 'input', 'textarea', 
      '[role="button"]', '[role="link"]', '[role="menuitem"]',
      '.btn', '[class*="btn"]', '[class*="Button"]'
    ].join(', ');

    // Fonction pour ajouter les event listeners à un élément
    const addInteractiveListeners = (el: Element) => {
      const isInteractive = el.matches(interactiveSelectors);
      
      if (isInteractive) {
        const handleEnter = () => {
          cursor.style.width = '22px';
          cursor.style.height = '19px';
          // Inverse à doré au hover
          cursor.style.background = 'var(--thower-gold, #c9a84c)';
        };
        
        const handleLeave = () => {
          cursor.style.width = '14px';
          cursor.style.height = '12px';
          // Retour au cyan
          cursor.style.background = 'var(--thower-teal, #3ab8b8)';
        };
        
        el.addEventListener('mouseenter', handleEnter, { once: false });
        el.addEventListener('mouseleave', handleLeave, { once: false });
      }
    };

    // Ajouter les listeners aux éléments existants
    document.querySelectorAll(interactiveSelectors).forEach(addInteractiveListeners);

    // Observer pour les éléments dynamiquement ajoutés
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const el = node as HTMLElement;
            addInteractiveListeners(el);
            // Ajouter aussi aux enfants
            el.querySelectorAll(interactiveSelectors).forEach(addInteractiveListeners);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      observer.disconnect();
      cursor.remove();
    };
  });
</script>

<!-- Le curseur est créé en JS et affiché dans le DOM -->

