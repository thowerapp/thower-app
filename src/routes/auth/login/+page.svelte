<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import * as Form from '$shadcn/form';
	import * as Card from '$shadcn/card';
	import { Input } from '$shadcn/input';
	import { Button } from '$shadcn/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from '$lib/superforms-zod';
	import { loginSchema } from '$lib/schema/auth/loginSchema';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const formOptions = {
		validators: zodClient(loginSchema),
		id: 'loginForm'
	};

	const loginForm = $derived.by(() => superForm(data?.loginForm ?? {}, formOptions));

	const { form: loginData, enhance: loginEnhance, message: loginMessage } = $derived(loginForm);
	const showCreateAccountCta = $derived.by(() => {
		const text = ($loginMessage ?? '').toLowerCase();
		return (
			text.includes('creer un compte') ||
			text.includes("compte n'existe pas") ||
			text.includes('compte nexiste pas')
		);
	});

	$effect(() => {
		if ($loginMessage) {
			toast.error($loginMessage);
		}
	});

	onMount(() => {
		// ── CURSOR — détecte le support tactile/mobile ──
		// Détecte si c'est un appareil tactile/mobile (pas de souris)
		const isMobileOrTouchDevice = () => {
			return (
				window.matchMedia('(hover: none)').matches || // Aucun support hover (tactile)
				('ontouchstart' in window) || // Support tactile présent
				navigator.maxTouchPoints > 0 // Points tactiles disponibles
			);
		};

		// N'affiche le curseur personnalisé que sur bureau avec souris
		let cursorEl: HTMLDivElement | null = null;
		let onMouseMove: ((e: MouseEvent) => void) | null = null;
		if (!isMobileOrTouchDevice()) {
			cursorEl = document.createElement('div');
			cursorEl.id = 'cursor';
			cursorEl.style.cssText = `
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
			document.body.appendChild(cursorEl);

			onMouseMove = (e: MouseEvent) => {
				cursorEl!.style.left = e.clientX + 'px';
				cursorEl!.style.top = e.clientY + 'px';
			};
			document.addEventListener('mousemove', onMouseMove);

			document.querySelectorAll('button, a, input, label').forEach(el => {
				el.addEventListener('mouseenter', () => {
					cursorEl!.style.width = '22px';
					cursorEl!.style.height = '19px';
				});
				el.addEventListener('mouseleave', () => {
					cursorEl!.style.width = '14px';
					cursorEl!.style.height = '12px';
				});
			});
		}

		// ── THREE.JS CANVAS ──
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

		const CORRIDOR_LENGTH = 40,
			CORRIDOR_W = 5,
			CORRIDOR_H = 4;

		const wallMat = new THREE.MeshBasicMaterial({ color: 0x0d0a06, side: THREE.BackSide });
		const corridor = new THREE.Mesh(
			new THREE.BoxGeometry(CORRIDOR_W, CORRIDOR_H, CORRIDOR_LENGTH),
			wallMat
		);
		corridor.position.set(0, 0, -CORRIDOR_LENGTH / 2);
		scene.add(corridor);

		const gridMat = new THREE.LineBasicMaterial({
			color: 0x3a2e18,
			transparent: true,
			opacity: 0.85
		});
		function makeLine(p1: [number, number, number], p2: [number, number, number]) {
			const geo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(...p1),
				new THREE.Vector3(...p2)
			]);
			return new THREE.Line(geo, gridMat);
		}
		for (let x = -2; x <= 2; x += 0.5)
			scene.add(makeLine([x, -CORRIDOR_H / 2, 2], [x, -CORRIDOR_H / 2, -CORRIDOR_LENGTH - 2]));
		for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 2)
			scene.add(makeLine([-CORRIDOR_W / 2, -CORRIDOR_H / 2, z], [CORRIDOR_W / 2, -CORRIDOR_H / 2, z]));

		const trimMat = new THREE.LineBasicMaterial({ color: 0x5a4020, transparent: true, opacity: 0.7 });
		for (let z = 0; z >= -CORRIDOR_LENGTH; z -= 4) {
			scene.add(
				(() => {
					const g = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(-CORRIDOR_W / 2, -CORRIDOR_H / 2, z),
						new THREE.Vector3(-CORRIDOR_W / 2, CORRIDOR_H / 2, z)
					]);
					return new THREE.Line(g, trimMat);
				})()
			);
			scene.add(
				(() => {
					const g = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(CORRIDOR_W / 2, -CORRIDOR_H / 2, z),
						new THREE.Vector3(CORRIDOR_W / 2, CORRIDOR_H / 2, z)
					]);
					return new THREE.Line(g, trimMat);
				})()
			);
		}
		scene.add(makeLine([0, CORRIDOR_H / 2, 2], [0, CORRIDOR_H / 2, -CORRIDOR_LENGTH - 2]));

		const glowMat = new THREE.MeshBasicMaterial({
			color: 0xc9a84c,
			transparent: true,
			opacity: 0.55,
			side: THREE.DoubleSide,
			depthWrite: false
		});
		const glowPlane = new THREE.Mesh(
			new THREE.PlaneGeometry(CORRIDOR_W * 0.9, CORRIDOR_H * 0.9),
			glowMat
		);
		glowPlane.position.set(0, 0, -CORRIDOR_LENGTH + 0.5);
		scene.add(glowPlane);

		const glow2Mat = new THREE.MeshBasicMaterial({
			color: 0xfff8e0,
			transparent: true,
			opacity: 0.82,
			side: THREE.DoubleSide,
			depthWrite: false
		});
		const glowPlane2 = new THREE.Mesh(
			new THREE.PlaneGeometry(CORRIDOR_W * 0.4, CORRIDOR_H * 0.6),
			glow2Mat
		);
		glowPlane2.position.set(0, 0, -CORRIDOR_LENGTH + 0.3);
		scene.add(glowPlane2);

		const makeGlow = (z: number, opacity: number, w: number, h: number, color: number) => {
			const mat = new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity,
				side: THREE.DoubleSide,
				depthWrite: false
			});
			scene.add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat).translateZ(z));
			return mat;
		};
		const midGlows = [
			makeGlow(-CORRIDOR_LENGTH * 0.75, 0.28, CORRIDOR_W * 0.85, CORRIDOR_H * 0.85, 0xc9a84c),
			makeGlow(-CORRIDOR_LENGTH * 0.5, 0.14, CORRIDOR_W * 0.8, CORRIDOR_H * 0.8, 0xc9a84c),
			makeGlow(
				-CORRIDOR_LENGTH * 0.25,
				0.06,
				CORRIDOR_W * 0.75,
				CORRIDOR_H * 0.75,
				0xc9a84c
			)
		];

		const PARTICLE_COUNT = 180;
		const pPos = new Float32Array(PARTICLE_COUNT * 3);
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			pPos[i * 3] = (Math.random() - 0.5) * (CORRIDOR_W - 0.4);
			pPos[i * 3 + 1] = (Math.random() - 0.5) * (CORRIDOR_H - 0.4);
			pPos[i * 3 + 2] = -Math.random() * CORRIDOR_LENGTH;
		}
		const pGeo = new THREE.BufferGeometry();
		pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
		const particles = new THREE.Points(
			pGeo,
			new THREE.PointsMaterial({
				color: 0xc9a84c,
				size: 0.025,
				transparent: true,
				opacity: 0.55,
				sizeAttenuation: true
			})
		);
		scene.add(particles);

		let camCurrentZ = 0;
		const clock = new THREE.Clock();
		let animId: number;
		const animate = () => {
			animId = requestAnimationFrame(animate);
			const t = clock.getElapsedTime();
			camCurrentZ += (0 - camCurrentZ) * 0.055;
			camera.position.z = camCurrentZ;
			camera.position.x = Math.sin(t * 0.18) * 0.04;
			camera.position.y = Math.sin(t * 0.12) * 0.025;
			camera.lookAt(camera.position.x * 0.2, camera.position.y * 0.2, camCurrentZ - 10);

			const proximity = Math.max(0, 1 - Math.abs(camCurrentZ + 38) / 38);
			glowMat.opacity = 0.45 + proximity * 0.18 + Math.sin(t * 0.7) * 0.03;
			glow2Mat.opacity = 0.7 + proximity * 0.15 + Math.sin(t * 1.1) * 0.04;
			midGlows[0].opacity = 0.22 + proximity * 0.12;
			midGlows[1].opacity = 0.1 + proximity * 0.08;
			midGlows[2].opacity = 0.04 + proximity * 0.04;

			const pos = particles.geometry.attributes.position.array as Float32Array;
			for (let i = 0; i < PARTICLE_COUNT; i++) {
				pos[i * 3 + 1] += 0.0008;
				if (pos[i * 3 + 1] > CORRIDOR_H / 2) pos[i * 3 + 1] = -CORRIDOR_H / 2;
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
			if (onMouseMove) document.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('resize', onResize);
			renderer.dispose();
			canvas.remove();
			cursorEl?.remove();
		};
	});
</script>

<div class="login-container">
	<div class="login-card">
		<Card.Root class="card-root">
			<Card.Header class="card-header">
				<div class="card-header-content">
					<h1 class="card-title">Connexion</h1>
					<Card.Description class="card-description">
						Saisissez votre email pour vous connecter à votre compte
					</Card.Description>
				</div>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/login" use:loginEnhance class="login-form">
					{#if showCreateAccountCta}
						<div class="create-account-alert" role="alert">
							<p>Veuillez creer un compte pour vous authentifier.</p>
							<a href="/" class="create-account-btn">Retour a l'accueil</a>
						</div>
					{/if}

					<Form.Field name="email" form={loginForm}>
						<Form.Control>
							<Form.Label class="form-label">Email</Form.Label>
							<Input
								type="email"
								name="email"
								bind:value={$loginData.email}
								placeholder="m@exemple.com"
								required
								class="form-input"
							/>
						</Form.Control>
						<Form.FieldErrors class="form-error" />
					</Form.Field>

					<Form.Field name="password" form={loginForm}>
						<Form.Control>
							<div class="password-header">
								<Form.Label class="form-label">Mot de passe</Form.Label>
								<a href="/auth/forgot-password" class="forgot-link"> Oublié ? </a>
							</div>
							<Input
								type="password"
								name="password"
								bind:value={$loginData.password}
								placeholder="Entrez votre mot de passe"
								required
								class="form-input"
							/>
						</Form.Control>
						<Form.FieldErrors class="form-error" />
					</Form.Field>

					<Button type="submit" class="submit-btn"> Continuer </Button>

					<div class="divider">
						<div class="divider-line"></div>
						<span class="divider-text">ou</span>
					</div>

					<a href="/auth/login/google" class="google-link">
						<Button type="button" variant="outline" class="google-btn">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="google-icon">
								<path
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>
							Connexion avec Google
						</Button>
					</a>

					<p class="signup-prompt">
						Pas encore de compte ?
						<a href="/auth/signup" class="signup-link"> Créer un compte </a>
					</p>

					<p class="home-prompt">
						<a href="/" class="home-link">Retour a l'accueil</a>
					</p>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<style>
	:root {
		--black: #0a0a0a;
		--white: #f0ede8;
		--gold: #c9a84c;
		--teal: #3ab8b8;
	}

	:global(html, body) {
		background: var(--black);
		color: var(--white);
	}

	.login-container {
		position: relative;
		z-index: 10;
		width: 100%;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.login-card {
		width: 100%;
		max-width: 480px;
		animation: fadeIn 0.6s ease-out;
	}

	:global(.card-root) {
		background: rgba(10, 10, 10, 0.85);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(201, 168, 76, 0.15);
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	:global(.card-header) {
		border-bottom: 1px solid rgba(201, 168, 76, 0.1);
		padding: 32px 24px;
	}

	.card-header-content {
		text-align: center;
	}

	:global(.card-title) {
		font-family: 'Bebas Neue', sans-serif;
		font-size: 2.4rem;
		letter-spacing: 0.08em;
		color: var(--gold);
		margin: 0 0 12px 0;
		text-transform: uppercase;
	}

	:global(.card-description) {
		font-family: 'DM Sans', sans-serif;
		font-size: 0.9rem;
		font-weight: 300;
		color: rgba(240, 237, 232, 0.5);
		letter-spacing: 0.05em;
	}

	:global(.card-content) {
		padding: 28px 24px;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.create-account-alert {
		border: 1px solid rgba(201, 168, 76, 0.35);
		background: rgba(201, 168, 76, 0.08);
		border-radius: 8px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		color: var(--white);
		font-family: 'DM Sans', sans-serif;
		font-size: 0.92rem;
	}

	.create-account-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid rgba(201, 168, 76, 0.55);
		color: var(--gold);
		text-decoration: none;
		font-family: 'DM Sans', sans-serif;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.create-account-btn:hover {
		background: rgba(201, 168, 76, 0.12);
	}

	:global(.form-label) {
		font-family: 'DM Sans', sans-serif;
		font-size: 0.75rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(240, 237, 232, 0.6);
		font-weight: 500;
	}

	:global(.form-input) {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(201, 168, 76, 0.2);
		color: var(--white);
		font-family: 'DM Sans', sans-serif;
		padding: 11px 14px;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	:global(.form-input:focus) {
		border-color: var(--gold);
		background: rgba(201, 168, 76, 0.05);
		box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.08);
		outline: none;
	}

	:global(.form-input::placeholder) {
		color: rgba(240, 237, 232, 0.3);
	}

	:global(.form-error) {
		font-size: 0.75rem;
		color: #ff6b6b;
		margin-top: 4px;
	}

	.password-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.forgot-link {
		font-family: 'DM Sans', sans-serif;
		font-size: 0.75rem;
		color: var(--gold);
		text-decoration: none;
		letter-spacing: 0.05em;
		transition: opacity 0.2s;
		cursor: none;
	}

	.forgot-link:hover {
		opacity: 0.8;
	}

	:global(.submit-btn) {
		background: var(--gold);
		color: var(--black);
		font-family: 'Bebas Neue', sans-serif;
		font-size: 1rem;
		letter-spacing: 0.12em;
		padding: 11px 16px;
		border: none;
		border-radius: 4px;
		cursor: none;
		margin-top: 8px;
		transition: all 0.2s;
		text-transform: uppercase;
		font-weight: 600;
	}

	:global(.submit-btn:hover) {
		background: #e0bc62;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(201, 168, 76, 0.3);
	}

	.divider {
		position: relative;
		margin: 20px 0;
		display: flex;
		align-items: center;
	}

	.divider-line {
		flex: 1;
		height: 1px;
		background: rgba(201, 168, 76, 0.15);
	}

	.divider-text {
		padding: 0 12px;
		font-size: 0.75rem;
		color: rgba(240, 237, 232, 0.4);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.google-link {
		display: block;
	}

	:global(.google-btn) {
		width: 100%;
		border: 1px solid rgba(201, 168, 76, 0.2);
		color: rgba(240, 237, 232, 0.7);
		font-family: 'DM Sans', sans-serif;
		transition: all 0.2s;
	}

	:global(.google-btn:hover) {
		border-color: var(--gold);
		color: var(--gold);
		background: rgba(201, 168, 76, 0.05);
	}

	.google-icon {
		width: 18px;
		height: 18px;
		margin-right: 8px;
	}

	.signup-prompt {
		text-align: center;
		font-size: 0.8rem;
		color: rgba(240, 237, 232, 0.5);
		margin: 16px 0 0 0;
		font-family: 'DM Sans', sans-serif;
	}

	.signup-link {
		color: var(--gold);
		text-decoration: none;
		font-weight: 600;
		letter-spacing: 0.05em;
		transition: opacity 0.2s;
		cursor: none;
	}

	.signup-link:hover {
		opacity: 0.8;
	}

	.home-prompt {
		text-align: center;
		margin: 2px 0 0 0;
	}

	.home-link {
		color: rgba(240, 237, 232, 0.8);
		text-decoration: none;
		font-family: 'DM Sans', sans-serif;
		font-size: 0.82rem;
		letter-spacing: 0.04em;
		border-bottom: 1px solid rgba(240, 237, 232, 0.35);
		padding-bottom: 1px;
		transition: color 0.2s, border-color 0.2s;
		cursor: none;
	}

	.home-link:hover {
		color: var(--gold);
		border-color: rgba(201, 168, 76, 0.7);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 700px) {
		.login-container {
			padding: 12px;
		}

		:global(.card-title) {
			font-size: 1.8rem;
		}

		:global(.card-header) {
			padding: 20px 16px;
		}

		:global(.card-content) {
			padding: 20px 16px;
		}
	}
</style>
