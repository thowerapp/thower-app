<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { resolve } from '$app/paths';
  import { superForm } from 'sveltekit-superforms/client';
  import { signupSchema } from '$lib/schema/auth/signupSchema';
  import { toast } from 'svelte-sonner';
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
  const CAM_SEC3_Z = -30;

  let { data } = $props();

  const formOptions = { validators: zodClient(signupSchema), id: 'signupForm' };
  const signupForm = $derived.by(() => superForm(data.form, formOptions));
  const { form: signupData, enhance: signupEnhance, message: signupMessage } = $derived(signupForm);

  let formElement: HTMLFormElement;

  $effect(() => {
    if ($signupMessage) {
      toast.error($signupMessage);
    }
  });

  function handleFormSubmit(e: Event) {
    const form = e.target as HTMLFormElement;
    const scrollPos = window.scrollY;
    setTimeout(() => { window.scrollTo(0, scrollPos); }, 0);
  }

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
  const scrollToForm = () => scrollToEl('form-anchor');

  onMount(() => {
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
          if (eyebrowEl) { eyebrowEl.textContent = '· Programme 3 mois ·'; eyebrowEl.style.transform = 'translateY(0)'; eyebrowEl.style.opacity = '1'; }
        }, 140);
      }
    });

    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
    const slot = document.getElementById('three-canvas-slot');
    (slot ?? document.body).appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0a, 0);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.08);

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, -0.4, 0);
    camera.lookAt(0, -0.4, -1);

    const CORRIDOR_LENGTH = 40, CORRIDOR_W = 5, CORRIDOR_H = 4;

    const wallMat = new THREE.MeshBasicMaterial({ color: 0x0d0a06, side: THREE.BackSide });
    const corridor = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_W, CORRIDOR_H, CORRIDOR_LENGTH), wallMat);
    corridor.position.set(0, 0, -CORRIDOR_LENGTH / 2);
    scene.add(corridor);

    const gridMat = new THREE.LineBasicMaterial({ color: 0x8a6030, transparent: true, opacity: 0.9 });
    function makeLine(p1: [number,number,number], p2: [number,number,number]) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]);
      return new THREE.Line(geo, gridMat);
    }
    for (let x = -2; x <= 2; x += 0.5) scene.add(makeLine([x, -CORRIDOR_H/2, 2], [x, -CORRIDOR_H/2, -CORRIDOR_LENGTH - 2]));
    for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 2) scene.add(makeLine([-CORRIDOR_W/2, -CORRIDOR_H/2, z], [CORRIDOR_W/2, -CORRIDOR_H/2, z]));
    for (let x = -2; x <= 2; x += 0.5) scene.add(makeLine([x, CORRIDOR_H/2, 2], [x, CORRIDOR_H/2, -CORRIDOR_LENGTH - 2]));
    for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 2) scene.add(makeLine([-CORRIDOR_W/2, CORRIDOR_H/2, z], [CORRIDOR_W/2, CORRIDOR_H/2, z]));

    const trimMat = new THREE.LineBasicMaterial({ color: 0xb08040, transparent: true, opacity: 0.85 });
    for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 4) {
      scene.add((() => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-CORRIDOR_W/2, -CORRIDOR_H/2, z), new THREE.Vector3(-CORRIDOR_W/2, CORRIDOR_H/2, z)]); return new THREE.Line(g, trimMat); })());
      scene.add((() => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(CORRIDOR_W/2, -CORRIDOR_H/2, z), new THREE.Vector3(CORRIDOR_W/2, CORRIDOR_H/2, z)]); return new THREE.Line(g, trimMat); })());
    }
    for (let y = -CORRIDOR_H/2 + 1; y < CORRIDOR_H/2; y += 1) {
      scene.add(makeLine([-CORRIDOR_W/2, y, 0], [-CORRIDOR_W/2, y, -CORRIDOR_LENGTH]));
      scene.add(makeLine([CORRIDOR_W/2, y, 0], [CORRIDOR_W/2, y, -CORRIDOR_LENGTH]));
    }
    scene.add(makeLine([0, CORRIDOR_H/2, 2], [0, CORRIDOR_H/2, -CORRIDOR_LENGTH - 2]));

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const glowPlane = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_W * 0.9, CORRIDOR_H * 0.9), glowMat);
    glowPlane.position.set(0, 0, -CORRIDOR_LENGTH + 0.5);
    scene.add(glowPlane);

    const glow2Mat = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
    const glowPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR_W * 0.4, CORRIDOR_H * 0.6), glow2Mat);
    glowPlane2.position.set(0, 0, -CORRIDOR_LENGTH + 0.3);
    scene.add(glowPlane2);

    const makeGlow = (z: number, opacity: number, w: number, h: number, color: number) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat).translateZ(z));
      return mat;
    };
    const midGlows = [
      makeGlow(-CORRIDOR_LENGTH * 0.5,  0.30, CORRIDOR_W * 0.8,  CORRIDOR_H * 0.8,  0xc9a84c),
      makeGlow(-CORRIDOR_LENGTH * 0.25, 0.14, CORRIDOR_W * 0.75, CORRIDOR_H * 0.75, 0xc9a84c),
    ];

    const logoMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), logoMat);
    logoPlane.position.set(0, 0, -CORRIDOR_LENGTH + 7);
    scene.add(logoPlane);
    new THREE.TextureLoader().load('/logo-app.png', (tex) => {
      const aspect = tex.image.width / tex.image.height;
      const h = aspect > CORRIDOR_W / CORRIDOR_H ? CORRIDOR_W / aspect : CORRIDOR_H;
      const w = h * aspect;
      logoPlane.geometry.dispose();
      logoPlane.geometry = new THREE.PlaneGeometry(w, h);
      logoMat.map = tex;
      logoMat.needsUpdate = true;
    });

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

    const clock = new THREE.Clock();
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      camCurrentZ += (camTargetZ - camCurrentZ) * 0.055;
      camera.position.z = camCurrentZ;
      camera.position.x = Math.sin(t * 0.18) * 0.04;
      camera.position.y = -0.4 + Math.sin(t * 0.12) * 0.025;
      camera.lookAt(camera.position.x * 0.2, camera.position.y * 0.2 - 0.4, camCurrentZ - 10);
      const proximity = Math.max(0, 1 - Math.abs(camCurrentZ + 38) / 38);
      glowMat.opacity  = (0.75 + proximity * 0.20) + Math.sin(t * 0.7) * 0.03;
      glow2Mat.opacity = (0.88 + proximity * 0.10) + Math.sin(t * 1.1) * 0.04;
      midGlows[0].opacity = 0.24 + proximity * 0.12;
      midGlows[1].opacity = 0.10 + proximity * 0.06;
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
      window.removeEventListener('resize', onResize);
      unsubscribeStore();
      if (currentScrollbar && sbListener) currentScrollbar.removeListener(sbListener);
      renderer.dispose();
      canvas.remove();
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
  <a class="nav-logo" href="/"><img src="/full_transparent_sans-reflets.png" alt="Thower" class="nav-logo-img" /></a>
  <div class="nav-btns">
    <a class="nav-btn outline" href="/auth/login">Se connecter</a>
    <button class="nav-btn fill" onclick={scrollToForm}>S'inscrire</button>
  </div>
