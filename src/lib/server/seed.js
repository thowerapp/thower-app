/**
 * SEED COMPLET — Méthode Thower
 *
 * Prérequis : npx prisma generate (pour les nouveaux modèles)
 *
 * Crée :
 *   – Catalogue partagé (offres, tâches, vidéos découverte, séances sport, recettes, badges, etc.)
 *   – Programme 91 jours structuré (jours 1 à 7 complets)
 *   – 3 utilisateurs de démo :
 *       marie@thower.test  → nutrition seulement (J20)
 *       thomas@thower.test → sport seulement (J35)
 *       lucas@thower.test  → nutrition + sport (J10)
 *   Mot de passe commun : thower2026
 *
 * Idempotent sur le catalogue ; les utilisateurs de démo sont supprimés/recréés à chaque run.
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

/** Données factices complètes pour Lucas (91 jours sport, nutrition, courses) */
const LUCAS_DEMO_DATA = JSON.parse(
	readFileSync(path.join(__dirname, 'seed', 'lucasDemoData.json'), 'utf-8')
);

// ─── CONFIG PRIX ────────────────────────────────────────────────────────────
const defaultMonthly = Number(process.env.STRIPE_PLAN_MONTHLY_CENTS ?? 2900);
const defaultAnnual = Number(process.env.STRIPE_PLAN_ANNUAL_CENTS ?? 9900);
const nutritionMonthly = Number(process.env.STRIPE_PLAN_MONTHLY_NUTRITION_CENTS ?? defaultMonthly);
const nutritionAnnual = Number(process.env.STRIPE_PLAN_ANNUAL_NUTRITION_CENTS ?? defaultAnnual);
const sportMonthly = Number(process.env.STRIPE_PLAN_MONTHLY_SPORT_CENTS ?? defaultMonthly);
const sportAnnual = Number(process.env.STRIPE_PLAN_ANNUAL_SPORT_CENTS ?? defaultAnnual);

// ─── HELPERS ────────────────────────────────────────────────────────────────
/** @param {number} n */
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
/** @param {number} n */
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const todayUTC = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };

/**
 * Génère des snapshots hebdomadaires avec bruit déterministe (fluctuations réalistes).
 * Produit totalWeeks + 1 entrées : de daysBack = totalWeeks*7 à daysBack = 0.
 *
 * @param {number} totalWeeks
 * @param {{ weightKg: number, waistCm: number, chestCm: number, armCm: number }} start
 * @param {{ weightKg: number, waistCm: number, chestCm: number, armCm: number }} end
 * @param {number} [noiseSeed=1.7]  - fréquence du bruit sinusoïdal (unique par profil)
 */
function weeklySnapshots(totalWeeks, start, end, noiseSeed = 1.7) {
	const round1 = (v) => Math.round(v * 10) / 10;
	/** @param {number} a @param {number} b @param {number} t */
	const lerp = (a, b, t) => a + (b - a) * t;
	/** bruit ±amplitude, déterministe, fréquence propre à chaque profil */
	const noise = (w, amp) => Math.sin(w * noiseSeed + noiseSeed) * amp;

	const snaps = [];
	for (let w = totalWeeks; w >= 0; w--) {
		const t = totalWeeks > 0 ? (totalWeeks - w) / totalWeeks : 1;
		snaps.push({
			daysBack: w * 7,
			weightKg: round1(lerp(start.weightKg, end.weightKg, t) + noise(w, 0.25)),
			waistCm:  round1(lerp(start.waistCm,  end.waistCm,  t) + noise(w, 0.20)),
			chestCm:  round1(lerp(start.chestCm,  end.chestCm,  t) + noise(w, 0.15)),
			armCm:    round1(lerp(start.armCm,     end.armCm,    t) + noise(w, 0.10))
		});
	}
	return snaps;
}

// Hash argon2id de "thower2026" — même algorithme que resetDb.js
const PASSWORD_HASH =
	'$argon2id$v=19$m=19456,t=2,p=1$2h/u9dvpXqr5PiPa19tlBA$ZUYyS8+NjOxTodAaDO1ez5oVToWRfKCQWRabAe8sIgk';

