<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { superForm } from 'sveltekit-superforms/client';
  import { signupSchema } from '$lib/schema/auth/signupSchema';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { zodClient } from '$lib/superforms-zod';
  import SmoothScrollBarStore from '$lib/store/SmoothScrollBarStore';
  import { get } from 'svelte/store';
  import type Scrollbar from 'smooth-scrollbar';
  import * as Form from '$shadcn/form';
  import { Input } from '$shadcn/input';
  import { Button } from '$shadcn/button';

  let progressWidth = $state(0);

  let camCurrentZ = 0;
  let camTargetZ = 0;
  const CAM_SEC1_Z = 0;
  const CAM_SEC2_Z = -12;
  const CAM_SEC3_Z = -22;

  let { data } = $props();

  const formOptions = { validators: zodClient(signupSchema), id: 'signupForm' };
  const signupForm = $derived.by(() => superForm(data.form, formOptions));
  const { form: signupData, enhance: signupEnhance, message: signupMessage } = $derived(signupForm);

  let formElement: HTMLFormElement;

  $effect(() => {
    if ($signupMessage === 'vous etes deja inscrit avec cette adresse email.') {
      toast.error($signupMessage);
      setTimeout(() => goto('/auth/login'), 0);
    }
  });

  function handleFormSubmit(e: Event) {
    // Empêche le scroll vers le haut automatique
    const form = e.target as HTMLFormElement;
    const scrollPos = window.scrollY;
    setTimeout(() => {
      window.scrollTo(0, scrollPos);
    }, 0);
  }

  function getErr(field: string) {
    return ($signupData as any)?.errors?.[field]?.[0];
  }

  // ── Scroll helpers via SmoothScrollBar ──
  function scrollToEl(id: string) {
    const anchor = document.getElementById(id);
    if (!anchor) return;
    const state = get(SmoothScrollBarStore as any);
    const sb = state?.smoothScroll as Scrollbar | null;
    if (sb) {
      sb.scrollIntoView(anchor, { offsetTop: 0 });
    } else {
      anchor.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const scrollToSec2 = () => scrollToEl('sec2');
  const scrollToSec3 = () => scrollToEl('sec3');
  const scrollToForm = () => scrollToEl('form-anchor');

  function validateBeforeSubmit(e: Event) {
    const formEl = e.target as HTMLFormElement;
    if (!formEl.checkValidity()) {
      e.preventDefault();
      toast.error('Veuillez remplir tous les champs du formulaire.');
    }
  }

  onMount(() => {
    // ── CURSOR — attaché au body, jamais dans le flux scroll ──
    const cursor = document.createElement('div');
    cursor.id = 'cursor';
    cursor.style.cssText = `
      position: fixed;
      z-index: 9999;
      width: 14px;
      height: 12px;
      pointer-events: none;
      transform: translate(-50%, -50%);
      background: #3ab8b8;
      clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
      mix-blend-mode: difference;
      transition: width 0.15s, height 0.15s;
      top: 0; left: 0;
    `;
    document.body.appendChild(cursor);

    const onMouseMove = (e: MouseEvent) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    };
    document.addEventListener('mousemove', onMouseMove);

    document.querySelectorAll('button, a, select, input, #scroll-hint').forEach(el => {
      el.addEventListener('mouseenter', () => { cursor.style.width = '22px'; cursor.style.height = '19px'; });
      el.addEventListener('mouseleave', () => { cursor.style.width = '14px'; cursor.style.height = '12px'; });
    });

    // ── EYEBROW ──
    const eyebrowEl = document.querySelector('.hero-eyebrow') as HTMLElement | null;
    const heroTitleEl = document.getElementById('hero-title');
    setTimeout(() => {
      if (eyebrowEl) {
        eyebrowEl.style.animation = 'none';
        eyebrowEl.style.opacity = '1';
        eyebrowEl.style.transform = 'translateY(0)';
        eyebrowEl.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.14s ease';
      }
    }, 1500);
    heroTitleEl?.addEventListener('mouseenter', () => {
      if (eyebrowEl) {
        eyebrowEl.style.opacity = '0';
        eyebrowEl.style.transform = 'translateY(1.8rem)';
        setTimeout(() => {
          if (eyebrowEl) { eyebrowEl.textContent = '· Sport · Nutrition · Mindset ·'; eyebrowEl.style.opacity = '1'; }
        }, 140);
      }
    });
    heroTitleEl?.addEventListener('mouseleave', () => {
      if (eyebrowEl) {
        eyebrowEl.style.opacity = '0';
        setTimeout(() => {
          if (eyebrowEl) { eyebrowEl.textContent = '· Programme 91 jours ·'; eyebrowEl.style.transform = 'translateY(0)'; eyebrowEl.style.opacity = '1'; }
        }, 140);
      }
    });

    // ── THREE.JS CANVAS — attaché directement au body ──
    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;width:100%;height:100%;display:block;pointer-events:none;';
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0a);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.038);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    const CORRIDOR_LENGTH = 40, CORRIDOR_W = 5, CORRIDOR_H = 4;

    const wallMat = new THREE.MeshBasicMaterial({ color: 0x0d0a06, side: THREE.BackSide });
    const corridor = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_W, CORRIDOR_H, CORRIDOR_LENGTH), wallMat);
    corridor.position.set(0, 0, -CORRIDOR_LENGTH / 2);
    scene.add(corridor);

    const gridMat = new THREE.LineBasicMaterial({ color: 0x3a2e18, transparent: true, opacity: 0.85 });
    function makeLine(p1: [number,number,number], p2: [number,number,number]) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]);
      return new THREE.Line(geo, gridMat);
    }
    for (let x = -2; x <= 2; x += 0.5) scene.add(makeLine([x, -CORRIDOR_H/2, 2], [x, -CORRIDOR_H/2, -CORRIDOR_LENGTH - 2]));
    for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 2) scene.add(makeLine([-CORRIDOR_W/2, -CORRIDOR_H/2, z], [CORRIDOR_W/2, -CORRIDOR_H/2, z]));

    const trimMat = new THREE.LineBasicMaterial({ color: 0x5a4020, transparent: true, opacity: 0.7 });
    for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 4) {
      scene.add((() => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-CORRIDOR_W/2, -CORRIDOR_H/2, z), new THREE.Vector3(-CORRIDOR_W/2, CORRIDOR_H/2, z)]); return new THREE.Line(g, trimMat); })());
      scene.add((() => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(CORRIDOR_W/2, -CORRIDOR_H/2, z), new THREE.Vector3(CORRIDOR_W/2, CORRIDOR_H/2, z)]); return new THREE.Line(g, trimMat); })());
    }
    scene.add(makeLine([0, CORRIDOR_H/2, 2], [0, CORRIDOR_H/2, -CORRIDOR_LENGTH - 2]));

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_W * 0.9, CORRIDOR_H * 0.9), glowMat);
    glowPlane.position.set(0, 0, -CORRIDOR_LENGTH + 0.5);
    scene.add(glowPlane);

    const glow2Mat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false });
    const glowPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_W * 0.4, CORRIDOR_H * 0.6), glow2Mat);
    glowPlane2.position.set(0, 0, -CORRIDOR_LENGTH + 0.3);
    scene.add(glowPlane2);

    const makeGlow = (z: number, opacity: number, w: number, h: number, color: number) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat).translateZ(z));
      return mat;
    };
    const midGlows = [
      makeGlow(-CORRIDOR_LENGTH * 0.75, 0.28, CORRIDOR_W * 0.85, CORRIDOR_H * 0.85, 0xc9a84c),
      makeGlow(-CORRIDOR_LENGTH * 0.5,  0.14, CORRIDOR_W * 0.8,  CORRIDOR_H * 0.8,  0xc9a84c),
      makeGlow(-CORRIDOR_LENGTH * 0.25, 0.06, CORRIDOR_W * 0.75, CORRIDOR_H * 0.75, 0xc9a84c),
    ];

    const PARTICLE_COUNT = 180;
    const pPos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * (CORRIDOR_W - 0.4);
      pPos[i*3+1] = (Math.random() - 0.5) * (CORRIDOR_H - 0.4);
      pPos[i*3+2] = -Math.random() * CORRIDOR_LENGTH;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.025, transparent: true, opacity: 0.55, sizeAttenuation: true }));
    scene.add(particles);

    // ── SCROLL via SmoothScrollBar ──
    let sbListener: ((status: { offset: { x: number; y: number } }) => void) | null = null;
    let currentScrollbar: Scrollbar | null = null;

    const unsubscribeStore = SmoothScrollBarStore.subscribe((state) => {
      const sb = state.smoothScroll as Scrollbar | null;
      if (!sb || currentScrollbar === sb) return;
      if (currentScrollbar && sbListener) currentScrollbar.removeListener(sbListener);
      currentScrollbar = sb;
      sbListener = ({ offset }) => {
        const contentEl = document.querySelector('.content') as HTMLElement | null;
        const totalHeight = contentEl ? contentEl.scrollHeight - window.innerHeight : 1;
        const progress = offset.y / Math.max(1, totalHeight);
        progressWidth = progress * 100;
        const p1 = Math.min(progress * 3, 1);
        const p2 = Math.min(Math.max(progress * 3 - 1, 0), 1);
        camTargetZ = CAM_SEC1_Z + (CAM_SEC2_Z - CAM_SEC1_Z) * p1 + (CAM_SEC3_Z - CAM_SEC2_Z) * p2;
      };
      sb.addListener(sbListener);
    });

    // ── ANIMATION LOOP ──
    const clock = new THREE.Clock();
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      camCurrentZ += (camTargetZ - camCurrentZ) * 0.055;
      camera.position.z = camCurrentZ;
      camera.position.x = Math.sin(t * 0.18) * 0.04;
      camera.position.y = Math.sin(t * 0.12) * 0.025;
      camera.lookAt(camera.position.x * 0.2, camera.position.y * 0.2, camCurrentZ - 10);
      const proximity = Math.max(0, 1 - Math.abs(camCurrentZ + 38) / 38);
      glowMat.opacity  = (0.45 + proximity * 0.18) + Math.sin(t * 0.7) * 0.03;
      glow2Mat.opacity = (0.70 + proximity * 0.15) + Math.sin(t * 1.1) * 0.04;
      midGlows[0].opacity = 0.22 + proximity * 0.12;
      midGlows[1].opacity = 0.10 + proximity * 0.08;
      midGlows[2].opacity = 0.04 + proximity * 0.04;
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i*3+1] += 0.0008;
        if (pos[i*3+1] > CORRIDOR_H / 2) pos[i*3+1] = -CORRIDOR_H / 2;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      unsubscribeStore();
      if (currentScrollbar && sbListener) currentScrollbar.removeListener(sbListener);
      renderer.dispose();
      canvas.remove();
      cursor.remove();
    };
  });
