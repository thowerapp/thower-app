<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { goto } from '$app/navigation';
	import * as Card from '$shadcn/card';
	import { Button } from '$shadcn/button';
	import { toast } from 'svelte-sonner';
	import {
		UserCircle,
		ReceiptText,
		Ruler,
		CreditCard,
		Smartphone,
		Bell,
		LayoutDashboard,
		Download,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
	import { pwaInstallPrompt } from '$lib/store/pwaInstallStore';
	import {
		showTestNotification,
		isNotificationSupported,
		getNotificationPermission,
		NOTIFICATION_DENIED_HELP
	} from '$lib/pwa/notifications';

	let { data } = $props();

	let pwaStepsExpanded = $state(false);

	async function handlePwaInstall() {
		const prompt = $pwaInstallPrompt;
		if (prompt) {
			try {
				await prompt.prompt();
				const choice = await prompt.userChoice;
				if (choice.outcome === 'accepted') toast.success("L'app Thower a été installée.");
				pwaInstallPrompt.set(null);
			} catch (err) {
				console.error('[PWA] erreur prompt:', err);
			}
		} else {
			await goto('/user/');
		}
	}

	async function handleTestNotification() {
		try {
			await showTestNotification();
			notificationPermission = 'granted';
			toast.success('Notification de test envoyée.');
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Impossible d'afficher la notification.";
			notificationPermission = getNotificationPermission();
			toast.error(msg);
		}
	}

	let notificationPermission = $state<'default' | 'granted' | 'denied'>('default');
	$effect(() => {
		if (typeof window !== 'undefined' && isNotificationSupported()) {
			notificationPermission = getNotificationPermission();
		}
	});

	const hasMeasurements   = $derived(data?.hasMeasurements ?? false);
	const hasValidPayment   = $derived(data?.hasValidPayment ?? false);
	const hasAnyTransaction = $derived((data as { hasAnyTransaction?: boolean } | null)?.hasAnyTransaction ?? false);
	const onboardingStep    = $derived((data as { onboardingStep?: string } | null)?.onboardingStep ?? 'payment');
	const subscriptionEndsAt = $derived(data?.subscriptionEndsAt ?? null);
	const subscriptionLabel  = $derived(
		subscriptionEndsAt
			? new Date(subscriptionEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
			: null
	);
	const isGoogleUser = $derived(!!data?.user?.googleId);

	$effect(() => {
		if (typeof window === 'undefined') return;
		console.log('[auth/page] rendered user context', {
			userId: data?.user?.id ?? null,
			email: data?.user?.email ?? null,
			role: data?.user?.role ?? null,
			googleId: data?.user?.googleId ?? null,
			isGoogleUser: !!data?.user?.googleId,
			hasMeasurements: !!(data?.hasMeasurements ?? false),
			hasValidPayment: !!(data?.hasValidPayment ?? false),
			hasAnyTransaction: !!((data as { hasAnyTransaction?: boolean } | null)?.hasAnyTransaction ?? false),
			subscriptionEndsAt: data?.subscriptionEndsAt ?? null
		});
	});

	onMount(() => {
		// ── THREE.JS ──
		const canvas = document.createElement('canvas');
		canvas.style.cssText = 'position:fixed;inset:0;z-index:0;width:100%;height:100%;pointer-events:none;';
		document.body.appendChild(canvas);
		const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0x0a0a0a);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.1;
		const scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0x0a0a0a, 0.038);
		const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 120);
		camera.position.set(0, 0, -10);
		const CL = 40, CW = 5, CH = 4;
		const wallMat = new THREE.MeshBasicMaterial({ color: 0x0d0a06, side: THREE.BackSide });
		const box = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CL), wallMat);
		box.position.set(0, 0, -CL/2); scene.add(box);
		const gMat = new THREE.LineBasicMaterial({ color: 0x3a2e18, transparent: true, opacity: .85 });
		const mk = (p1: [number,number,number], p2: [number,number,number]) => {
			const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p1), new THREE.Vector3(...p2)]);
			return new THREE.Line(g, gMat);
		};
		for (let x = -2; x <= 2; x += .5) scene.add(mk([x,-CH/2,2],[x,-CH/2,-CL-2]));
		for (let z = 0; z >= -CL; z -= 2) scene.add(mk([-CW/2,-CH/2,z],[CW/2,-CH/2,z]));
		const tMat = new THREE.LineBasicMaterial({ color: 0x5a4020, transparent: true, opacity: .7 });
		for (let z = 0; z >= -CL; z -= 4) {
			[[-CW/2],[CW/2]].forEach(([x]) => {
				const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-CH/2,z),new THREE.Vector3(x,CH/2,z)]);
				scene.add(new THREE.Line(g, tMat));
			});
		}
		const glowMat  = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false });
		const glowMat2 = new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: .82, side: THREE.DoubleSide, depthWrite: false });
		const gp  = new THREE.Mesh(new THREE.PlaneGeometry(CW*.9,CH*.9), glowMat);  gp.position.z = -CL+.5; scene.add(gp);
		const gp2 = new THREE.Mesh(new THREE.PlaneGeometry(CW*.4,CH*.6), glowMat2); gp2.position.z = -CL+.3; scene.add(gp2);
		const PCOUNT = 180;
		const pPos = new Float32Array(PCOUNT*3);
		for (let i = 0; i < PCOUNT; i++) { pPos[i*3]=(Math.random()-.5)*(CW-.4); pPos[i*3+1]=(Math.random()-.5)*(CH-.4); pPos[i*3+2]=-Math.random()*CL; }
		const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
		const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc9a84c, size: .025, transparent: true, opacity: .55, sizeAttenuation: true }));
		scene.add(pts);
		const clk = new THREE.Clock();
		let animId: number;
		const animate = () => {
			animId = requestAnimationFrame(animate);
			const t = clk.getElapsedTime();
			camera.position.x = Math.sin(t*.18)*.04;
			camera.position.y = Math.sin(t*.12)*.025;
			camera.lookAt(camera.position.x*.2, camera.position.y*.2, -20);
			glowMat.opacity  = .45 + Math.sin(t*.7)*.03;
			glowMat2.opacity = .70 + Math.sin(t*1.1)*.04;
			const pos = pts.geometry.attributes.position.array as Float32Array;
			for (let i = 0; i < PCOUNT; i++) { pos[i*3+1] += .0008; if (pos[i*3+1] > CH/2) pos[i*3+1] = -CH/2; }
			pts.geometry.attributes.position.needsUpdate = true;
			renderer.render(scene, camera);
		};
		animate();
		const onResize = () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
		window.addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(animId);
			window.removeEventListener('resize', onResize);
			renderer.dispose(); 
			canvas.remove();
		};
	});