const TEST_EMAILS = ['marie@thower.test', 'thomas@thower.test', 'lucas@thower.test'];

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
	const db = /** @type {any} */ (prisma);
	console.log('═══ SEED COMPLET THOWER ═══\n');

	// ── 1. OFFRES ──────────────────────────────────────────────────────────────
	console.log('1/10 — Offres…');
	await db.offer.upsert({
		where: { slug: 'nutrition' },
		create: { slug: 'nutrition', name: 'Programme nutrition', amountCentsMonthly: nutritionMonthly, amountCentsAnnual: nutritionAnnual, active: true, order: 0 },
		update: { name: 'Programme nutrition', amountCentsMonthly: nutritionMonthly, amountCentsAnnual: nutritionAnnual }
	});
	await db.offer.upsert({
		where: { slug: 'sport' },
		create: { slug: 'sport', name: 'Programme sport', amountCentsMonthly: sportMonthly, amountCentsAnnual: sportAnnual, active: true, order: 1 },
		update: { name: 'Programme sport', amountCentsMonthly: sportMonthly, amountCentsAnnual: sportAnnual }
	});

	// ── 2. TÂCHES QUOTIDIENNES ────────────────────────────────────────────────
	console.log('2/10 — DailyTasks…');
	const taskDefs = [
		{ label: "Boire 30 à 50 cl d'eau au lever", points: 20, order: 0 },
		{ label: 'Pas de téléphone les 30 premières minutes', points: 20, order: 1 },
		{ label: 'Moins de 4 cafés dans la journée', points: 10, order: 2 },
		{ label: 'Pas de sucre raffiné', points: 30, order: 3 },
		{ label: 'Méditation 10 minutes', points: 20, order: 4 }
	];
	const tasks = [];
	for (const def of taskDefs) {
		let t = await db.dailyTask.findFirst({ where: { label: def.label } });
		if (!t) t = await db.dailyTask.create({ data: { ...def, active: true } });
		tasks.push(t);
	}

	// ── 3. CONTENU DÉCOUVERTE ─────────────────────────────────────────────────
	console.log('3/10 — DiscoveryContent…');
	const discoverDefs = [
		{ category: 'MEDITATION', title: 'Cohérence cardiaque 5 min', youtubeId: 'yt_med_001', order: 0, unlockThreshold: 0, breathworkIntent: 'cohérence cardiaque', tags: ['calme', 'respiration'] },
		{ category: 'MINDSET', title: 'Construire la discipline au quotidien', youtubeId: 'yt_mnd_001', order: 0, unlockThreshold: 0, tags: ['discipline', 'motivation'] },
		{ category: 'BREATHWORK', title: 'Respiration anti-stress 4-6', youtubeId: 'yt_bw_001', order: 0, unlockThreshold: 0, breathworkIntent: 'anti-stress', tags: ['stress', 'respiration'] },
		{ category: 'MOTIVATION', title: 'Thower Boost — Semaine 1', youtubeId: 'yt_mot_001', order: 0, unlockThreshold: 0, tags: ['boost', 'semaine1'] },
		{ category: 'EXPLICATION', title: 'Pourquoi le jeûne intermittent ?', youtubeId: 'yt_exp_001', order: 0, unlockThreshold: 100, tags: ['jeune', 'nutrition'] }
	];
	const discoveries = [];
	for (const def of discoverDefs) {
		let dc = await db.discoveryContent.findFirst({ where: { youtubeId: def.youtubeId } });
		if (!dc) dc = await db.discoveryContent.create({ data: { ...def, active: true } });
		discoveries.push(dc);
	}

	// ── 4. SÉANCES SPORT + VIDÉOS ─────────────────────────────────────────────
	console.log('4/10 — WorkoutSessions + Videos…');
	const sessionDefs = [
		{ type: 'MAIN_A', name: 'Séance A — Renforcement haut du corps', description: 'Circuit complet épaules, dos, bras', weekNumber: 1, order: 0 },
		{ type: 'MAIN_B', name: 'Séance B — Cardio & mobilité', description: 'HIIT + étirements dynamiques', weekNumber: 1, order: 1 },
		{ type: 'MAIN_C', name: 'Séance C — Abdos & gainage', description: 'Core training intensif 30 min', weekNumber: 1, order: 2 }
	];
	const sessions = [];
	for (const def of sessionDefs) {
		let session = await db.workoutSession.findFirst({ where: { name: def.name } });
		if (!session) {
			session = await db.workoutSession.create({
				data: {
					...def,
					active: true,
					videos: {
						create: [
							{ youtubeId: `yt_pre_${def.type}`, title: `Pré-séance — ${def.name}`, position: 'PRE', isOptional: true, order: 0 },
							{ youtubeId: `yt_v1_${def.type}`, title: `Vidéo 1 — ${def.name}`, position: 'VID1', isOptional: false, order: 1 },
							{ youtubeId: `yt_v2_${def.type}`, title: `Vidéo 2 — ${def.name}`, position: 'VID2', isOptional: false, order: 2 }
						]
					}
				},
				include: { videos: true }
			});
		} else {
			session = await db.workoutSession.findUnique({ where: { id: session.id }, include: { videos: true } });
		}
		sessions.push(session);
	}

	// ── 5. RECETTES ───────────────────────────────────────────────────────────
	console.log('5/10 — Recettes…');
	const recipeDefs = [
		{
			name: 'Poulet riz coco curry',
			category: 'MEAL',
			totalTimeMin: 40,
			referenceYieldG: 555,
			instructions: "Faire revenir le poulet en dés. Ajouter le lait de coco et le curry. Servir avec le riz basmati.",
			ingredients: [
				{ name: 'Blanc de poulet', quantityG: 300, unit: 'g', category: 'Viandes', allergens: [] },
				{ name: 'Riz basmati cuit', quantityG: 150, unit: 'g', category: 'Féculents', allergens: [] },
				{ name: 'Lait de coco', quantityG: 100, unit: 'ml', category: 'Conserves', allergens: [] },
				{ name: 'Curry en poudre', quantityG: 5, unit: 'g', category: 'Épices', allergens: [] }
			]
		},
		{
			name: 'Salade noix gorgonzola poulet',
			category: 'MEAL',
			totalTimeMin: 10,
			referenceYieldG: 350,
			instructions: "Mélanger tous les ingrédients. Assaisonner huile d'olive + vinaigre balsamique.",
			ingredients: [
				{ name: 'Poulet cuit', quantityG: 200, unit: 'g', category: 'Viandes', allergens: [] },
				{ name: 'Mesclun', quantityG: 80, unit: 'g', category: 'Légumes', allergens: [] },
				{ name: 'Noix', quantityG: 30, unit: 'g', category: 'Fruits secs', allergens: ['noix'] },
				{ name: 'Gorgonzola', quantityG: 40, unit: 'g', category: 'Fromages', allergens: ['lait'] }
			]
		},
		{
			name: 'Saumon patate douce épinards',
			category: 'MEAL',
			totalTimeMin: 30,
			referenceYieldG: 495,
			instructions: "Cuire le saumon à la poêle, patate douce à la vapeur, épinards sautés à l'ail.",
			ingredients: [
				{ name: 'Saumon', quantityG: 180, unit: 'g', category: 'Poissons', allergens: ['poisson'] },
				{ name: 'Patate douce', quantityG: 200, unit: 'g', category: 'Légumes', allergens: [] },
				{ name: 'Épinards frais', quantityG: 100, unit: 'g', category: 'Légumes', allergens: [] },
				{ name: "Huile d'olive", quantityG: 15, unit: 'ml', category: 'Condiments', allergens: [] }
			]
		},
		{
			name: 'Bowl protéiné œuf quinoa légumes',
			category: 'MEAL',
			totalTimeMin: 25,
			referenceYieldG: 400,
			instructions: "Cuire quinoa, faire revenir les légumes, pocher les œufs. Assembler en bowl.",
			ingredients: [
				{ name: 'Quinoa cuit', quantityG: 120, unit: 'g', category: 'Féculents', allergens: [] },
				{ name: 'Œufs', quantityG: 100, unit: 'g', category: 'Produits frais', allergens: ['œufs'] },
				{ name: 'Courgette', quantityG: 100, unit: 'g', category: 'Légumes', allergens: [] },
				{ name: 'Poivron rouge', quantityG: 80, unit: 'g', category: 'Légumes', allergens: [] }
			]
		}
	];
	const recipes = [];
	for (const def of recipeDefs) {
		let recipe = await db.recipe.findFirst({ where: { name: def.name, userId: null } });
		if (!recipe) {
			const { ingredients, ...recipeData } = def;
			recipe = await db.recipe.create({
				data: { ...recipeData, active: true, isCustom: false, ingredients: { create: ingredients } },
				include: { ingredients: true }
			});
		}
		recipes.push(recipe);
	}

	// ── 6. BADGES ─────────────────────────────────────────────────────────────
	console.log('6/10 — Badges…');
	const badgeDefs = [
		{ slug: '7-jours-seance', name: '7 jours sans rater une séance', description: 'Valider une séance 7 jours consécutifs', condition: { type: 'STREAK_WORKOUT', threshold: 7 } },
		{ slug: '21-respirations', name: '21 respirations d\'affilée', description: 'Effectuer 21 séances de breathwork consécutives', condition: { type: 'STREAK_BREATHWORK', threshold: 21 } },
		{ slug: '30-jours', name: 'Premier mois accompli', description: 'Compléter 30 jours du programme Thower', condition: { type: 'DAYS_COMPLETED', threshold: 30 } }
	];
	const badges = [];
	for (const def of badgeDefs) {
		const b = await db.badge.upsert({ where: { slug: def.slug }, create: def, update: { name: def.name } });
		badges.push(b);
	}

	// ── 7. RÉCOMPENSES PARTENAIRES ────────────────────────────────────────────
	console.log('7/10 — PointRewards…');
	await db.pointReward.upsert({
		where: { slug: 'nutri-pure-10' },
		create: { slug: 'nutri-pure-10', name: '10€ offerts chez Nutri Pure', description: "Pour 50€ d'achat", costPoints: 500, rewardDetail: 'Code promo : THOWER10', partnerName: 'Nutri Pure', active: true, order: 0 },
		update: { name: '10€ offerts chez Nutri Pure' }
	});
	await db.pointReward.upsert({
		where: { slug: 'decathlon-15' },
		create: { slug: 'decathlon-15', name: '15€ offerts chez Decathlon', description: "Pour 75€ d'achat", costPoints: 750, rewardDetail: 'Code promo : THOWER15', partnerName: 'Decathlon', active: true, order: 1 },
		update: { name: '15€ offerts chez Decathlon' }
	});

	// ── 8. PROGRAMME 91 JOURS (jours 1 à 7) ──────────────────────────────────
	console.log('8/10 — Programme 91 jours…');
	let program = await db.program.findFirst({ where: { active: true } });
	if (!program) {
		program = await db.program.create({ data: { name: 'Méthode Thower', totalDays: 91, active: true } });
	}

	// Configuration des items par jour
	const dayConfigs = [
		// Jour 1
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'DAILY_TASK', points: 20, order: 1, dailyTaskIdx: 1 },
			{ type: 'VIDEO_OF_DAY', points: 10, order: 2, label: 'Vidéo de bienvenue', discoveryIdx: 3 },
			{ type: 'BREATHWORK', points: 15, order: 3, discoveryIdx: 2 }
		],
		// Jour 2
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'DAILY_TASK', points: 10, order: 1, dailyTaskIdx: 2 },
			{ type: 'SPORT_SESSION', points: 50, order: 2, sessionIdx: 0 }
		],
		// Jour 3
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'DAILY_TASK', points: 20, order: 1, dailyTaskIdx: 1 },
			{ type: 'MINDSET_VIDEO', points: 10, order: 2, discoveryIdx: 1 },
			{ type: 'STEPS', points: 30, order: 3, label: 'Objectif 5 000 pas', stepsThreshold: 5000 }
		],
		// Jour 4
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'SPORT_SESSION', points: 50, order: 1, sessionIdx: 1 },
			{ type: 'BREATHWORK', points: 15, order: 2, discoveryIdx: 0 }
		],
		// Jour 5
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'DAILY_TASK', points: 30, order: 1, dailyTaskIdx: 3 },
			{ type: 'VIDEO_OF_DAY', points: 10, order: 2, discoveryIdx: 4 }
		],
		// Jour 6
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'DAILY_TASK', points: 20, order: 1, dailyTaskIdx: 4 },
			{ type: 'SPORT_SESSION', points: 50, order: 2, sessionIdx: 2 }
		],
		// Jour 7 — fin de semaine 1
		[
			{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
			{ type: 'DAILY_TASK', points: 20, order: 1, dailyTaskIdx: 1 },
			{ type: 'MINDSET_VIDEO', points: 10, order: 2, discoveryIdx: 1 },
			{ type: 'CUSTOM', points: 50, order: 3, label: 'Bilan de semaine : noter ses 3 victoires' }
		]
	];

	const programDays = [];
	for (let i = 0; i < dayConfigs.length; i++) {
		const dayIndex = i + 1;
		let day = await db.programDay.findUnique({
			where: { programId_dayIndex: { programId: program.id, dayIndex } }
		});
		if (!day) {
			day = await db.programDay.create({ data: { programId: program.id, dayIndex } });
		}
		const existingItems = await db.programDayItem.findMany({ where: { programDayId: day.id } });
		if (existingItems.length === 0) {
			for (const _cfg of dayConfigs[i]) {
				const cfg = /** @type {any} */ (_cfg);
				await db.programDayItem.create({
					data: {
						programDayId: day.id,
						type: cfg.type,
						order: cfg.order,
						points: cfg.points,
						label: cfg.label ?? null,
						stepsThreshold: cfg.stepsThreshold ?? null,
						dailyTaskId: cfg.dailyTaskIdx != null ? tasks[cfg.dailyTaskIdx].id : null,
						discoveryContentId: cfg.discoveryIdx != null ? discoveries[cfg.discoveryIdx].id : null,
						workoutSessionId: cfg.sessionIdx != null ? sessions[cfg.sessionIdx].id : null
					}
				});
			}
		}
		day = await db.programDay.findUnique({
			where: { id: day.id },
			include: { items: { orderBy: { order: 'asc' } } }
		});
		programDays.push(day);
	}

	// Pop-ups motivants
	const existingPopup1 = await db.dayPopup.findFirst({ where: { programId: program.id, dayIndex: 1 } });
	if (!existingPopup1) {
		await db.dayPopup.create({
			data: { programId: program.id, dayIndex: 1, type: 'WELCOME', title: 'Bienvenue dans la Méthode Thower !', body: "C'est le premier jour d'une transformation de 91 jours. Tu es sur la bonne voie 💪", order: 0 }
		});
		await db.dayPopup.create({
			data: { programId: program.id, dayIndex: 30, type: 'CELEBRATION_MONTH', title: 'Un mois déjà !', body: "Tu as tenu 30 jours. C'est ÉNORME. Je suis fier de toi !", videoUrl: 'https://youtube.com/watch?v=yt_cel_001', order: 0 }
		});
	}

	// ── 9. DÉFI PONCTUEL ──────────────────────────────────────────────────────
	console.log('9/10 — AdminChallenge…');
	let challenge = await db.adminChallenge.findFirst({ where: { name: 'Défi Hydratation 7 jours' } });
	if (!challenge) {
		challenge = await db.adminChallenge.create({
			data: { name: 'Défi Hydratation 7 jours', description: "Boire 2L d'eau par jour pendant 7 jours consécutifs", durationDays: 7, bonusPoints: 200, startAt: daysAgo(3), endAt: daysFromNow(4), active: true }
		});
	} else {
		challenge = await db.adminChallenge.update({
			where: { id: challenge.id },
			data: { startAt: daysAgo(3), endAt: daysFromNow(4) }
		});
	}

	// ── 10. UTILISATEURS DE DÉMO ──────────────────────────────────────────────
	console.log('10/10 — Utilisateurs de démo…');
	const dailyTaskCompletion = db.dailyTaskCompletion;
	for (const email of TEST_EMAILS) {
		const existing = await db.user.findUnique({ where: { email } });
		if (existing) {
			// Nettoyer les relations sans cascade explicite avant suppression
			await db.emailVerificationRequest.deleteMany({ where: { userId: existing.id } });
			await db.passwordResetSession.deleteMany({ where: { userId: existing.id } });
			await db.user.delete({ where: { id: existing.id } });
		}
	}

	const today = todayUTC();

	// ══════════════════════════════════════════════════════════════════════════
	// USER 1 — Marie : nutrition seulement (J20 du programme)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('  → Marie (nutrition, J20)…');
	const marie = await db.user.create({
		data: /** @type {any} */ ({
			email: 'marie@thower.test', username: 'marie.thower', name: 'Marie Dupont',
			passwordHash: PASSWORD_HASH, emailVerified: true, role: 'CLIENT',
			subscriptionEndsAt: daysFromNow(345),
			programStartDate: daysAgo(20)
		})
	});

	await db.transaction.create({
		data: /** @type {any} */ ({
			stripePaymentId: 'pi_demo_marie_nutrition', userId: marie.id,
			amount: nutritionAnnual / 100, currency: 'eur', status: 'paid',
			customer_details_email: marie.email, customer_details_name: marie.name,
			offerSlugs: ['nutrition']
		})
	});

	await db.userProfile.create({
		data: {
			userId: marie.id,
			activityLevel: 'SEDENTARY',
			objectives: ['fat_loss', 'better_sleep', 'better_body'],
			painsPathologies: 'Légère lombalgie chronique',
			contextParticular: 'Travail de bureau, sédentaire 8h/j',
			breadManagement: 'Pain complet uniquement, 1 tranche/j max',
			allergens: ['gluten', 'noix'],
			coffeePerDay: 2, alcoholHabit: false, tobaccoHabit: false,
			breakfastEnabled: false, intermittentFastingMorning: true,
			sportActivity: 'Marche 20 min le matin',
			familyCoefficients: [{ label: 'Conjoint', coefficient: 0.8 }],
			shoppingListSortOrder: 'category'
		}
	});

	// Historique mesures Marie — perte de poids, 1 mesure/semaine sur 13 semaines (91 j)
	// Objectif : -6 kg, -8 cm taille, -4 cm torse — rythme OMS recommandé (~0.46 kg/sem)
	for (const snap of weeklySnapshots(
		13,
		{ weightKg: 78.0, waistCm: 92.0, chestCm: 100.0, armCm: 32.0 },
		{ weightKg: 72.0, waistCm: 84.0, chestCm:  96.0, armCm: 30.0 },
		1.7 // noiseSeed propre à Marie
	)) {
		await db.bodyMeasurement.create({
			data: { userId: marie.id, age: 34, heightCm: 165,
				weightKg: snap.weightKg, waistCm: snap.waistCm, chestCm: snap.chestCm, armCm: snap.armCm,
				createdAt: daysAgo(snap.daysBack) }
		});
	}

	// Planning nutrition J1–J3 (2 repas/j — jeûne intermittent actif)
	for (let i = 1; i <= 3; i++) {
		const nd = await db.nutritionDay.create({
			data: { userId: marie.id, dayIndex: i, intermittentFasting: true }
		});
		await db.meal.create({ data: { nutritionDayId: nd.id, position: 'LUNCH', recipeId: recipes[0].id, quantityG: 450, calcProteinG: 52, calcCarbsG: 38, calcFatG: 12, calcCalories: 476 } });
		await db.meal.create({ data: { nutritionDayId: nd.id, position: 'DINNER', recipeId: recipes[2].id, quantityG: 380, calcProteinG: 42, calcCarbsG: 32, calcFatG: 10, calcCalories: 390 } });
	}

	// Liste de courses (J1–J7)
	const marieList = await db.shoppingList.create({ data: { userId: marie.id, startDayIndex: 1, endDayIndex: 7 } });
	for (const item of [
		{ ingredientName: 'Blanc de poulet', category: 'Viandes', totalQuantityG: 900, unit: 'g', isChecked: true },
		{ ingredientName: 'Riz basmati', category: 'Féculents', totalQuantityG: 600, unit: 'g', isChecked: false },
		{ ingredientName: 'Lait de coco', category: 'Conserves', totalQuantityG: 400, unit: 'ml', isChecked: true },
		{ ingredientName: 'Saumon', category: 'Poissons', totalQuantityG: 720, unit: 'g', isChecked: false },
		{ ingredientName: 'Patate douce', category: 'Légumes', totalQuantityG: 800, unit: 'g', isChecked: false },
		{ ingredientName: 'Épinards frais', category: 'Légumes', totalQuantityG: 400, unit: 'g', isChecked: true }
	]) {
		await db.shoppingItem.create({ data: { listId: marieList.id, ...item } });
	}

	// Points (total : 120 pts)
	for (const ev of [
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: "Eau au lever" } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: 'Pas de téléphone 30 min' } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: "Eau au lever" } },
		{ type: 'DAILY_TASK', amount: 30, metadata: { label: 'Pas de sucre' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_mot_001' } },
		{ type: 'PHOTO_UPLOAD', amount: 50, metadata: { month: 1 } }
	]) {
		await db.pointEvent.create({ data: { userId: marie.id, ...ev } });
	}

	// Badge en progression (30 jours : 67 % atteint à J20)
	await db.userBadge.create({ data: { userId: marie.id, badgeId: badges[2].id, progress: 20 / 30 } });

	// Tâches cochées aujourd'hui
	await dailyTaskCompletion.create({ data: { userId: marie.id, taskId: tasks[0].id, date: today } });
	await dailyTaskCompletion.create({ data: { userId: marie.id, taskId: tasks[3].id, date: today } });

	// Vidéo Découverte vue
	await db.userDiscoveryWatch.create({ data: { userId: marie.id, contentId: discoveries[3].id } });

	// Photo de progression mois 1
	await db.progressPhoto.create({
		data: { userId: marie.id, angle: 'FRONT', url: 'https://placeholder.thower.test/marie-front-m1.jpg', month: 1 }
	});

	// Défi rejoint
	await db.userChallenge.create({ data: { userId: marie.id, challengeId: challenge.id } });

	// Items programme J1 (2 premiers cochés)
	for (const item of programDays[0].items.slice(0, 2)) {
		await db.userProgramDayItemCompletion.create({ data: { userId: marie.id, programDayItemId: item.id } });
	}

	// ══════════════════════════════════════════════════════════════════════════
	// USER 2 — Thomas : sport seulement (J35 du programme)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('  → Thomas (sport, J35)…');
	const thomas = await db.user.create({
		data: /** @type {any} */ ({
			email: 'thomas@thower.test', username: 'thomas.thower', name: 'Thomas Martin',
			passwordHash: PASSWORD_HASH, emailVerified: true, role: 'CLIENT',
			subscriptionEndsAt: daysFromNow(330),
			programStartDate: daysAgo(35)
		})
	});

	await db.transaction.create({
		data: /** @type {any} */ ({
			stripePaymentId: 'pi_demo_thomas_sport', userId: thomas.id,
			amount: sportAnnual / 100, currency: 'eur', status: 'paid',
			customer_details_email: thomas.email, customer_details_name: thomas.name,
			offerSlugs: ['sport']
		})
	});

	await db.userProfile.create({
		data: {
			userId: thomas.id,
			activityLevel: 'ATHLETE',
			objectives: ['muscle_gain', 'more_energy', 'more_libido'],
			painsPathologies: null,
			contextParticular: 'Foot en salle tous les mardis soirs',
			breadManagement: 'Pas de pain',
			allergens: [],
			coffeePerDay: 3, alcoholHabit: false, tobaccoHabit: false,
			breakfastEnabled: true, intermittentFastingMorning: false,
			sportActivity: 'Foot en salle le mardi, course à pied 2×/semaine',
			familyCoefficients: null,
			shoppingListSortOrder: 'alphabetical'
		}
	});

	// Historique mesures Thomas — prise de masse, 1 mesure/semaine sur 13 semaines (91 j)
	// Objectif : +5.5 kg, +5 cm torse, +4 cm bras — prise de masse propre (~0.42 kg/sem)
	for (const snap of weeklySnapshots(
		13,
		{ weightKg: 79.5, waistCm: 85.0, chestCm: 100.0, armCm: 34.0 },
		{ weightKg: 85.0, waistCm: 88.0, chestCm: 105.0, armCm: 38.0 },
		2.1 // noiseSeed propre à Thomas
	)) {
		await db.bodyMeasurement.create({
			data: { userId: thomas.id, age: 28, heightCm: 182,
				weightKg: snap.weightKg, waistCm: snap.waistCm, chestCm: snap.chestCm, armCm: snap.armCm,
				createdAt: daysAgo(snap.daysBack) }
		});
	}

	// Séances sport (A et B complétées, C en cours)
	const thomasSessions = [
		{ session: sessions[0], dayIndex: 3, completedAt: daysAgo(32) },
		{ session: sessions[1], dayIndex: 6, completedAt: daysAgo(29) },
		{ session: sessions[2], dayIndex: 9, completedAt: null }
	];
	for (const sa of thomasSessions) {
		await db.userWorkoutDay.create({
			data: {
				userId: thomas.id, sessionId: sa.session.id, dayIndex: sa.dayIndex,
				scheduledDate: daysAgo(35 - sa.dayIndex),
				completedAt: sa.completedAt, isLocked: sa.completedAt !== null
			}
		});
	}

	// Vidéos vues pour séances A et B (toutes les vidéos)
	for (const sa of thomasSessions.slice(0, 2)) {
		for (const video of sa.session.videos) {
			await db.userVideoWatch.create({ data: { userId: thomas.id, videoId: video.id } });
		}
	}

	// Points (total : 200 pts)
	for (const ev of [
		{ type: 'WORKOUT_COMPLETE', amount: 50, metadata: { sessionName: 'Séance A' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_v1_MAIN_A' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_v2_MAIN_A' } },
		{ type: 'WORKOUT_COMPLETE', amount: 50, metadata: { sessionName: 'Séance B' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_v1_MAIN_B' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_v2_MAIN_B' } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: "Eau au lever" } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: 'Pas de téléphone 30 min' } },
		{ type: 'BADGE_UNLOCK', amount: 0, metadata: { badgeSlug: '7-jours-seance' } }
	]) {
		await db.pointEvent.create({ data: { userId: thomas.id, ...ev } });
	}

	// Badges (1 débloqué, 1 en cours)
	await db.userBadge.create({ data: { userId: thomas.id, badgeId: badges[0].id, progress: 1.0, unlockedAt: daysAgo(5) } });
	await db.userBadge.create({ data: { userId: thomas.id, badgeId: badges[2].id, progress: 1.0, unlockedAt: daysAgo(5) } });

	// Tâches cochées aujourd'hui
	await dailyTaskCompletion.create({ data: { userId: thomas.id, taskId: tasks[0].id, date: today } });
	await dailyTaskCompletion.create({ data: { userId: thomas.id, taskId: tasks[1].id, date: today } });
	await dailyTaskCompletion.create({ data: { userId: thomas.id, taskId: tasks[4].id, date: today } });

	// Thomas ne suit pas "Pas de sucre" (opt-out)
	await db.userDailyTaskOptOut.create({ data: { userId: thomas.id, taskId: tasks[3].id } });

	// Vidéos Découverte vues
	await db.userDiscoveryWatch.create({ data: { userId: thomas.id, contentId: discoveries[1].id } });
	await db.userDiscoveryWatch.create({ data: { userId: thomas.id, contentId: discoveries[3].id } });

	// Photos de progression mois 1 (2 angles)
	await db.progressPhoto.create({ data: { userId: thomas.id, angle: 'FRONT', url: 'https://placeholder.thower.test/thomas-front-m1.jpg', month: 1 } });
	await db.progressPhoto.create({ data: { userId: thomas.id, angle: 'SIDE', url: 'https://placeholder.thower.test/thomas-side-m1.jpg', month: 1 } });

	// Défi complété
	await db.userChallenge.create({ data: { userId: thomas.id, challengeId: challenge.id, completedAt: daysAgo(1) } });

	// Items programme J2 (tous), J3 (premier seulement)
	for (const item of programDays[1].items) {
		await db.userProgramDayItemCompletion.create({ data: { userId: thomas.id, programDayItemId: item.id } });
	}
	await db.userProgramDayItemCompletion.create({ data: { userId: thomas.id, programDayItemId: programDays[2].items[0].id } });

	// ══════════════════════════════════════════════════════════════════════════
	// USER 3 — Lucas : nutrition + sport (J10 du programme)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('  → Lucas (nutrition + sport, J10)…');
	const lucas = await db.user.create({
		data: /** @type {any} */ ({
			email: 'lucas@thower.test', username: 'lucas.thower', name: 'Lucas Bernard',
			passwordHash: PASSWORD_HASH, emailVerified: true, role: 'CLIENT',
			subscriptionEndsAt: daysFromNow(355),
			programStartDate: daysAgo(10)
		})
	});

	await db.transaction.create({
		data: /** @type {any} */ ({
			stripePaymentId: 'pi_demo_lucas_both', userId: lucas.id,
			amount: (nutritionAnnual + sportAnnual) / 100, currency: 'eur', status: 'paid',
			customer_details_email: lucas.email, customer_details_name: lucas.name,
			offerSlugs: ['nutrition', 'sport']
		})
	});

	await db.userProfile.create({
		data: {
			userId: lucas.id,
			activityLevel: 'ACTIVE',
			objectives: ['fat_loss', 'muscle_gain', 'more_energy'],
			painsPathologies: null,
			contextParticular: 'Déplacements pros le mercredi, resto le vendredi midi',
			breadManagement: 'Pain au levain uniquement, 2×/semaine max',
			allergens: ['poisson'],
			coffeePerDay: 1, alcoholHabit: true, tobaccoHabit: false,
			breakfastEnabled: true, intermittentFastingMorning: false,
			sportActivity: 'VTT le dimanche, semi-marathon prévu en avril',
			familyCoefficients: [{ label: 'Conjoint', coefficient: 0.6 }, { label: 'Enfant', coefficient: 0.5 }],
			shoppingListSortOrder: 'alphabetical'
		}
	});

	// Historique mesures Lucas — recomposition, 1 mesure/semaine sur 13 semaines (91 j)
	// Objectif : -7.5 kg, -9 cm taille — forte perte malgré poids de départ élevé (~0.58 kg/sem)
	for (const snap of weeklySnapshots(
		13,
		{ weightKg: 99.5, waistCm: 107.0, chestCm: 112.5, armCm: 38.5 },
		{ weightKg: 92.0, waistCm:  98.0, chestCm: 108.0, armCm: 36.0 },
		2.5 // noiseSeed propre à Lucas
	)) {
		await db.bodyMeasurement.create({
			data: { userId: lucas.id, age: 41, heightCm: 178,
				weightKg: snap.weightKg, waistCm: snap.waistCm, chestCm: snap.chestCm, armCm: snap.armCm,
				createdAt: daysAgo(snap.daysBack) }
		});
	}

	// Séances sport : 91 jours (données complètes depuis lucasDemoData.json)
	const lucasProgramStart = daysAgo(10);
	const { sessionDays, completedBeforeDayIndex } = LUCAS_DEMO_DATA.sport;
	for (const { dayIndex, sessionIndex } of sessionDays) {
		const scheduledDate = new Date(lucasProgramStart);
		scheduledDate.setDate(scheduledDate.getDate() + (dayIndex - 1));
		const isCompleted = dayIndex <= completedBeforeDayIndex;
		await db.userWorkoutDay.create({
			data: {
				userId: lucas.id,
				sessionId: sessions[sessionIndex].id,
				dayIndex,
				scheduledDate,
				completedAt: isCompleted ? new Date(scheduledDate.getTime() + 3600000) : null,
				isLocked: isCompleted
			}
		});
	}

	// Vidéos vues pour les séances complétées (J2, J4, J6, J9 — sessions 0,1,2,0)
	const completedSessionIndices = [...new Set(sessionDays.filter((d) => d.dayIndex <= completedBeforeDayIndex).map((d) => d.sessionIndex))];
	for (const sessionIdx of completedSessionIndices) {
		for (const video of sessions[sessionIdx].videos.filter((/** @type {{ position: string }} */ v) => v.position !== 'PRE')) {
			await db.userVideoWatch.create({ data: { userId: lucas.id, videoId: video.id } }).catch(() => {});
		}
	}

	// Nutrition : 90 jours (cycle de recettes depuis lucasDemoData.json)
	const { recipeCycle, mealMacros } = LUCAS_DEMO_DATA.nutrition;
	const positions = ['BREAKFAST', 'LUNCH', 'DINNER'];
	for (let dayIndex = 1; dayIndex <= LUCAS_DEMO_DATA.programTotalDays; dayIndex++) {
		const nd = await db.nutritionDay.create({ data: { userId: lucas.id, dayIndex, intermittentFasting: false } });
		const cycle = recipeCycle[(dayIndex - 1) % recipeCycle.length];
		for (const pos of positions) {
			const recipeIndex = cycle[pos];
			const macros = mealMacros[pos];
			await db.meal.create({
				data: {
					nutritionDayId: nd.id,
					position: pos,
					recipeId: recipes[recipeIndex].id,
					quantityG: macros.quantityG,
					calcProteinG: macros.calcProteinG,
					calcCarbsG: macros.calcCarbsG,
					calcFatG: macros.calcFatG,
					calcCalories: macros.calcCalories
				}
			});
		}
	}

	// Listes de courses : 13 périodes (1–7, 8–14, …, 85–90)
	const { periods, itemsByPeriod, defaultItems } = LUCAS_DEMO_DATA.shopping;
	for (let i = 0; i < periods.length; i++) {
		const period = periods[i];
		const list = await db.shoppingList.create({ data: { userId: lucas.id, startDayIndex: period.startDayIndex, endDayIndex: period.endDayIndex } });
		const items = itemsByPeriod[i] ?? defaultItems;
		for (const it of items) {
			await db.shoppingItem.create({ data: { listId: list.id, ...it } });
		}
	}

	// Points (total : 160 pts)
	for (const ev of [
		{ type: 'WORKOUT_COMPLETE', amount: 50, metadata: { sessionName: 'Séance A' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_v1_MAIN_A' } },
		{ type: 'VIDEO_WATCHED', amount: 10, metadata: { youtubeId: 'yt_v2_MAIN_A' } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: "Eau au lever" } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: 'Pas de téléphone 30 min' } },
		{ type: 'PHOTO_UPLOAD', amount: 50, metadata: { month: 1 } }
	]) {
		await db.pointEvent.create({ data: { userId: lucas.id, ...ev } });
	}

	// Badge en début de progression
	await db.userBadge.create({ data: { userId: lucas.id, badgeId: badges[0].id, progress: 1 / 7 } });

	// Tâches cochées aujourd'hui
	await dailyTaskCompletion.create({ data: { userId: lucas.id, taskId: tasks[0].id, date: today } });
	await dailyTaskCompletion.create({ data: { userId: lucas.id, taskId: tasks[1].id, date: today } });

	// Vidéo Découverte vue
	await db.userDiscoveryWatch.create({ data: { userId: lucas.id, contentId: discoveries[0].id } });

	// Photos de progression mois 1 (3 angles)
	for (const angle of ['FRONT', 'SIDE', 'BACK']) {
		await db.progressPhoto.create({
			data: { userId: lucas.id, angle, url: `https://placeholder.thower.test/lucas-${angle.toLowerCase()}-m1.jpg`, month: 1 }
		});
	}

	// Défi rejoint (en cours)
	await db.userChallenge.create({ data: { userId: lucas.id, challengeId: challenge.id } });

	// Items programme J1 (3 premiers), J2 (tous)
	for (const item of programDays[0].items.slice(0, 3)) {
		await db.userProgramDayItemCompletion.create({ data: { userId: lucas.id, programDayItemId: item.id } });
	}
	for (const item of programDays[1].items) {
		await db.userProgramDayItemCompletion.create({ data: { userId: lucas.id, programDayItemId: item.id } });
	}

	// ══════════════════════════════════════════════════════════════════════════
	console.log('\n═══ SEED TERMINÉ ═══');
	console.log('');
	console.log('Catalogue créé :');
	console.log('  2 offres · 5 tâches · 5 contenus découverte · 3 séances sport (9 vidéos) · 4 recettes · 3 badges · 2 récompenses');
	console.log('  Programme 91j (7 premiers jours + 2 pop-ups) · 1 défi actif');
	console.log('');
	console.log('Comptes de démo :');
	console.log('  marie@thower.test   — nutrition uniquement  — J20 — 120 pts — 6 mesures (78→72 kg, -8 cm taille)');
	console.log('  thomas@thower.test  — sport uniquement      — J35 — 200 pts — 6 mesures (79.5→85 kg, +4 cm torse)');
	console.log('  lucas@thower.test   — nutrition + sport     — J10 — 160 pts — 7 mesures (99.5→92 kg, -9 cm taille)');
	console.log('  Mot de passe : thower2026');
}

main()
	.catch((e) => { console.error(e); process.exit(1); })
	.finally(async () => { await prisma.$disconnect(); });