</script>

<svelte:head>
  <title>Thower — La Méthode</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
</svelte:head>

<div id="progress-line" style="width:{progressWidth}%"></div>

<nav>
  <a class="nav-logo" href="/">T<span>H</span>OWER</a>
  <div class="nav-btns">
    <button class="nav-btn outline" onclick={() => goto('/auth/login')}>Se connecter</button>
    <button class="nav-btn fill" onclick={scrollToForm}>S'inscrire</button>
  </div>
</nav>

<div id="sections">
  <!-- SEC 1 -->
  <section id="sec1">
    <div class="hero-group">
      <div class="hero-eyebrow">· Programme 91 jours ·</div>
      <div class="hero-h1" id="hero-title">
        <div class="t-row1"><span class="t-la">LA</span><span class="t-space">&nbsp;</span><span class="t-me">MÉ</span></div>
        <div class="t-row2"><span class="t-tho">THO</span><span class="t-swap"><span class="t-de">DE</span><span class="t-wer-ghost">WER</span><span class="t-wer">WER</span></span></div>
      </div>
    </div>
    <p class="hero-sub">Un programme complet pour transformer ton corps et ton mental en 91 jours.</p>
    <div id="scroll-hint" role="button" tabindex="0" onclick={scrollToSec2} onkeydown={(e) => e.key==='Enter' && scrollToSec2()}>
      <span class="hint-label">Découvrir</span>
      <div class="hint-arrow">
        <svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7l5 5 5-5" stroke="#f0ede8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
  </section>

  <!-- SEC 2 -->
  <section id="sec2">
    <div class="method-header">
      <div class="method-eyebrow">— La méthode</div>
      <h2 class="method-h2">91 JOURS.<br><span class="gold">3 PILIERS.</span></h2>
      <p class="method-intro">Un programme complet, progressif et personnalisé. Sport, nutrition et mindset travaillent ensemble — pas séparément.</p>
    </div>
    <div class="pillars">
      <div class="pillar">
        <div class="pillar-symbol"><svg viewBox="0 0 40 40" fill="none" width="36" height="36"><circle cx="20" cy="20" r="18" stroke="#c9a84c" stroke-width="1"/><path d="M20 8 L20 32 M8 20 L32 20" stroke="#c9a84c" stroke-width="1" stroke-linecap="round"/><circle cx="20" cy="20" r="4" fill="#c9a84c" opacity="0.4"/></svg></div>
        <div class="pillar-num">01</div><div class="pillar-title">Sport</div>
        <p class="pillar-text">3 séances hebdomadaires à placer librement dans ta semaine. Séances progressives, vidéos guidées, déblocage au fil de ta progression.</p>
        <div class="pillar-tags"><span class="ptag">▸ Séances A · B · C chaque semaine</span><span class="ptag">▸ Vidéos guidées YouTube</span><span class="ptag">▸ Déblocage progressif</span></div>
      </div>
      <div class="pillar pillar-center">
        <div class="pillar-symbol"><svg viewBox="0 0 40 40" fill="none" width="36" height="36"><rect x="4" y="4" width="32" height="32" stroke="#3ab8b8" stroke-width="1"/><rect x="12" y="12" width="16" height="16" stroke="#3ab8b8" stroke-width="1" opacity="0.5"/><rect x="18" y="18" width="4" height="4" fill="#3ab8b8" opacity="0.6"/></svg></div>
        <div class="pillar-num">02</div><div class="pillar-title">Nutrition</div>
        <p class="pillar-text">Un cadencier sur 91 jours. Recettes calibrées selon tes objectifs, quantités calculées automatiquement, liste de courses générée.</p>
        <div class="pillar-tags"><span class="ptag">▸ Recettes personnalisées</span><span class="ptag">▸ Macros calculés automatiquement</span><span class="ptag">▸ Liste de courses intégrée</span></div>
      </div>
      <div class="pillar">
        <div class="pillar-symbol"><svg viewBox="0 0 40 40" fill="none" width="36" height="36"><polygon points="20,4 36,34 4,34" stroke="#c9a84c" stroke-width="1" fill="none"/><polygon points="20,14 28,28 12,28" stroke="#c9a84c" stroke-width="1" fill="none" opacity="0.4"/></svg></div>
        <div class="pillar-num">03</div><div class="pillar-title">Mindset</div>
        <p class="pillar-text">Méditation, breathwork, ligne directrice journalière. Un système de gamification pour rester motivé chaque jour des 91 jours.</p>
        <div class="pillar-tags"><span class="ptag">▸ Méditation · Breathwork</span><span class="ptag">▸ Points · Statuts · Badges</span><span class="ptag">▸ Checklist journalière</span></div>
      </div>
    </div>
    <div class="stats-strip">
      <div class="stat-item"><div class="stat-val">91</div><div class="stat-lbl">Jours</div></div>
      <div class="stat-sep">✦</div>
      <div class="stat-item"><div class="stat-val">13</div><div class="stat-lbl">Semaines</div></div>
      <div class="stat-sep">✦</div>
      <div class="stat-item"><div class="stat-val">6</div><div class="stat-lbl">Séances / semaine</div></div>
      <div class="stat-sep">✦</div>
      <div class="stat-item"><div class="stat-val">1</div><div class="stat-lbl">Objectif · Toi</div></div>
    </div>
    <div class="sec2-cta"><button class="nav-btn fill" onclick={scrollToSec3}>Comment faire →</button></div>
  </section>

  <!-- SEC 3 — Formulaire -->
  <section id="sec3">
    <div class="form-wrap" id="form-anchor">
      <h2 class="form-h2">Créer un <span class="highlight-word">compte</span></h2>
      <p class="form-sub">Inscris-toi pour accéder au programme et activer ton <span class="highlight-word">compte</span>.</p>
      <form method="POST" use:signupEnhance action="?/signup" class="form-fields" bind:this={formElement} onsubmit={handleFormSubmit}>
        <Form.Field name="username" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Nom d'utilisateur</Form.Label>
            <Input
              name="username"
              type="text"
              bind:value={$signupData.username}
              placeholder="Jean Dupont"
              required
              class="field-input-custom"
            />
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>

        <Form.Field name="email" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Email</Form.Label>
            <Input
              name="email"
              type="email"
              bind:value={$signupData.email}
              placeholder="jean@email.com"
              required
              class="field-input-custom"
            />
            <Form.Description class="form-note">Nous ne partagerons jamais votre email.</Form.Description>
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>

        <Form.Field name="password" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Mot de passe</Form.Label>
            <Input
              name="password"
              type="password"
              bind:value={$signupData.password}
              placeholder="••••••••"
              required
              class="field-input-custom"
            />
            <Form.Description class="form-note">Au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.</Form.Description>
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>

        <Form.Field name="confirmPassword" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Confirmer le mot de passe</Form.Label>
            <Input
              name="confirmPassword"
              type="password"
              bind:value={$signupData.confirmPassword}
              placeholder="••••••••"
              required
              class="field-input-custom"
            />
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>

        <Button type="submit" class="form-submit-custom">Créer mon compte</Button>
        <p class="form-note">Tes informations sont confidentielles. Tu seras redirigé vers la configuration 2FA après l'inscription.</p>
      </form>
    </div>
  </section>