</nav>

<div id="sections">

  <!-- ─── SEC 1 : LA MÉTHODE (inchangé) ─── -->
  <section id="sec1">
    <div class="hero-group">
      <div class="hero-eyebrow">· Programme 3 mois ·</div>
      <div class="hero-h1" id="hero-title">
        <div class="t-row1"><span class="t-la">LA</span><span class="t-space">&nbsp;</span><span class="t-me">MÉ</span></div>
        <div class="t-row2"><span class="t-tho">THO</span><span class="t-swap"><span class="t-de">DE</span><span class="t-wer-ghost">WER</span><span class="t-wer">WER</span></span></div>
      </div>
    </div>
    <p class="hero-sub">Un programme complet pour transformer ton corps et ton mental en 3 mois.</p>
    <div id="scroll-hint" role="button" tabindex="0" onclick={scrollToSec2} onkeydown={(e) => e.key==='Enter' && scrollToSec2()}>
      <span class="hint-label">Découvrir</span>
      <div class="hint-arrow">
        <svg viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7l5 5 5-5" stroke="#f0ede8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
  </section>

  <!-- ─── SEC 2 : LE HERO — La Révélation ─── -->
  <section id="sec2">
    <div class="video-embed">
      <!--
        Quand la vidéo est prête, remplacer le bloc .video-ph par :
        <iframe src="https://www.youtube.com/embed/VIDEO_ID?rel=0" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      -->
      <div class="video-ph">
        <div class="video-ph-icon">
          <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
            <circle cx="32" cy="32" r="30" stroke="#c9a84c" stroke-width="1" opacity="0.5"/>
            <path d="M26 20 L48 32 L26 44 Z" fill="#c9a84c" opacity="0.75"/>
          </svg>
        </div>
        <p class="video-ph-label">Vidéo de présentation — à venir</p>
      </div>
    </div>
    <div class="reveal-content">
      <h1 class="reveal-h1">Reprogramme ton corps<br>et ton mental en 3 mois.</h1>
      <p class="reveal-sub">Oublie les régimes où tu cesses de vivre et où tu reprends tout par la suite. Découvre le système scientifique et concret conçu pour réactiver ton métabolisme et forger une discipline inébranlable.</p>
      <button class="nav-btn fill reveal-cta" onclick={scrollToForm}>DÉMARRER MA TRANSFORMATION</button>
    </div>
  </section>

  <!-- ─── SEC 3 : LE CHOC VISUEL — La Preuve ─── -->
  <section id="sec3">
    <div class="sec-header">
      <div class="sec-eyebrow">— La preuve par l'image</div>
      <h2 class="sec-h2">La preuve en image</h2>
      <p class="sec-text">Ce n'est pas de la magie, c'est de l'ingénierie corporelle.<br>Voici ce que 3 mois d'engagement produisent.<br><span class="gold-text">Zéro hasard, uniquement des résultats.</span></p>
    </div>
    <div class="video-embed compact">
      <!--
        Quand la vidéo time-lapse est prête :
        <video src="/videos/timelapse.mp4" autoplay loop muted playsinline></video>
      -->
      <div class="video-ph teal-ph">
        <div class="video-ph-icon">
          <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
            <rect x="4" y="12" width="56" height="40" rx="3" stroke="#3ab8b8" stroke-width="1" opacity="0.5"/>
            <path d="M22 24 L44 32 L22 40 Z" fill="#3ab8b8" opacity="0.75"/>
          </svg>
        </div>
        <p class="video-ph-label teal-label">Vidéo time-lapse — à venir</p>
      </div>
    </div>
    <button class="nav-btn outline proof-cta" onclick={scrollToForm}>JE VEUX CES RÉSULTATS</button>
  </section>

  <!-- ─── SEC 4 : L'AUTORITÉ — L'Expertise ─── -->
  <section id="sec4">
    <div class="authority-wrap">
      <div class="sec-eyebrow">— L'expertise</div>
      <h2 class="sec-h2">25 ans de recherche<br><span class="gold-text">condensés dans une méthode.</span></h2>
      <p class="authority-text">J'ai condensé des milliers d'heures d'études en neurosciences, biologie cellulaire, nutrition, mécaniques sportives, systèmes hormonaux et physiologie pour créer une méthode redoutable. En alignant le corps, le mental et l'être, la <span class="gold-text">Méthode Thower</span> agit à la racine pour te transformer de l'intérieur.</p>
      <div class="authority-disciplines">
        <span class="discipline-tag">Neurosciences</span>
        <span class="discipline-tag">Biologie cellulaire</span>
        <span class="discipline-tag">Nutrition</span>
        <span class="discipline-tag">Physiologie</span>
        <span class="discipline-tag">Systèmes hormonaux</span>
        <span class="discipline-tag">Mécaniques sportives</span>
      </div>
    </div>
  </section>

  <!-- ─── SEC 5 : LA PROMESSE — La Projection ─── -->
  <section id="sec5">
    <div class="promise-wrap">
      <div class="sec-eyebrow">— La promesse</div>
      <h2 class="sec-h2">Atteins ta forme ultime,<br><span class="teal-text">sans sacrifier ta vie.</span></h2>
      <p class="sec-text" style="margin-bottom: 8px;">Le programme s'adapte à ton quotidien, pas l'inverse.</p>
      <ul class="promise-list">
        <li><span class="promise-check">✦</span>Tu vas perdre ton gras</li>
        <li><span class="promise-check">✦</span>Bâtir du muscle massif</li>
        <li><span class="promise-check">✦</span>Décupler ta vitalité et ton énergie</li>
        <li><span class="promise-check">✦</span>Retrouver un sommeil profond et réparateur</li>
        <li><span class="promise-check">✦</span>Optimiser ta digestion</li>
        <li><span class="promise-check">✦</span>Libido et confiance au plus haut</li>
        <li><span class="promise-check">✦</span>Fini l'épuisement et les douleurs chroniques</li>
      </ul>
      <p class="promise-closing">Le chemin est tracé. Tu n'as qu'à le suivre.</p>
    </div>
  </section>

  <!-- ─── SEC 6 : L'OFFRE — Le Programme Complet ─── -->
  <section id="sec6">
    <div class="sec-header">
      <div class="sec-eyebrow">— L'offre irrésistible</div>
      <h2 class="sec-h2">Voici le programme complet<br><span class="gold-text">pour ta transformation.</span></h2>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <div class="fc-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <line x1="6" y1="20" x2="34" y2="20" stroke="#c9a84c" stroke-width="2" stroke-linecap="round"/>
            <rect x="2" y="16" width="6" height="8" rx="2" stroke="#c9a84c" stroke-width="1.2" fill="none"/>
            <rect x="32" y="16" width="6" height="8" rx="2" stroke="#c9a84c" stroke-width="1.2" fill="none"/>
            <line x1="13" y1="13" x2="13" y2="27" stroke="#c9a84c" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="27" y1="13" x2="27" y2="27" stroke="#c9a84c" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="fc-num">01</div>
        <div class="fc-title">Le Protocole Sportif</div>
        <p class="fc-text">3 sessions de 45 minutes par semaine. Ensemble, on s'adapte à ton niveau et ta progression. Tu les places quand tu veux dans ta semaine — haute efficacité garantie.</p>
        <div class="fc-tags">
          <span class="ptag">▸ Séances A · B · C chaque semaine</span>
          <span class="ptag">▸ Adapté à ton niveau</span>
          <span class="ptag">▸ Progression déblocable</span>
        </div>
      </div>

      <div class="feature-card fc-teal">
        <div class="fc-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <path d="M20 8 C12 8 7 14 7 20 C7 28 14 34 20 34" stroke="#3ab8b8" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M20 8 C28 8 33 14 33 20 C33 28 26 34 20 34" stroke="#3ab8b8" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
            <path d="M20 12 L20 20 L26 16" stroke="#3ab8b8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="fc-num fc-num-teal">02</div>
        <div class="fc-title">L'Intelligence Nutritionnelle</div>
        <p class="fc-text">Fini le casse-tête. Tu auras un planning de recettes faciles à faire, sans avoir faim et en te régalant. Quantités calculées automatiquement, liste de courses générée en un clic.</p>
        <div class="fc-tags">
          <span class="ptag">▸ Recettes personnalisées & adaptables</span>
          <span class="ptag">▸ Macros calculés automatiquement</span>
          <span class="ptag">▸ Liste de courses intégrée</span>
        </div>
      </div>

      <div class="feature-card">
        <div class="fc-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <polygon points="20,4 36,32 4,32" stroke="#c9a84c" stroke-width="1.2" fill="none"/>
            <polygon points="20,14 28,28 12,28" stroke="#c9a84c" stroke-width="1" fill="none" opacity="0.45"/>
            <circle cx="20" cy="22" r="2" fill="#c9a84c" opacity="0.6"/>
          </svg>
        </div>
        <div class="fc-num">03</div>
        <div class="fc-title">L'Arsenal Mindset</div>
        <p class="fc-text">Un reconditionnement quotidien. Nouvelles pratiques chaque semaine pour anéantir tes croyances limitantes et forger un mental d'acier. Check-list journalière avec points à gagner et surprises.</p>
        <div class="fc-tags">
          <span class="ptag">▸ Méditation · Breathwork</span>
          <span class="ptag">▸ Points · Statuts · Cadeaux</span>
          <span class="ptag">▸ Check-list journalière</span>
        </div>
      </div>

      <div class="feature-card fc-teal">
        <div class="fc-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <rect x="4" y="12" width="24" height="16" rx="2" stroke="#3ab8b8" stroke-width="1.2" fill="none"/>
            <path d="M28 17 L36 13 L36 27 L28 23 Z" stroke="#3ab8b8" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
            <circle cx="10" cy="20" r="2.5" stroke="#3ab8b8" stroke-width="1" fill="none"/>
          </svg>
        </div>
        <div class="fc-num fc-num-teal">04</div>
        <div class="fc-title">Le Coaching Live Exclusif</div>
        <p class="fc-text">Un rendez-vous chaque semaine en direct avec moi. Je réponds à toutes tes questions, je débloque tes freins et te livre mes astuces de pointe pour accélérer tes résultats.</p>
        <div class="fc-tags">
          <span class="ptag">▸ Live hebdomadaire</span>
          <span class="ptag">▸ Q&A en direct</span>
          <span class="ptag">▸ Astuces exclusives</span>
        </div>
      </div>

      <div class="feature-card">
        <div class="fc-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <path d="M20 6 L22.5 14 L31 14 L24.5 19 L27 27 L20 22 L13 27 L15.5 19 L9 14 L17.5 14 Z" stroke="#c9a84c" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="fc-num">05</div>
        <div class="fc-title">Ton Boost Quotidien</div>
        <p class="fc-text">Chaque jour, des vidéos pour te garder motivé, te donner des astuces, te faire marrer. Pour que tu vives cette transformation en prenant du plaisir, pas en souffrant.</p>
        <div class="fc-tags">
          <span class="ptag">▸ Vidéos motivationnelles quotidiennes</span>
          <span class="ptag">▸ Astuces & humour</span>
          <span class="ptag">▸ Progression ludique</span>
        </div>
      </div>

      <div class="feature-card fc-teal">
        <div class="fc-icon">
          <svg viewBox="0 0 40 40" fill="none" width="36" height="36">
            <circle cx="20" cy="20" r="14" stroke="#3ab8b8" stroke-width="1.2" fill="none"/>
            <line x1="20" y1="6" x2="20" y2="34" stroke="#3ab8b8" stroke-width="0.7" opacity="0.35"/>
            <line x1="6" y1="20" x2="34" y2="20" stroke="#3ab8b8" stroke-width="0.7" opacity="0.35"/>
            <path d="M20 9 L21.8 17 L20 15.5 L18.2 17 Z" fill="#3ab8b8" opacity="0.85"/>
            <circle cx="20" cy="20" r="2" fill="#3ab8b8" opacity="0.6"/>
          </svg>
        </div>
        <div class="fc-num fc-num-teal">06</div>
        <div class="fc-title">L'Ouverture & la Découverte</div>
        <p class="fc-text">Chaque semaine, de nouvelles activités, de nouveaux sports, de nouvelles pratiques. Du temps pour toi, pour te découvrir. Il y a pas mal de bonnes surprises qui t'attendent.</p>
        <div class="fc-tags">
          <span class="ptag">▸ Nouvelles activités chaque semaine</span>
          <span class="ptag">▸ Découverte de soi</span>
          <span class="ptag">▸ Surprises & bonus exclusifs</span>
        </div>
      </div>
    </div>

    <div class="value-stack">
      <p class="value-stack-title">En résumé, tu obtiens :</p>
      <ul class="value-stack-list">
        <li><span class="vs-check">✓</span> Le Protocole Sportif <span class="vs-detail">(3 sessions / semaine)</span></li>
        <li><span class="vs-check">✓</span> L'Intelligence Nutritionnelle &amp; Listes de courses automatiques</li>
        <li><span class="vs-check">✓</span> L'Arsenal Mindset &amp; Système de Gamification</li>
        <li><span class="vs-check">✓</span> Ton Coaching Live Hebdomadaire avec Tom</li>
        <li><span class="vs-check">✓</span> Tes Vidéos Boost Quotidiennes &amp; Nouvelles activités chaque semaine</li>
      </ul>
    </div>

    <div class="price-block">
      <div class="price-label">Accès complet au programme · 3 mois</div>
      <div class="price-amount">[Prix à venir]</div>
      <div class="price-installment">ou <strong>3× sans frais</strong> — paiement sécurisé</div>
      <div class="price-perks">
        <span class="perk">✦ Accès immédiat</span>
        <span class="perk">✦ 3 mois de programme</span>
        <span class="perk">✦ Coaching live inclus</span>
      </div>
    </div>

    <button class="nav-btn fill offer-cta" onclick={scrollToForm}>REJOINDRE LA MÉTHODE THOWER MAINTENANT</button>
  </section>

  <!-- ─── SEC 7 : FORMULAIRE ─── -->
  <section id="sec7">
    <div class="form-wrap" id="form-anchor">
      <h2 class="form-h2">Créer un <span class="highlight-word">compte</span></h2>
      <p class="form-sub">Inscris-toi pour accéder au programme et activer ton <span class="highlight-word">compte</span>.</p>

      <a href={resolve('/auth/login/google')} class="google-link">
        <Button type="button" variant="outline" class="google-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="google-icon">
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
              fill="currentColor"
            />
          </svg>
          S'inscrire avec Google
        </Button>
      </a>

      <div class="divider">
        <div class="divider-line"></div>
        <span class="divider-text">ou</span>
      </div>

      <form method="POST" use:signupEnhance action="?/signup" class="form-fields" bind:this={formElement} onsubmit={handleFormSubmit}>
        <Form.Field name="username" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Nom d'utilisateur</Form.Label>
            <Input name="username" type="text" bind:value={$signupData.username} placeholder="Jean Dupont" required class="field-input-custom" />
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>
        <Form.Field name="email" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Email</Form.Label>
            <Input name="email" type="email" bind:value={$signupData.email} placeholder="jean@email.com" required class="field-input-custom" />
            <Form.Description class="form-note">Nous ne partagerons jamais votre email.</Form.Description>
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>
        <Form.Field name="password" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Mot de passe</Form.Label>
            <Input name="password" type="password" bind:value={$signupData.password} placeholder="••••••••" required class="field-input-custom" />
            <Form.Description class="form-note">Au moins 8 caractères, une majuscule et un chiffre.</Form.Description>
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>
        <Form.Field name="confirmPassword" form={signupForm}>
          <Form.Control>
            <Form.Label class="field-label">Confirmer le mot de passe</Form.Label>
            <Input name="confirmPassword" type="password" bind:value={$signupData.confirmPassword} placeholder="••••••••" required class="field-input-custom" />
          </Form.Control>
          <Form.FieldErrors class="field-error" />
        </Form.Field>
        <Button type="submit" class="form-submit-custom">Créer mon compte</Button>
      </form>
    </div>
  </section>