</script>

<svelte:head>
	<title>Paramètres — Thower</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
</svelte:head>

<div class="page">

	<!-- En-tête -->
	<header class="page-header">
		<p class="page-eyebrow">— Votre espace</p>
		<h1 class="page-title">Paramètres</h1>
		<p class="page-subtitle">Gérez votre compte et installez l'application Thower.</p>
		{#if hasValidPayment}
			<div class="page-badge">
				<span class="badge-dot"></span>
				Application disponible — accès actif
			</div>
		{/if}
	</header>

	<!-- Contenu principal -->
	<main class="page-main">

		<!-- ── MON COMPTE ── -->
		<section class="section">
			<h2 class="section-title">
				<UserCircle size={16} />
				Mon compte
			</h2>

			<div class="cards-col">

				                <!-- Profil -->
                <div class="card">
                    <div class="card-head">
                        <span class="card-icon"><UserCircle size={15} /></span>
                        <div>
                            <div class="card-title">Profil</div>
                            <div class="card-desc">Vos informations de base</div>
                        </div>
                    </div>
                    <div class="card-body">
                        {#if data.user.name}
                            <div class="info-row"><span class="info-label">Nom</span><span class="info-val">{data.user.name}</span></div>
                        {/if}
                        <div class="info-row"><span class="info-label">Email</span><span class="info-val">{data.user.email}</span></div>
                    </div>
                    <div class="card-foot space-y-2">
                        {#if !isGoogleUser}
                            <a href="/auth/account" class="profile-link">
                                Paramètres de sécurité
                            </a>
                        {/if}
                        <form method="POST" action="?/signout" class="w-full">
                            <Button 
                                type="submit"
                                variant="destructive"
                                class="w-full"
                            >
                                Se déconnecter
                            </Button>
                        </form>
                    </div>
                </div>

				<!-- Facturation -->
				{#if data.user.role === 'CLIENT' && hasAnyTransaction}
					<div class="card">
						<div class="card-head">
							<span class="card-icon"><ReceiptText size={15} /></span>
							<div>
								<div class="card-title">Facturation</div>
								<div class="card-desc">Historique de vos factures</div>
							</div>
						</div>
						<div class="card-foot">
							<a href="/auth/factures" class="btn btn-outline w-full">Mes factures</a>
						</div>
					</div>
				{/if}

				<!-- Admin -->
				{#if data.user.role === 'ADMIN'}
					<div class="card">
						<div class="card-head">
							<span class="card-icon"><LayoutDashboard size={15} /></span>
							<div>
								<div class="card-title">Administration</div>
								<div class="card-desc">Tableau de bord admin</div>
							</div>
						</div>
						<div class="card-foot">
							<a href="/admin" class="btn btn-outline w-full">Dashboard Admin</a>
						</div>
					</div>
				{/if}

			</div>
		</section>

		<!-- ── PROCÉDURE (clients, y compris OAuth, hors admin) ── -->
		{#if data.user.role !== 'ADMIN'}
		<section class="section">
			<h2 class="section-title">
				<Smartphone size={16} />
				Accès à l'application
			</h2>

			<!-- Stepper -->
			<div class="stepper">
				<a href="/auth/subscription" class="step {hasValidPayment ? 'step-done' : 'step-active'}">
					<span class="step-dot">
						{#if hasValidPayment}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
						{:else}1{/if}
					</span>
					<span class="step-label">Paiement</span>
				</a>
				<div class="step-line {hasValidPayment ? 'step-line-done' : ''}"></div>
				<a href="/auth/measurement" class="step {hasMeasurements ? 'step-done' : hasValidPayment ? 'step-active' : 'step-pending'}">
					<span class="step-dot">
						{#if hasMeasurements}
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
						{:else}2{/if}
					</span>
					<span class="step-label">Profil physique</span>
				</a>
				<div class="step-line {hasMeasurements ? 'step-line-done' : ''}"></div>
				<span class="step {hasMeasurements ? 'step-active' : 'step-pending'}">
					<span class="step-dot">3</span>
					<span class="step-label">Application</span>
				</span>
			</div>

			<div class="cards-col">

				<!-- Souscription (Paiement) — Étape 1 -->
				<div class="card">
					<div class="card-head">
						<span class="card-icon"><CreditCard size={15} /></span>
						<div>
							<div class="card-title">Souscription</div>
							<div class="card-desc">
								{#if hasValidPayment}
									{subscriptionLabel ? `Valide jusqu'au ${subscriptionLabel}` : 'Accès à vie'}
								{:else}
									Paiement sécurisé Stripe
								{/if}
							</div>
						</div>
					</div>
					<div class="card-foot">
						<a href="/auth/subscription" class="btn btn-gold w-full">
							{hasValidPayment ? 'Voir / Renouveler' : 'Procéder au paiement'}
						</a>
					</div>
				</div>

				<!-- Mesures (Profil) — Étape 2, visible si paiement OK -->
				{#if hasValidPayment}
					<div class="card {!hasMeasurements ? 'card-alert' : ''}">
						<div class="card-head">
							<span class="card-icon"><Ruler size={15} /></span>
							<div>
								<div class="card-title">
									Profil physique
									{#if !hasMeasurements}<span class="badge-alert">À remplir</span>{/if}
								</div>
								<div class="card-desc">Mensurations et objectifs corporels</div>
							</div>
						</div>
						<div class="card-foot">
							<a href="/auth/measurement" class="btn {!hasMeasurements ? 'btn-gold' : 'btn-outline'} w-full">
								{!hasMeasurements ? 'Remplir mon profil' : 'Modifier'}
							</a>
						</div>
					</div>
				{/if}

				<!-- PWA Install — Étape 3, visible si paiement ET profil OK -->
				{#if hasValidPayment && hasMeasurements}
					<div class="card">
						<div class="card-head">
							<span class="card-icon"><Download size={15} /></span>
							<div>
								<div class="card-title">Installer l'application</div>
								<div class="card-desc">Disponible sur tous vos appareils</div>
							</div>
						</div>
						<div class="card-body">
							<button type="button" class="btn btn-gold w-full" onclick={handlePwaInstall}>
								<Download size={14} />
								{$pwaInstallPrompt ? "Installer l'app" : "Ouvrir l'app"}
							</button>
							<button
								type="button"
								class="btn-ghost"
								onclick={() => (pwaStepsExpanded = !pwaStepsExpanded)}
							>
								{#if pwaStepsExpanded}<ChevronUp size={13} />{:else}<ChevronDown size={13} />{/if}
								Instructions selon l'appareil
							</button>
							{#if pwaStepsExpanded}
								<ul class="install-steps">
									<li><strong>Chrome / Edge (PC)</strong> — menu ⋮ → Installer l'application</li>
									<li><strong>Chrome (Android)</strong> — menu ⋮ → Ajouter à l'écran d'accueil</li>
									<li><strong>Safari (iPhone/iPad)</strong> — Partager → Sur l'écran d'accueil</li>
								</ul>
							{/if}
						</div>
					</div>

					<!-- Notifications — visible si app complète -->
					{#if isNotificationSupported()}
						<div class="card">
							<div class="card-head">
								<span class="card-icon"><Bell size={15} /></span>
								<div>
									<div class="card-title">Notifications</div>
									<div class="card-desc">Rappel quotidien à 20h40</div>
								</div>
							</div>
							<div class="card-body">
								{#if notificationPermission === 'denied'}
									<div class="alert-box">{NOTIFICATION_DENIED_HELP}</div>
								{/if}
								<button type="button" class="btn btn-outline w-full" onclick={handleTestNotification}>
									<Bell size={14} />
									Notification de test
								</button>
							</div>
						</div>
					{/if}
				{/if}

			</div>
		</section>

		<!-- Accès bloqué -->
		{#if !hasValidPayment}
			<div class="locked-msg">
				{#if !hasMeasurements}
					<a href="/auth/measurement">Remplissez votre profil physique</a> pour débloquer le paiement, puis l'application.
				{:else}
					<a href="/auth/subscription">Finalisez votre souscription</a> pour débloquer l'application.
				{/if}
			</div>
		{/if}

		{/if}

	</main>
</div>

<style lang="scss">
	:root {
		--black: #0a0a0a;
		--white: #f0ede8;
		--gold:  #c9a84c;
		--teal:  #3ab8b8;
	}

	/* ─── PAGE ─── */
	.page {
		position: relative;
		z-index: 10;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0 24px 80px;
		pointer-events: all;
	}

	/* ─── HEADER ─── */
	.page-header {
		width: 100%;
		max-width: 640px;
		text-align: center;
		padding: 80px 0 56px;
		border-bottom: 1px solid rgba(255,255,255,.06);
		margin-bottom: 56px;
	}
	.page-eyebrow {
		font-size: .65rem;
		letter-spacing: .24em;
		text-transform: uppercase;
		color: var(--teal);
		margin-bottom: 12px;
	}
	.page-title {
		font-family: 'Bebas Neue', sans-serif;
		font-size: clamp(3rem, 8vw, 5rem);
		letter-spacing: .06em;
		line-height: 1;
		color: var(--white);
		margin-bottom: 14px;
	}
	.page-subtitle {
		font-size: .9rem;
		font-weight: 300;
		color: rgba(240,237,232,.45);
		line-height: 1.7;
	}
	.page-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 20px;
		padding: 8px 16px;
		border: 1px solid rgba(201,168,76,.25);
		background: rgba(201,168,76,.06);
		font-size: .65rem;
		letter-spacing: .1em;
		text-transform: uppercase;
		color: var(--gold);
	}
	.badge-dot {
		width: 6px; height: 6px;
		border-radius: 50%;
		background: var(--gold);
		flex-shrink: 0;
	}

	/* ─── MAIN ─── */
	.page-main {
		width: 100%;
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: 56px;
	}

	/* ─── SECTION ─── */
	.section { display: flex; flex-direction: column; gap: 24px; }
	.section-title {
		font-family: 'DM Sans', sans-serif;
		font-size: .65rem;
		font-weight: 500;
		letter-spacing: .2em;
		text-transform: uppercase;
		color: rgba(240,237,232,.35);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* ─── CARDS ─── */
	.cards-col { display: flex; flex-direction: column; gap: 2px; }

	.card {
		background: rgba(255,255,255,.03);
		border: 1px solid rgba(255,255,255,.07);
		transition: border-color .2s;
	}
	.card:hover { border-color: rgba(255,255,255,.12); }
	.card-alert {
		border-color: rgba(201,168,76,.3);
		background: rgba(201,168,76,.04);
	}

	.card-head {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 20px 24px 16px;
	}
	.card-icon {
		color: var(--teal);
		margin-top: 2px;
		flex-shrink: 0;
	}
	.card-title {
		font-size: .85rem;
		font-weight: 500;
		color: var(--white);
		letter-spacing: .02em;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 3px;
	}
	.card-desc {
		font-size: .75rem;
		font-weight: 300;
		color: rgba(240,237,232,.4);
		line-height: 1.5;
	}
	.card-body {
		padding: 0 24px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.card-foot {
		padding: 0 24px 20px;
	}

	/* ─── INFO ROWS ─── */
	.info-row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		font-size: .8rem;
		padding: 6px 0;
		border-bottom: 1px solid rgba(255,255,255,.04);
	}
	.info-row:last-child { border-bottom: none; }
	.info-label {
		font-size: .62rem;
		letter-spacing: .12em;
		text-transform: uppercase;
		color: rgba(240,237,232,.3);
		min-width: 50px;
	}
	.info-val { color: rgba(240,237,232,.7); font-weight: 300; }

	/* ─── BUTTONS ─── */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 20px;
		font-family: 'DM Sans', sans-serif;
		font-size: .75rem;
		font-weight: 500;
		letter-spacing: .1em;
		text-transform: uppercase;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: all .2s;
	}
	.btn-outline {
		background: transparent;
		border: 1px solid rgba(255,255,255,.15);
		color: rgba(240,237,232,.7);
	}
	.btn-outline:hover { border-color: rgba(255,255,255,.35); color: var(--white); }
	.btn-gold {
		background: var(--gold);
		color: var(--black);
		font-weight: 600;
	}
	.btn-gold:hover { background: #d4b356; }
	.w-full { width: 100%; }

	.btn-ghost {
		display: flex;
		align-items: center;
		gap: 6px;
		background: none;
		border: none;
		cursor: pointer;
		font-size: .72rem;
		color: rgba(240,237,232,.35);
		letter-spacing: .06em;
		padding: 4px 0;
		transition: color .2s;
	}
	.btn-ghost:hover { color: rgba(240,237,232,.6); }

	/* ─── STEPPER ─── */
	.stepper {
		display: flex;
		align-items: flex-start;
		gap: 0;
	}
	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		text-decoration: none;
	}
	.step-dot {
		width: 28px; height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(255,255,255,.15);
		background: rgba(255,255,255,.03);
		color: rgba(240,237,232,.35);
		display: flex; align-items: center; justify-content: center;
		font-size: .7rem; font-weight: 600;
		transition: all .2s;
	}
	.step-label {
		font-size: .62rem;
		letter-spacing: .1em;
		text-transform: uppercase;
		color: rgba(240,237,232,.3);
		text-align: center;
		max-width: 70px;
	}
	.step-active .step-dot {
		border-color: var(--gold);
		background: rgba(201,168,76,.1);
		color: var(--gold);
		box-shadow: 0 0 0 3px rgba(201,168,76,.12);
	}
	.step-active .step-label { color: rgba(240,237,232,.6); }
	.step-done .step-dot {
		border-color: var(--teal);
		background: rgba(58,184,184,.12);
		color: var(--teal);
	}
	.step-done .step-label { color: rgba(240,237,232,.5); }
	.step-pending { pointer-events: none; }
	.step-line {
		flex: 1;
		height: 1px;
		background: rgba(255,255,255,.1);
		margin-top: 14px;
		min-width: 24px;
	}
	.step-line-done { background: rgba(58,184,184,.3); }

	/* ─── BADGES & ALERTS ─── */
	.badge-alert {
		font-size: .58rem;
		letter-spacing: .1em;
		text-transform: uppercase;
		padding: 2px 8px;
		background: rgba(201,168,76,.15);
		color: var(--gold);
		border: 1px solid rgba(201,168,76,.25);
	}
	.alert-box {
		font-size: .75rem;
		font-weight: 300;
		color: rgba(201,168,76,.7);
		background: rgba(201,168,76,.06);
		border: 1px solid rgba(201,168,76,.2);
		padding: 12px 16px;
		line-height: 1.6;
	}
	.install-steps {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 4px 0;
	}
	.install-steps li {
		font-size: .75rem;
		font-weight: 300;
		color: rgba(240,237,232,.4);
		line-height: 1.5;
		padding-left: 12px;
		border-left: 1px solid rgba(255,255,255,.08);
	}
	.install-steps li strong {
		color: rgba(240,237,232,.65);
		font-weight: 500;
	}

	/* ─── LOCKED MSG ─── */
	.locked-msg {
		font-size: .82rem;
		font-weight: 300;
		color: rgba(240,237,232,.35);
		text-align: center;
		line-height: 1.7;
		padding: 24px;
		border: 1px solid rgba(255,255,255,.06);
	}
	.locked-msg a {
		color: var(--white);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.locked-msg a:hover { color: var(--gold); }

	.profile-link {
		display: inline-block;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.75rem;
		color: rgba(240, 237, 232, 0.5);
		text-decoration: none;
		letter-spacing: 0.05em;
		transition: color 0.2s ease;
		padding: 0 0 8px 0;
		border-bottom: 1px solid transparent;
		cursor: pointer;
	}
	.profile-link:hover {
		color: var(--gold);
		border-bottom-color: var(--gold);
	}
	:global(.card-foot.space-y-2) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	:global(.card-foot.space-y-2 form) {
		display: flex;
		width: 100%;
	}
	:global(.card-foot.space-y-2 button) {
		width: 100%;
	}

	/* ─── RESPONSIVE ─── */
	@media (max-width: 480px) {
		.page { padding: 0 16px 60px; }
		.page-header { padding: 60px 0 40px; }
		.card-head { padding: 16px 18px 12px; }
		.card-body, .card-foot { padding-left: 18px; padding-right: 18px; }
	}
</style>