</div>

<footer>
  <div class="footer-logo">T<span>H</span>OWER</div>
  <div class="footer-copy">© 2026 Thower · Tous droits réservés</div>
</footer>

<style>
  :root { --black: #0a0a0a; --white: #f0ede8; --gold: #c9a84c; --teal: #3ab8b8; }

  #progress-line { position: fixed; top: 0; left: 0; height: 2px; background: var(--gold); z-index: 200; transition: width 0.1s linear; pointer-events: none; }

  /* ── Nav — au-dessus de tout ── */
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: flex-start; justify-content: space-between; padding: 24px 48px; gap: 24px; flex-wrap: wrap; }
  .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 0.12em; color: var(--white); text-decoration: none; flex: 0 0 auto; }
  .nav-logo span { color: var(--gold); }
  .nav-btns { display: flex; gap: 12px; flex-direction: row; }
  .nav-btn { padding: 8px 22px; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; cursor: none; border: none; transition: all 0.2s; white-space: nowrap; }
  .nav-btn.outline { background: transparent; border: 1px solid rgba(240,237,232,0.3); color: var(--white); }
  .nav-btn.outline:hover { border-color: var(--gold); color: var(--gold); }
  .nav-btn.fill { background: var(--gold); color: var(--black); font-weight: 600; }
  .nav-btn.fill:hover { background: #e0bc62; }

  /* ── Sections — colonne centrée, z-index au-dessus du canvas ── */
  #sections {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  #sections > section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: all;
  }

  /* ── SEC 1 ── */
  #sec1 { height: 100vh; justify-content: space-between; padding: 18vh 24px 10vh; }
  .hero-group { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
  .hero-eyebrow { font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--teal); text-align: center; opacity: 0; animation: fadeUp 1s 0.4s forwards; }
  .hero-h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(6rem, 16vw, 14rem); line-height: 0.9; letter-spacing: 0.04em; text-align: center; opacity: 0; animation: fadeUp 1s 0.7s forwards; cursor: default; user-select: none; }
  .t-row1 { display: block; text-align: center; }
  .t-row2 { display: flex; justify-content: center; align-items: baseline; }
  .t-la { display: inline-block; color: var(--gold); transition: opacity 0.22s ease, transform 0.26s cubic-bezier(0.4,0,0.2,1); }
  .t-space { display: inline-block; color: var(--gold); transition: opacity 0.15s ease; }
  .t-me { display: inline-block; color: var(--gold); transition: opacity 0.22s ease 0.04s, transform 0.26s cubic-bezier(0.4,0,0.2,1) 0.04s; }
  .t-tho { display: inline-block; color: var(--white); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1) 0.06s; }
  .t-swap { display: inline-block; position: relative; overflow: visible; }
  .t-de { display: inline-block; color: var(--gold); transition: opacity 0.18s ease 0.06s, transform 0.22s cubic-bezier(0.4,0,0.2,1) 0.06s; }
  .t-wer { position: absolute; left: 50%; top: 0; transform: translateX(-50%) translateY(0.4em); color: var(--teal); opacity: 0; white-space: nowrap; transition: opacity 0.24s ease 0.14s, transform 0.28s cubic-bezier(0.4,0,0.2,1) 0.14s; }
  .t-wer-ghost { display: none; }
  .hero-h1:hover .t-la { opacity: 0; transform: translateX(-0.6em); }
  .hero-h1:hover .t-space { opacity: 0; }
  .hero-h1:hover .t-me { opacity: 0; transform: translateY(0.4em); }
  .hero-h1:hover .t-tho { transform: translateX(-0.32em); }
  .hero-h1:hover .t-de { opacity: 0; transform: translateY(0.4em); }
  .hero-h1:hover .t-wer { opacity: 1; transform: translateX(-50%) translateY(0); }
  .hero-sub { font-size: 1rem; font-weight: 300; color: rgba(240,237,232,0.55); letter-spacing: 0.04em; text-align: center; max-width: 380px; line-height: 1.7; opacity: 0; animation: fadeUp 1s 1s forwards; }
  #scroll-hint { display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: none; opacity: 0; animation: fadeUp 1s 1.4s forwards; }
  #scroll-hint:hover .hint-arrow { border-color: var(--gold); }
  .hint-label { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,237,232,0.4); }
  .hint-arrow { width: 36px; height: 36px; border: 1px solid rgba(240,237,232,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: border-color 0.2s; animation: bounce 2.4s 2s infinite; }

  /* ── SEC 2 ── */
  #sec2 { min-height: 100vh; justify-content: center; padding: 100px 48px 80px; gap: 56px; }
  .method-header { text-align: center; max-width: 600px; }
  .method-eyebrow { font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--teal); margin-bottom: 16px; }
  .method-h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(3rem, 7vw, 6rem); line-height: 0.92; letter-spacing: 0.04em; color: var(--white); margin-bottom: 20px; }
  .method-h2 .gold { color: var(--gold); }
  .method-intro { font-size: 0.88rem; font-weight: 300; color: rgba(240,237,232,0.45); line-height: 1.8; }
  .pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; width: 100%; max-width: 960px; }
  .pillar { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 36px 28px; transition: background 0.3s, border-color 0.3s; }
  .pillar-center { border-color: rgba(58,184,184,0.2); }
  .pillar:hover { background: rgba(201,168,76,0.05); border-color: rgba(201,168,76,0.25); }
  .pillar-center:hover { border-color: rgba(58,184,184,0.4); }
  .pillar-symbol { margin-bottom: 20px; opacity: 0.8; }
  .pillar-num { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; color: var(--gold); opacity: 0.2; line-height: 1; margin-bottom: 10px; }
  .pillar-center .pillar-num { color: var(--teal); }
  .pillar-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.06em; color: var(--white); margin-bottom: 12px; }
  .pillar-text { font-size: 0.8rem; font-weight: 300; color: rgba(240,237,232,0.45); line-height: 1.85; margin-bottom: 20px; }
  .pillar-tags { display: flex; flex-direction: column; gap: 5px; }
  .ptag { font-size: 0.65rem; color: rgba(240,237,232,0.3); letter-spacing: 0.06em; }
  .stats-strip { display: flex; align-items: center; gap: 32px; padding: 28px 48px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02); width: 100%; max-width: 900px; justify-content: center; }
  .stat-item { text-align: center; }
  .stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; color: var(--gold); letter-spacing: 0.06em; line-height: 1; }
  .stat-lbl { font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,237,232,0.3); margin-top: 4px; }
  .stat-sep { color: var(--gold); opacity: 0.25; font-size: 0.7rem; }
  .sec2-cta { text-align: center; }

  /* ── SEC 3 ── */
  #sec3 { min-height: 100vh; justify-content: center; padding: 100px 48px; }
  .form-wrap { width: 100%; max-width: 520px; text-align: center; background: rgba(10,10,10,0.7); backdrop-filter: blur(10px); padding: 48px; border-radius: 8px; border: 1px solid rgba(201,168,76,0.15); }
  .form-h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.4rem, 5vw, 4rem); letter-spacing: 0.06em; line-height: 1; margin-bottom: 8px; }
  .form-sub { font-size: 0.82rem; font-weight: 300; color: rgba(240,237,232,0.45); margin-bottom: 36px; line-height: 1.7; }
  .form-fields { display: flex; flex-direction: column; gap: 10px; text-align: left; width: 100%; }
  :global(.field-input-custom) { background: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: var(--white) !important; font-family: 'DM Sans', sans-serif !important; font-size: 0.9rem !important; padding: 12px 16px !important; border-radius: 4px !important; width: 100% !important; box-sizing: border-box !important; }
  :global(.field-input-custom:focus) { border-color: var(--gold) !important; background: rgba(201,168,76,0.04) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.1) !important; outline: none !important; }
  :global(.field-input-custom::placeholder) { color: rgba(240,237,232,0.3) !important; }
  :global(.field-error) { font-size: 0.75rem !important; color: #ff6b6b !important; margin-top: 4px !important; margin-bottom: 4px !important; display: flex !important; align-items: center !important; gap: 4px !important; }
  :global(.form-submit-custom) { margin-top: 20px !important; width: 100% !important; padding: 16px !important; background: var(--gold) !important; color: var(--black) !important; font-family: 'Bebas Neue', sans-serif !important; font-size: 1.1rem !important; letter-spacing: 0.14em !important; border: none !important; cursor: none !important; transition: all 0.2s !important; border-radius: 4px !important; text-transform: uppercase !important; font-weight: 600 !important; }
  :global(.form-submit-custom:hover) { background: #e0bc62 !important; transform: translateY(-2px) !important; box-shadow: 0 8px 16px rgba(201,168,76,0.3) !important; }
  :global(.form-submit-custom:active) { transform: translateY(0px) !important; }
  .field-input { display: none; }
  .field-error { display: none; }
  .form-submit { display: none; }
  .form-note { margin-top: 14px; font-size: 0.68rem; color: rgba(240,237,232,0.25); line-height: 1.6; }
  .highlight-word { color: var(--teal); }

  /* ── Footer ── */
  footer { position: relative; z-index: 10; padding: 40px 48px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; pointer-events: all; }
  .footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 0.1em; color: rgba(240,237,232,0.25); }
  .footer-logo span { color: var(--gold); opacity: 0.5; }
  .footer-copy { font-size: 0.65rem; color: rgba(240,237,232,0.2); letter-spacing: 0.06em; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 900px) {
    nav { padding: 20px 24px; }
    .nav-logo { font-size: 1.6rem; }
    .nav-btn { padding: 6px 14px; font-size: 0.68rem; }
    #sec1 { padding: 15vh 24px 8vh; }
    .hero-h1 { font-size: clamp(4rem, 12vw, 8rem); }
    #sec2 { padding: 60px 24px; gap: 40px; }
    .pillars { grid-template-columns: 1fr; gap: 1px; }
    .method-h2 { font-size: clamp(2rem, 6vw, 4rem); }
    .stats-strip { flex-wrap: wrap; gap: 20px; padding: 20px 24px; }
    footer { flex-direction: column; gap: 12px; text-align: center; padding: 24px; }
    #sec3 { padding: 60px 24px; }
    .form-wrap { padding: 36px 24px; }
    .form-h2 { font-size: clamp(1.8rem, 5vw, 3rem); }
  }

  @media (max-width: 640px) {
    nav { flex-direction: column; align-items: flex-start; padding: 16px 20px; gap: 12px; }
    .nav-logo { font-size: 1.4rem; order: 1; }
    .nav-btns { flex-direction: column; width: auto; gap: 8px; order: 2; }
    .nav-btn { padding: 8px 14px; font-size: 0.65rem; text-align: left; }
    #progress-line { height: 1px; }
    #sec1 { height: auto; min-height: 100vh; padding: 140px 16px 60px; justify-content: flex-start; }
    .hero-group { gap: 2rem; margin-top: 40px; }
    .hero-h1 { font-size: clamp(5rem, 28vw, 9rem); letter-spacing: -0.02em; width: 100vw; max-width: 100%; line-height: 0.85; }
    .hero-eyebrow { font-size: 0.6rem; }
    .hero-sub { font-size: 0.85rem; max-width: 100%; padding: 0 8px; margin-top: 40px; }
    #scroll-hint { margin-top: 80px; }
    #sec2 { min-height: auto; padding: 50px 16px; gap: 30px; }
    .method-header { max-width: 100%; }
    .method-h2 { font-size: clamp(1.8rem, 8vw, 2.8rem); margin-bottom: 16px; }
    .method-eyebrow { font-size: 0.6rem; margin-bottom: 12px; }
    .method-intro { font-size: 0.75rem; }
    .pillars { max-width: 100%; }
    .pillar { padding: 24px 16px; }
    .pillar-num { font-size: 2.2rem; margin-bottom: 8px; }
    .pillar-title { font-size: 1.2rem; margin-bottom: 10px; }
    .pillar-text { font-size: 0.75rem; margin-bottom: 16px; }
    .ptag { font-size: 0.6rem; }
    .stats-strip { flex-direction: column; gap: 16px; max-width: 100%; padding: 20px 16px; }
    .stat-item { }
    .stat-val { font-size: 1.8rem; }
    .stat-sep { display: none; }
    .sec2-cta { width: 100%; }
    #sec3 { min-height: auto; padding: 50px 16px; }
    .form-wrap { max-width: 100%; padding: 28px 16px; border-radius: 6px; }
    .form-h2 { font-size: clamp(1.4rem, 6vw, 2.2rem); margin-bottom: 12px; }
    .form-sub { font-size: 0.75rem; margin-bottom: 24px; }
    .form-fields { gap: 8px; }
    :global(.field-input-custom) { font-size: 0.85rem !important; padding: 10px 12px !important; }
    :global(.form-submit-custom) { font-size: 0.95rem !important; padding: 14px !important; letter-spacing: 0.1em !important; }
    .form-note { font-size: 0.65rem; margin-top: 12px; }
    .footer-logo { font-size: 1rem; }
    .footer-copy { font-size: 0.6rem; }
  }
</style>