</div>

<section id="social">
  <div class="social-band">
    <a href="#" class="social-link" aria-label="Instagram">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </a>
    <a href="#" class="social-link" aria-label="YouTube">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon points="9.75,15.02 15.5,12 9.75,8.98" fill="currentColor" stroke="none"/>
      </svg>
    </a>
    <a href="#" class="social-link" aria-label="TikTok">
      <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
      </svg>
    </a>
  </div>
</section>

<section id="contact-cta">
  <div class="contact-cta-inner">
    <p class="contact-cta-text">Tu as une question ou besoin d'un renseignement,<br>je te répondrai personnellement et avec plaisir.</p>
    <a href="/contact" class="nav-btn outline contact-cta-btn">Me contacter</a>
  </div>
</section>

<footer>
  <div class="footer-logo">T<span>H</span>OWER</div>
  <div class="footer-links">
    <a href="/mentions-legales" class="footer-legal">Mentions légales</a>
    <a href="/cgu" class="footer-legal">CGU</a>
    <a href="/cgv" class="footer-legal">CGV</a>
    <a href="/politique-confidentialite" class="footer-legal">Politique de confidentialité</a>
  </div>
  <div class="footer-copy">© 2026 Thower · Tous droits réservés</div>
</footer>

<style>
  :root { --black: #0a0a0a; --white: #f0ede8; --gold: #c9a84c; --teal: #3ab8b8; }

  #progress-line { position: fixed; top: 0; left: 0; height: 2px; background: var(--gold); z-index: 200; transition: width 0.1s linear; pointer-events: none; }

  /* ── Nav ── */
  nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: flex-start; justify-content: space-between; padding: 24px 48px; gap: 24px; flex-wrap: wrap; }
  .nav-logo { text-decoration: none; flex: 0 0 auto; display: flex; align-items: center; }
  .nav-logo-img { height: 72px; width: auto; display: block; }
  .nav-btns { display: flex; gap: 12px; }
  .nav-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 26px; font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
    font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
    text-decoration: none; cursor: none; border: none; transition: all 0.2s; white-space: nowrap;
  }
  .nav-btn.outline { background: transparent; border: 1px solid rgba(240,237,232,0.3); color: var(--white); }
  .nav-btn.outline:hover { border-color: var(--gold); color: var(--gold); }
  .nav-btn.fill { background: var(--gold); color: var(--black); font-weight: 600; }
  .nav-btn.fill:hover { background: #e0bc62; }

  /* ── Sections container ── */
  #sections { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; width: 100%; }
  #sections > section { width: 100%; display: flex; flex-direction: column; align-items: center; pointer-events: all; }

  /* ── SEC 1 : LA MÉTHODE ── */
  #sec1 { height: 100vh; justify-content: space-between; padding: 18vh 24px 10vh; }
  .hero-group { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
  .hero-eyebrow { font-size: 0.75rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--teal); text-align: center; opacity: 0; animation: fadeUp 1s 0.4s forwards; }
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
  .hero-sub { font-size: 1.05rem; font-weight: 300; color: rgba(240,237,232,0.55); letter-spacing: 0.04em; text-align: center; max-width: 420px; line-height: 1.75; opacity: 0; animation: fadeUp 1s 1s forwards; }
  #scroll-hint { display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: none; opacity: 0; animation: fadeUp 1s 1.4s forwards; }
  #scroll-hint:hover .hint-arrow { border-color: var(--gold); }
  .hint-label { font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,237,232,0.4); }
  .hint-arrow { width: 36px; height: 36px; border: 1px solid rgba(240,237,232,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: border-color 0.2s; animation: bounce 2.4s 2s infinite; }

  /* ── Styles partagés ── */
  .sec-eyebrow { font-size: 0.78rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--teal); margin-bottom: 16px; }
  .sec-h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.6rem, 5.5vw, 5rem); line-height: 0.95; letter-spacing: 0.04em; color: var(--white); margin-bottom: 24px; }
  .sec-text { font-size: 1.05rem; font-weight: 300; color: rgba(240,237,232,0.62); line-height: 1.9; max-width: 640px; text-align: center; }
  .sec-header { text-align: center; max-width: 720px; width: 100%; }
  .gold-text { color: var(--gold); }
  .teal-text { color: var(--teal); }

  /* ── Video placeholder ── */
  .video-embed { width: 100%; max-width: 860px; position: relative; }
  .video-embed::before { content: ''; display: block; padding-top: 56.25%; }
  .video-embed iframe,
  .video-embed video,
  .video-embed .video-ph { position: absolute; inset: 0; width: 100%; height: 100%; }
  .video-embed.compact { max-width: 680px; }
  .video-ph { background: rgba(10,10,10,0.85); border: 1px solid rgba(201,168,76,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
  .video-ph.teal-ph { border-color: rgba(58,184,184,0.2); }
  .video-ph-label { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,237,232,0.3); }
  .video-ph-label.teal-label { color: rgba(58,184,184,0.45); }

  /* ── SEC 2 : La Révélation ── */
  #sec2 { padding: 120px 48px 100px; gap: 56px; border-top: 1px solid rgba(255,255,255,0.05); }
  .reveal-content { text-align: center; max-width: 720px; display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .reveal-h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.8rem, 5.5vw, 5rem); line-height: 1.05; letter-spacing: 0.04em; color: var(--white); }
  .reveal-sub { font-size: 1.1rem; font-weight: 300; color: rgba(240,237,232,0.6); line-height: 1.9; max-width: 600px; }
  .reveal-cta { padding: 16px 40px; font-size: 0.9rem; }

  /* ── SEC 3 : Le Choc Visuel ── */
  #sec3 { padding: 100px 48px; gap: 48px; border-top: 1px solid rgba(255,255,255,0.05); }
  .proof-cta { padding: 12px 30px; font-size: 0.82rem; }

  /* ── SEC 4 : L'Autorité ── */
  #sec4 { padding: 100px 48px; border-top: 1px solid rgba(255,255,255,0.05); }
  .authority-wrap { max-width: 780px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .authority-text { font-size: 1.1rem; font-weight: 300; color: rgba(240,237,232,0.68); line-height: 2; max-width: 680px; }
  .authority-disciplines { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .discipline-tag { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); border: 1px solid rgba(201,168,76,0.3); padding: 7px 16px; }

  /* ── SEC 5 : La Promesse ── */
  #sec5 { padding: 100px 48px; border-top: 1px solid rgba(255,255,255,0.05); }
  .promise-wrap { max-width: 680px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .promise-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; text-align: center; width: 100%; max-width: 520px; }
  .promise-list li { font-size: 1.05rem; font-weight: 300; color: rgba(240,237,232,0.85); line-height: 1.5; display: flex; align-items: center; gap: 16px; justify-content: center; }
  .promise-check { color: var(--gold); font-size: 0.65rem; flex-shrink: 0; }
  .promise-closing { font-family: 'Bebas Neue', sans-serif; font-size: 1.8rem; letter-spacing: 0.1em; color: var(--gold); }

  /* ── Value Stack ── */
  .value-stack { max-width: 620px; width: 100%; padding: 36px 40px; border: 1px solid rgba(201,168,76,0.25); background: rgba(10,10,10,0.7); backdrop-filter: blur(10px); }
  .value-stack-title { font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(240,237,232,0.45); margin-bottom: 20px; text-align: center; }
  .value-stack-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
  .value-stack-list li { display: flex; align-items: baseline; gap: 14px; font-size: 1rem; font-weight: 300; color: rgba(240,237,232,0.85); line-height: 1.5; }
  .vs-check { color: var(--gold); font-size: 1rem; font-weight: 600; flex-shrink: 0; }
  .vs-detail { color: rgba(240,237,232,0.4); font-size: 0.85rem; }

  /* ── SEC 6 : L'Offre ── */
  #sec6 { padding: 100px 48px 120px; gap: 60px; border-top: 1px solid rgba(255,255,255,0.05); }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%; max-width: 1100px; }
  .feature-card { background: rgba(10,10,10,0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); padding: 36px 28px; transition: background 0.3s, border-color 0.3s; display: flex; flex-direction: column; }
  .fc-teal { border-color: rgba(58,184,184,0.14); }
  .feature-card:hover { background: rgba(6,6,6,0.95); border-color: rgba(201,168,76,0.3); }
  .fc-teal:hover { border-color: rgba(58,184,184,0.4); }
  .fc-icon { margin-bottom: 20px; }
  .fc-num { font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; color: var(--gold); opacity: 0.38; line-height: 1; margin-bottom: 10px; }
  .fc-num-teal { color: var(--teal); }
  .fc-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.45rem; letter-spacing: 0.06em; color: var(--white); margin-bottom: 14px; }
  .fc-text { font-size: 0.95rem; font-weight: 300; color: rgba(240,237,232,0.7); line-height: 1.9; margin-bottom: 20px; flex: 1; }
  .fc-tags { display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
  .ptag { font-size: 0.7rem; color: rgba(240,237,232,0.42); letter-spacing: 0.06em; }

  /* Prix */
  .price-block { text-align: center; padding: 48px 60px; border: 1px solid rgba(201,168,76,0.25); background: rgba(10,10,10,0.7); backdrop-filter: blur(10px); max-width: 560px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .price-label { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(240,237,232,0.38); }
  .price-amount { font-family: 'Bebas Neue', sans-serif; font-size: clamp(3rem, 6vw, 5rem); color: var(--gold); letter-spacing: 0.06em; line-height: 1; }
  .price-installment { font-size: 1rem; font-weight: 300; color: rgba(240,237,232,0.5); }
  .price-installment strong { color: var(--teal); font-weight: 500; }
  .price-perks { display: flex; gap: 28px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }
  .perk { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(240,237,232,0.32); }
  .offer-cta { padding: 18px 48px; font-size: 0.92rem; letter-spacing: 0.12em; }

  /* ── SEC 7 : Formulaire ── */
  #sec7 { min-height: 80vh; justify-content: center; padding: 100px 48px 160px; border-top: 1px solid rgba(255,255,255,0.05); }
  .form-wrap { width: 100%; max-width: 520px; text-align: center; background: rgba(10,10,10,0.7); backdrop-filter: blur(10px); padding: 48px; border-radius: 8px; border: 1px solid rgba(201,168,76,0.15); }
  .form-h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.4rem, 5vw, 4rem); letter-spacing: 0.06em; line-height: 1; margin-bottom: 8px; }
  .form-sub { font-size: 0.95rem; font-weight: 300; color: rgba(240,237,232,0.45); margin-bottom: 36px; line-height: 1.7; }
  .form-fields { display: flex; flex-direction: column; gap: 10px; text-align: left; width: 100%; }
  :global(.field-input-custom) { background: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: var(--white) !important; font-family: 'DM Sans', sans-serif !important; font-size: 0.95rem !important; padding: 14px 16px !important; border-radius: 4px !important; width: 100% !important; box-sizing: border-box !important; }
  :global(.field-input-custom:focus) { border-color: var(--gold) !important; background: rgba(201,168,76,0.04) !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.1) !important; outline: none !important; }
  :global(.field-input-custom::placeholder) { color: rgba(240,237,232,0.3) !important; }
  :global(.field-error) { font-size: 0.8rem !important; color: #ff6b6b !important; margin-top: 4px !important; margin-bottom: 4px !important; display: flex !important; align-items: center !important; gap: 4px !important; }
  :global(.form-submit-custom) { margin-top: 20px !important; width: 100% !important; padding: 18px !important; background: var(--gold) !important; color: var(--black) !important; font-family: 'Bebas Neue', sans-serif !important; font-size: 1.2rem !important; letter-spacing: 0.14em !important; border: none !important; cursor: none !important; transition: all 0.2s !important; border-radius: 4px !important; text-transform: uppercase !important; font-weight: 600 !important; }
  :global(.form-submit-custom:hover) { background: #e0bc62 !important; transform: translateY(-2px) !important; box-shadow: 0 8px 16px rgba(201,168,76,0.3) !important; }
  :global(.form-submit-custom:active) { transform: translateY(0px) !important; }
  .divider { position: relative; margin: 20px 0; display: flex; align-items: center; width: 100%; }
  .divider-line { flex: 1; height: 1px; background: rgba(201,168,76,0.18); }
  .divider-text { padding: 0 12px; font-size: 0.75rem; color: rgba(240,237,232,0.4); text-transform: uppercase; letter-spacing: 0.1em; }
  .google-link { display: block; text-decoration: none; }
  :global(.google-btn) { width: 100% !important; border: 1px solid rgba(58,184,184,0.2) !important; color: rgba(240,237,232,0.7) !important; font-family: 'DM Sans', sans-serif !important; transition: all 0.2s !important; cursor: none !important; }
  :global(.google-btn:hover) { border-color: var(--teal) !important; color: var(--teal) !important; background: rgba(58,184,184,0.05) !important; }
  .google-icon { width: 18px; height: 18px; margin-right: 8px; }
  .field-input { display: none; }
  .field-error { display: none; }
  .form-submit { display: none; }
  .form-note { margin-top: 14px; font-size: 0.75rem; color: rgba(240,237,232,0.25); line-height: 1.6; }
  .highlight-word { color: var(--teal); }

  /* ── Social ── */
  #social { position: relative; z-index: 10; display: flex; justify-content: center; padding: 0 48px 80px; pointer-events: all; }
  .social-band { display: flex; gap: 52px; align-items: center; padding: 36px 80px; border-top: 1px solid rgba(255,255,255,0.07); border-bottom: 1px solid rgba(255,255,255,0.07); }
  .social-link { color: rgba(240,237,232,0.3); transition: color 0.25s; display: flex; align-items: center; }
  .social-link:hover { color: var(--gold); }

  /* ── Contact CTA ── */
  #contact-cta { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 28px; padding: 72px 48px; pointer-events: all; }
  #contact-cta > .contact-cta-inner { background: rgba(10,10,10,0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 52px 64px; display: flex; flex-direction: column; align-items: center; gap: 28px; max-width: 680px; width: 100%; }
  .contact-cta-text { font-family: 'DM Sans', sans-serif; font-size: clamp(1.05rem, 2.2vw, 1.4rem); font-weight: 300; color: var(--teal); text-align: center; line-height: 1.75; letter-spacing: 0.02em; }
  .contact-cta-btn { border-color: var(--teal) !important; color: var(--teal) !important; }
  .contact-cta-btn:hover { background: rgba(58,184,184,0.08) !important; }

  /* ── Footer ── */
  footer { position: relative; z-index: 10; padding: 40px 48px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; pointer-events: all; }
  .footer-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; letter-spacing: 0.1em; color: rgba(240,237,232,0.25); }
  .footer-logo span { color: var(--gold); opacity: 0.5; }
  .footer-links { display: flex; gap: 20px; }
  .footer-legal { font-size: 0.7rem; color: rgba(240,237,232,0.2); letter-spacing: 0.06em; text-decoration: none; transition: color 0.2s; }
  .footer-legal:hover { color: rgba(240,237,232,0.5); }
  .footer-copy { font-size: 0.7rem; color: rgba(240,237,232,0.2); letter-spacing: 0.06em; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }

  /* ── Tablette ── */
  @media (max-width: 900px) {
    nav { padding: 20px 24px; }
    .nav-logo-img { height: 56px; }
    .nav-btn { padding: 8px 16px; font-size: 0.72rem; }
    #sec1 { padding: 15vh 24px 8vh; }
    .hero-h1 { font-size: clamp(4rem, 12vw, 8rem); }
    #sec2, #sec3, #sec4, #sec5, #sec6, #sec7 { padding: 72px 24px; }
    .features-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
    .sec-h2 { font-size: clamp(2rem, 5vw, 3.5rem); }
    .reveal-h1 { font-size: clamp(2rem, 5vw, 3.5rem); }
    .price-block { padding: 36px 32px; }
    footer { flex-direction: column; gap: 12px; text-align: center; padding: 24px; }
  }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    nav { flex-direction: column; align-items: flex-start; padding: 16px 20px; gap: 12px; }
    .nav-logo-img { height: 44px; }
    .nav-btns { gap: 8px; }
    .nav-btn { padding: 8px 14px; font-size: 0.68rem; }
    #progress-line { height: 1px; }
    #sec1 { height: auto; min-height: 100vh; padding: 165px 16px 60px; justify-content: flex-start; }
    .hero-group { gap: 2rem; margin-top: 40px; }
    .hero-h1 { font-size: clamp(5rem, 28vw, 9rem); letter-spacing: -0.02em; width: 100vw; max-width: 100%; line-height: 0.85; }
    .hero-sub { font-size: 1rem; max-width: 100%; padding: 0 8px; margin-top: 40px; }
    #scroll-hint { margin-top: 80px; }
    #sec2, #sec3, #sec4, #sec5, #sec6, #sec7 { padding: 60px 16px; gap: 36px; }
    .sec-h2 { font-size: clamp(1.8rem, 7vw, 2.8rem); }
    .reveal-h1 { font-size: clamp(1.8rem, 7vw, 2.8rem); }
    .reveal-sub, .sec-text, .authority-text { font-size: 1rem; }
    .promise-wrap { background: rgba(8,8,8,0.48); border-radius: 8px; padding: 28px 20px; }
    .promise-list li { font-size: 1rem; }
    .features-grid { grid-template-columns: 1fr; gap: 8px; }
    .feature-card { padding: 28px 20px; background: rgba(8,8,8,0.88); }
    .fc-text { font-size: 1rem; }
    .value-stack { padding: 24px 16px; }
    .value-stack-list li { font-size: 1rem; }
    .price-block { padding: 28px 20px; }
    .price-amount { font-size: clamp(2.5rem, 8vw, 3.5rem); }
    .offer-cta { padding: 16px 24px; font-size: 0.82rem; }
    .form-wrap { max-width: 100%; padding: 28px 16px; border-radius: 6px; }
    .form-h2 { font-size: clamp(1.6rem, 6vw, 2.2rem); }
    .form-sub { font-size: 1rem; }
    :global(.field-input-custom) { font-size: 1rem !important; padding: 12px !important; }
    :global(.form-submit-custom) { font-size: 1rem !important; padding: 16px !important; }
    .authority-disciplines { gap: 8px; }
    .discipline-tag { font-size: 0.65rem; padding: 5px 10px; }
    .price-perks { gap: 14px; }
    .social-band { gap: 36px; padding: 28px 40px; }
    .contact-cta-inner { padding: 36px 24px; }
    .footer-copy, .footer-legal { font-size: 0.65rem; }
  }
</style>
