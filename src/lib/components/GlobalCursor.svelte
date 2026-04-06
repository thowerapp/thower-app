<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Détection STRICTE : vrai mobile + pas de souris/trackpad
    const isMobileOrTouchDevice = () => {
      // 1. Vérifier le user agent pour les vrais mobiles
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      
      // 2. Si user agent dit mobile, retourner true
      if (isMobileUserAgent) {
        return true;
      }

      // 3. Pour desktop, vérifier la COMBINAISON de critères (pas juste un seul)
      // Desktop moderne peut avoir touchpoints mais ça ne signifie pas que c'est mobile
      const hasHoverSupport = window.matchMedia('(hover: hover)').matches;
      const hasPointerFine = window.matchMedia('(pointer: fine)').matches;
      const hasEnoughTouchPoints = navigator.maxTouchPoints > 4; // Seuil strict pour tablette

      // C'est un vrai mobile/tablette SI:
      // - Pas de support hover/pointer fine
      // - ET a beaucoup de touch points
      const isTrueTablet = !hasHoverSupport && !hasPointerFine && hasEnoughTouchPoints;

      return isTrueTablet;
    };

    // Si c'est mobile, ne rien faire (utiliser curseur système)
    if (isMobileOrTouchDevice()) {
      return;
    }

    // ─────────────────────────────────────── 
    // CURSEUR PERSONNALISÉ POUR DESKTOP UNIQUEMENT
    // ───────────────────────────────────────

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
      will-change: transform;
      transition: width 0.12s cubic-bezier(0.4, 0, 0.2, 1), 
                  height 0.12s cubic-bezier(0.4, 0, 0.2, 1), 
                  background 0.12s ease;
      top: 0;
      left: 0;
    `;
    document.body.appendChild(cursor);

    // Variables pour optimiser les performances
    let lastX = 0;
    let lastY = 0;
    let isMoving = false;
    let moveTimeout: NodeJS.Timeout;

    // Événement mousemove - suivi fluide de la souris
    const onMouseMove = (e: MouseEvent) => {
      // Ignorer les mouvements trop faibles (performance)
      if (Math.abs(e.clientX - lastX) < 2 && Math.abs(e.clientY - lastY) < 2) {
        return;
      }

      lastX = e.clientX;
      lastY = e.clientY;

      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';

      // Afficher le curseur s'il était caché
      if (!isMoving) {
        isMoving = true;
        cursor.style.opacity = '1';
      }

      // Réinitialiser le timeout d'inactivité
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        isMoving = false;
      }, 100);
    };

    // Événement mouseleave - masquer le curseur quand la souris quitte la fenêtre
    const onMouseLeave = () => {
      cursor.style.opacity = '0';
      isMoving = false;
    };

    // Événement mouseenter - réafficher le curseur
    const onMouseEnter = () => {
      cursor.style.opacity = '1';
      isMoving = true;
    };

    // Sélecteurs d'éléments interactifs
    const interactiveSelectors = [
      'button', 'a', 'select', 'input[type="submit"]', 'input[type="button"]', 
      'textarea', '[role="button"]', '[role="link"]', '[role="menuitem"]',
      '.btn', '[class*="btn"]', '[class*="Button"]'
    ].join(', ');

    // Fonction pour ajouter les event listeners à un élément
    const addInteractiveListeners = (el: Element) => {
      // Ignorer les inputs textes (text, email, etc.)
      if ((el as HTMLInputElement).type && ['text', 'email', 'password'].includes((el as HTMLInputElement).type)) {
        return;
      }

      if (el.matches(interactiveSelectors)) {
        const handleEnter = () => {
          cursor.style.width = '22px';
          cursor.style.height = '19px';
          // Changer en doré sur hover
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

    // Event listeners globaux
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Observer pour les éléments dynamiquement ajoutés
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
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

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      observer.disconnect();
      cursor.remove();
      clearTimeout(moveTimeout);
    };
  });
</script>

<!-- Le curseur est créé et géré en JavaScript -->

<style>
  /* Forcer le curseur système sur mobile (fallback) */
  @media (hover: none) and (pointer: coarse) {
    :global(*) {
      cursor: auto !important;
    }
  }
</style>