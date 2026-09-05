/**
 * SEED COMPLET — Méthode Thower
 *
 * Prérequis : npx prisma generate (pour les nouveaux modèles)
 *
 * Crée :
 *   – Catalogue partagé (offres, tâches, vidéos découverte, séances sport, recettes, badges, etc.)
 *   – Programme 91 jours structuré (tous les jours 1–91 : items checklist + séances A/B/C en rythme hebdo)
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
import { RECIPE_CATALOG_DEFS } from './seed/recipeCatalogDefs.js';
import { ADMIN_EMAIL, ensureAdminUser } from './ensureAdminUser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

/** Données factices complètes pour Lucas (91 jours sport, nutrition, courses) */
const LUCAS_DEMO_DATA = JSON.parse(
	readFileSync(path.join(__dirname, 'seed', 'lucasDemoData.json'), 'utf-8')
);

// ─── CONFIG PRIX ────────────────────────────────────────────────────────────
const quarterlyOfferCents = Number(process.env.STRIPE_PLAN_QUARTERLY_OFFER_CENTS ?? 25000);
const offerMonthlyCents = Math.round(quarterlyOfferCents / 3);
const defaultMonthly = offerMonthlyCents;
const defaultAnnual = quarterlyOfferCents * 4;
const nutritionMonthly = Number(process.env.STRIPE_PLAN_MONTHLY_NUTRITION_CENTS ?? offerMonthlyCents);
const nutritionAnnual = Number(process.env.STRIPE_PLAN_ANNUAL_NUTRITION_CENTS ?? defaultAnnual);
const sportMonthly = Number(process.env.STRIPE_PLAN_MONTHLY_SPORT_CENTS ?? offerMonthlyCents);
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

const TEST_EMAILS = ['marie@thower.test', 'thomas@thower.test', 'lucas@thower.test', 'test@thower.test'];

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
	const db = /** @type {any} */ (prisma);
	console.log('═══ SEED COMPLET THOWER ═══\n');

	// ── 0. MIGRATIONS DONNÉES LEGACY (Mongo, idempotent) ───────────────────────
	console.log('0 — Migrations legacy…');
	try {
		const actResult = await db.$runCommandRaw({
			update: 'user_profiles',
			updates: [
				{
					q: { activityLevel: 'MODERATE' },
					u: { $set: { activityLevel: 'ACTIVE' } },
					multi: true
				}
			]
		});
		const actN = actResult?.nModified ?? actResult?.n ?? actResult?.modifiedCount ?? 0;
		if (actN > 0) {
			console.log(`  → ${actN} profil(s) : activityLevel MODERATE → ACTIVE (enum ActivityLevel).`);
		}
	} catch (e) {
		console.warn('  → Migration activityLevel user_profiles ignorée :', e?.message ?? e);
	}

	// Patch daily_tasks sans type (créées avant l'ajout du champ DailyTaskType)
	try {
		// Tasks avec discoveryContentId → VIDEO, les autres → STANDARD
		await db.$runCommandRaw({
			update: 'daily_tasks',
			updates: [
				{
					q: { type: { $exists: false }, discoveryContentId: { $exists: true, $ne: null } },
					u: { $set: { type: 'VIDEO' } },
					multi: true
				},
				{
					q: { type: { $exists: false } },
					u: { $set: { type: 'STANDARD' } },
					multi: true
				}
			]
		});
		console.log('  → daily_tasks : types manquants patchés (VIDEO / STANDARD).');
	} catch (e) {
		console.warn('  → Migration type daily_tasks ignorée :', e?.message ?? e);
	}

	try {
		const bsonRepairPipeline = [
			{
				$set: {
					cloudflareUid: {
						$cond: {
							if: {
								$or: [
									{ $eq: [{ $ifNull: ['$cloudflareUid', null] }, null] },
									{ $eq: ['$cloudflareUid', ''] }
								]
							},
							then: {
								$cond: {
									if: {
										$and: [
											{ $ne: [{ $ifNull: ['$youtubeId', null] }, null] },
											{ $ne: ['$youtubeId', ''] }
										]
									},
									then: '$youtubeId',
									else: { $concat: ['cf_seeded_', { $toString: '$_id' }] }
								}
							},
							else: '$cloudflareUid'
						}
					},
					status: { $ifNull: ['$status', 'pending'] }
				}
			},
			{ $unset: 'youtubeId' }
		];
		for (const coll of ['discovery_contents', 'workout_videos']) {
			await db.$runCommandRaw({
				update: coll,
				updates: [{ q: {}, u: bsonRepairPipeline, multi: true }]
			});
		}
		console.log('  → discovery_contents + workout_videos : clé youtubeId nettoyée / cloudflareUid garanti.');
	} catch (e) {
		console.warn('  → Migration vidéos Cloudflare (BSON) ignorée :', e?.message ?? e);
	}

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
	// Ordre du tableau = discoveryIdx utilisé dans `dayConfigs` (indices 0–4 uniquement).

	// Libère l’UID Stream si une ancienne fiche doublonnait « Vidéo de bienvenue — Jour 1 » (unicité cloudflareUid).
	try {
		const staleDup = await db.discoveryContent.findFirst({
			where: { category: 'MOTIVATION', title: 'Vidéo de bienvenue — Jour 1' }
		});
		if (staleDup) {
			await db.discoveryContent.update({
				where: { id: staleDup.id },
				data: /** @type {any} */ ({
					active: false,
					title: '[obsolète] Vidéo de bienvenue — Jour 1',
					cloudflareUid: `cf_seed_deprecated_mot_dup_${String(staleDup.id).slice(-8)}`,
					status: 'pending'
				})
			});
			console.log('  → Ancien doublon MOTIVATION « Jour 1 » désactivé (UID Stream libéré pour la fiche principale).');
		}
	} catch (e) {
		console.warn('  → Nettoyage doublon MOTIVATION avant sync :', e?.message ?? e);
	}

	const discoveryDefs = [
		{ category: 'BREATHWORK', title: 'Respiration anti-stress (seed prog.)', cloudflareUid: 'cf_seed_prog_bw_0', order: 0, active: true },
		{ category: 'MINDSET', title: 'Mindset — discipline quotidienne (seed)', cloudflareUid: 'cf_seed_prog_ms_1', order: 0, active: true },
		{ category: 'BREATHWORK', title: 'Cohérence cardiaque 5 min (seed)', cloudflareUid: 'cf_seed_prog_bw_2', order: 1, active: true },
		{
			category: 'MOTIVATION',
			title: 'Bienvenue dans le programme',
			cloudflareUid: '4771afb40a088a867cab0ff01ad8c655',
			thumbnailUrl: null,
			order: 0,
			active: true,
			status: 'ready'
		},
		{ category: 'EXPLICATION', title: 'Pourquoi la méthode (seed prog.)', cloudflareUid: 'cf_seed_prog_exp_4', order: 0, active: true }
	];
	const discoveries = [];
	for (const def of discoveryDefs) {
		let row = await db.discoveryContent.findUnique({ where: { cloudflareUid: def.cloudflareUid } });
		if (!row) {
			row = await db.discoveryContent.findFirst({
				where: { category: def.category, title: def.title }
			});
		}
		if (!row) {
			row = await db.discoveryContent.create({ data: /** @type {any} */ (def) });
		} else {
			const patch = {
				cloudflareUid: def.cloudflareUid,
				title: def.title,
				order: def.order,
				active: def.active,
				...(def.thumbnailUrl !== undefined ? { thumbnailUrl: def.thumbnailUrl } : {}),
				...(def.status !== undefined ? { status: def.status } : {})
			};
			if (
				row.cloudflareUid !== patch.cloudflareUid ||
				row.title !== patch.title ||
				row.order !== patch.order ||
				row.active !== patch.active ||
				(patch.thumbnailUrl !== undefined && row.thumbnailUrl !== patch.thumbnailUrl) ||
				(patch.status !== undefined && row.status !== patch.status)
			) {
				try {
					row = await db.discoveryContent.update({
						where: { id: row.id },
						data: /** @type {any} */ (patch)
					});
				} catch (e) {
					console.warn(`  ⚠ Sync discovery ignoré (« ${def.title} ») :`, e?.message ?? e);
				}
			}
		}
		discoveries.push(row);
	}
	{
		const VIDEO_TASK_LABEL = 'Regarde la vidéo de bienvenue';
		const VIDEO_UID = '4771afb40a088a867cab0ff01ad8c655';
		const videoContent = await db.discoveryContent.findUnique({ where: { cloudflareUid: VIDEO_UID } });
		if (videoContent) {
			const existing = await db.dailyTask.findFirst({ where: { label: VIDEO_TASK_LABEL } });
			if (!existing) {
				const videoTask = await db.dailyTask.create({
					data: {
						label: VIDEO_TASK_LABEL,
						points: 20,
						order: 5,
						type: 'VIDEO',
						active: true,
						showFromDay: 1,
						showUntilDay: 1,
						discoveryContent: { connect: { id: videoContent.id } }
					}
				});
				tasks.push(videoTask);
				console.log(`  → Tâche VIDEO jour 1 créée : "${VIDEO_TASK_LABEL}" (vidéo: ${VIDEO_UID})`);
			} else {
				await db.dailyTask.update({
					where: { id: existing.id },
					data: {
						type: 'VIDEO',
						showFromDay: 1,
						showUntilDay: 1,
						discoveryContent: { connect: { id: videoContent.id } }
					}
				});
				const updated = await db.dailyTask.findUnique({ where: { id: existing.id } });
				if (updated) tasks.push(updated);
				console.log(`  → Tâche VIDEO jour 1 reliée au contenu canonique (${VIDEO_UID}).`);
			}
			// Anciennes fiches motivation cf_seed_* : restent en base mais ne doivent pas apparaître
			// dans le hub (playback-token renverrait 409).
			try {
				const n = await db.discoveryContent.updateMany({
					where: {
						category: 'MOTIVATION',
						active: true,
						cloudflareUid: { startsWith: 'cf_seed_' },
						id: { not: videoContent.id }
					},
					data: { active: false }
				});
				if (n.count > 0) {
					console.log(
						`  → ${n.count} entrée(s) motivation cf_seed_* désactivée(s) (liste + checklist → vidéo canonique).`
					);
				}
			} catch (e) {
				console.warn('  → Désactivation motivation cf_seed_* ignorée :', e?.message ?? e);
			}
		} else {
			console.warn(`  ⚠ Vidéo ${VIDEO_UID} introuvable en DB — tâche VIDEO jour 1 non créée.`);
		}
	}

	// ── 4. SÉANCES SPORT + VIDÉOS ─────────────────────────────────────────────
	console.log('4/10 — WorkoutSessions + Videos…');
	// 3 séances A/B/C + vidéos placeholder (remplaçables via admin / Cloudflare). Ordre = sessionIdx 0,1,2.
	const sessionDefs = [
		{ type: 'MAIN_A', name: 'Séance A — Haut du corps', weekNumber: 1, order: 0 },
		{ type: 'MAIN_B', name: 'Séance B — Bas du corps', weekNumber: 1, order: 1 },
		{ type: 'MAIN_C', name: 'Séance C — Full body', weekNumber: 1, order: 2 }
	];
	const videoSlots = [
		{ position: 'PRE', title: 'Pré-séance', isOptional: true, order: 0, uidKey: 'pre' },
		{ position: 'VID1', title: 'Vidéo 1', isOptional: false, order: 1, uidKey: 'v1' },
		{ position: 'VID2', title: 'Vidéo 2', isOptional: false, order: 2, uidKey: 'v2' }
	];
	const sessions = [];
	/** Vidéo principale (VID1) par index de séance — pour les items SPORT_SESSION du programme 91j */
	const sessionMainVideoIdByIdx = /** @type {(string | null)[]} */ ([]);
	for (let sessionIdx = 0; sessionIdx < sessionDefs.length; sessionIdx++) {
		const sdef = sessionDefs[sessionIdx];
		let sess = await db.workoutSession.findFirst({
			where: { type: sdef.type, weekNumber: sdef.weekNumber, order: sdef.order }
		});
		if (!sess) {
			sess = await db.workoutSession.create({
				data: /** @type {any} */ ({ ...sdef, active: true, description: 'Seed Méthode Thower' })
			});
		}
		let mainVideoId = null;
		for (const slot of videoSlots) {
			const cloudflareUid = `cf_seed_${slot.uidKey}_${sdef.type}`;
			let vid = await db.workoutVideo.findFirst({ where: { cloudflareUid } });
			if (!vid) {
				vid = await db.workoutVideo.create({
					data: {
						cloudflareUid,
						title: `${sdef.name} — ${slot.title}`,
						sessionType: sdef.type,
						position: slot.position,
						isOptional: slot.isOptional,
						status: 'pending'
					}
				});
			} else if (vid.sessionType !== sdef.type) {
				vid = await db.workoutVideo.update({
					where: { id: vid.id },
					data: { sessionType: sdef.type }
				});
			}
			if (slot.position === 'VID1') mainVideoId = vid.id;
		}
		sessionMainVideoIdByIdx[sessionIdx] = mainVideoId;
		sessions.push(sess);
	}
	console.log(`  → ${sessions.length} séances sport (A/B/C) + vidéos placeholder cf_seed_*`);

	// ── 5. RECETTES ───────────────────────────────────────────────────────────
	console.log('5/10 — Recettes…');
	// Schéma actuel : RecipeCategory = BREAKFAST | MEAL | DESSERT uniquement.
	// Les anciennes valeurs (FIRST_3_MONTHS, NEW, etc.) cassent Prisma au find — correction directe Mongo avant tout accès Recipe.
	try {
		const migrateResult = await db.$runCommandRaw({
			update: 'recipes',
			updates: [
				{
					q: { category: { $nin: ['BREAKFAST', 'MEAL', 'DESSERT'] } },
					u: { $set: { category: 'MEAL' } },
					multi: true
				}
			]
		});
		const n =
			migrateResult?.nModified ??
			migrateResult?.n ??
			migrateResult?.modifiedCount ??
			0;
		if (n > 0) {
			console.log(`  → ${n} recette(s) : category migrée vers MEAL (valeurs hors enum).`);
		}
	} catch (e) {
		console.warn('  → Migration category recettes ignorée :', e?.message ?? e);
	}

	/** 31 recettes catalogue (10 petits-déj + 21 plats) — voir seed/recipeCatalogDefs.js */
	const recipeDefs = RECIPE_CATALOG_DEFS;
	const recipes = [];
	for (const def of recipeDefs) {
		const { ingredients, allergens = [], ...recipeData } = def;
		let recipe = await db.recipe.findFirst({ where: { name: def.name, userId: null } });
		if (!recipe) {
			recipe = await db.recipe.create({
				data: {
					...recipeData,
					allergens,
					active: true,
					isCustom: false,
					ingredients: { create: ingredients }
				},
				include: { ingredients: true }
			});
		} else {
			await db.recipe.update({
				where: { id: recipe.id },
				data: { ...recipeData, allergens, active: true, isCustom: false }
			});
			recipe = await db.recipe.findUnique({
				where: { id: recipe.id },
				include: { ingredients: true }
			});
		}
		recipes.push(recipe);
	}
	console.log(`  → ${recipes.length} recettes catalogue (définitions : ${RECIPE_CATALOG_DEFS.length})`);

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

	// ── 8. PROGRAMME 91 JOURS ────────────────────────────────────────────────
	// Modèle : `Program` (1 actif) → `ProgramDay` (dayIndex 1–91) → `ProgramDayItem`
	// (tâches, vidéos découverte, séances sport via workoutVideoId, pas, custom…).
	// Les séances A/B/C sont les 3 `WorkoutSession` seedées ; elles reviennent chaque semaine
	// (mardi A, jeudi B, samedi C) sur le motif de la semaine 1.
	console.log('8/10 — Programme 91 jours…');
	let program = await db.program.findFirst({ where: { active: true } });
	if (!program) {
		program = await db.program.create({ data: { name: 'Méthode Thower', totalDays: 91, active: true } });
	}

	// Semaine 1 (jour 1 = onboarding ; jours 2–7 = rythme type)
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

	// Jours 8, 15, 22… (début de semaine « calendaire ») : pas de rediffusion « bienvenue jour 1 »,
	// même rythme tâches + mindset + breathwork que les autres lundis de méthode.
	const weekRepeatStartTemplate = [
		{ type: 'DAILY_TASK', points: 20, order: 0, dailyTaskIdx: 0 },
		{ type: 'DAILY_TASK', points: 20, order: 1, dailyTaskIdx: 1 },
		{ type: 'MINDSET_VIDEO', points: 10, order: 2, discoveryIdx: 1 },
		{ type: 'BREATHWORK', points: 15, order: 3, discoveryIdx: 0 }
	];

	/** @param {number} dayIndex 1..91 */
	function programDayTemplateFor(dayIndex) {
		if (dayIndex === 1) return dayConfigs[0];
		if ((dayIndex - 1) % 7 === 0) return weekRepeatStartTemplate;
		return dayConfigs[(dayIndex - 1) % 7];
	}

	const programDays = [];
	for (let i = 0; i < 91; i++) {
		const dayIndex = i + 1;
		const template = programDayTemplateFor(dayIndex);
		let day = await db.programDay.findUnique({
			where: { programId_dayIndex: { programId: program.id, dayIndex } }
		});
		if (!day) {
			day = await db.programDay.create({ data: { programId: program.id, dayIndex } });
		}
		const existingItems = await db.programDayItem.findMany({ where: { programDayId: day.id } });
		if (existingItems.length === 0) {
			for (const _cfg of template) {
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
						workoutVideoId:
							cfg.sessionIdx != null ? (sessionMainVideoIdByIdx[cfg.sessionIdx] ?? null) : null
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
	// Transactions seed (stripePaymentId fixe) : sans cascade User→Transaction, un re-seed laissait
	// des lignes orphelines → doublons et échec de l’index unique sur stripePaymentId au db push.
	await db.transaction.deleteMany({
		where: {
			stripePaymentId: {
				in: ['pi_demo_marie_nutrition', 'pi_demo_thomas_sport', 'pi_demo_lucas_both', 'pi_demo_test_j1']
			}
		}
	});
	for (const email of TEST_EMAILS) {
		const existing = await db.user.findUnique({ where: { email } });
		if (existing) {
			await db.transaction.deleteMany({ where: { userId: existing.id } });
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
			breadDaily: true,
			breadGramsPerDay: 40,
			breadType: 'WHOLE_WHEAT',
			breadManagement: null,
			allergens: ['gluten', 'fruits_a_coque'],
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
		// Indices catalogue : 10 = Poulet riz coco curry, 13 = Cabillaud citron quinoa (ex-saumon)
		await db.meal.create({ data: { nutritionDayId: nd.id, position: 'LUNCH', recipeId: recipes[10].id, quantityG: 450, calcProteinG: 52, calcCarbsG: 38, calcFatG: 12, calcCalories: 476 } });
		await db.meal.create({ data: { nutritionDayId: nd.id, position: 'DINNER', recipeId: recipes[13].id, quantityG: 380, calcProteinG: 42, calcCarbsG: 32, calcFatG: 10, calcCalories: 390 } });
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

	// Points (VIDEO_WATCHED retiré : progressions laissées libres pour tests manuels)
	for (const ev of [
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: "Eau au lever" } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: 'Pas de téléphone 30 min' } },
		{ type: 'DAILY_TASK', amount: 20, metadata: { label: "Eau au lever" } },
		{ type: 'DAILY_TASK', amount: 30, metadata: { label: 'Pas de sucre' } },
		{ type: 'PHOTO_UPLOAD', amount: 50, metadata: { month: 1 } }
	]) {
		await db.pointEvent.create({ data: { userId: marie.id, ...ev } });
	}

	// Badge en progression (30 jours : 67 % atteint à J20)
	await db.userBadge.create({ data: { userId: marie.id, badgeId: badges[2].id, progress: 20 / 30 } });

	// Tâches cochées aujourd'hui
	await dailyTaskCompletion.create({ data: { userId: marie.id, taskId: tasks[0].id, date: today } });
	await dailyTaskCompletion.create({ data: { userId: marie.id, taskId: tasks[3].id, date: today } });

	// Pas d’UserVideoProgress « validé » en seed — à tester en lecture réelle (Découverte + sport)

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
			breadDaily: false,
			breadGramsPerDay: 0,
			breadType: null,
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

	// Pas d’UserVideoProgress workout validé en seed (tests lecture / seuil 80 % côté navigateur)

	// Points (WORKOUT_* et points vidéo conservés comme historique ; pas de UVP validé côté DB)
	for (const ev of [
		{ type: 'WORKOUT_COMPLETE', amount: 50, metadata: { sessionName: 'Séance A' } },
		{ type: 'WORKOUT_COMPLETE', amount: 50, metadata: { sessionName: 'Séance B' } },
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
			breadDaily: false,
			breadGramsPerDay: 35,
			breadType: 'COUNTRY',
			breadManagement: 'Pain au levain, 2×/semaine max',
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

	// Pas d’UserVideoProgress workout validé en seed (tests manuels)

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

	// Points (VIDEO_WATCHED retiré — UVP laissé vide pour tests)
	for (const ev of [
		{ type: 'WORKOUT_COMPLETE', amount: 50, metadata: { sessionName: 'Séance A' } },
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
	// USER 4 — Test : nutrition + sport, J1 (pour tester les tâches du premier jour)
	// ══════════════════════════════════════════════════════════════════════════
	console.log('  → Test (J1, nutrition + sport)…');
	const testUser = await db.user.create({
		data: /** @type {any} */ ({
			email: 'test@thower.test', username: 'test.thower', name: 'Compte Test J1',
			passwordHash: PASSWORD_HASH, emailVerified: true, role: 'CLIENT',
			subscriptionEndsAt: daysFromNow(365),
			programStartDate: today
		})
	});

	await db.transaction.create({
		data: /** @type {any} */ ({
			stripePaymentId: 'pi_demo_test_j1', userId: testUser.id,
			amount: (nutritionAnnual + sportAnnual) / 100, currency: 'eur', status: 'paid',
			customer_details_email: testUser.email, customer_details_name: testUser.name,
			offerSlugs: ['nutrition', 'sport']
		})
	});

	await db.userProfile.create({
		data: {
			userId: testUser.id,
			activityLevel: 'ACTIVE',
			objectives: ['fat_loss'],
			painsPathologies: null,
			contextParticular: null,
			breadDaily: false,
			breadGramsPerDay: 0,
			breadType: null,
			breadManagement: null,
			allergens: [],
			coffeePerDay: 1, alcoholHabit: false, tobaccoHabit: false,
			breakfastEnabled: true, intermittentFastingMorning: false,
			sportActivity: null,
			familyCoefficients: [],
			shoppingListSortOrder: 'category'
		}
	});

	await db.bodyMeasurement.create({
		data: { userId: testUser.id, age: 30, heightCm: 175, weightKg: 80, waistCm: 88, chestCm: 98, armCm: 34 }
	});

	// Admin (npm run reset le crée aussi ; seed seul ne le garantissait pas avant)
	const adminResult = await ensureAdminUser(db);
	if (adminResult.created) {
		console.log(`\n  → Compte admin créé : ${ADMIN_EMAIL} (mdp thower2026)`);
	}

	// ══════════════════════════════════════════════════════════════════════════
	console.log('\n═══ SEED TERMINÉ ═══');
	console.log('');
	console.log('Catalogue créé :');
	console.log('  2 offres · 5 tâches · 5 contenus découverte · 3 séances sport (9 vidéos) · 4 recettes · 3 badges · 2 récompenses');
	console.log('  Programme 91j (91 jours + items checklist + 2 pop-ups) · 1 défi actif');
	console.log('');
	console.log('Comptes de démo :');
	console.log('  marie@thower.test   — nutrition uniquement  — J20 — 120 pts — 6 mesures (78→72 kg, -8 cm taille)');
	console.log('  thomas@thower.test  — sport uniquement      — J35 — 200 pts — 6 mesures (79.5→85 kg, +4 cm torse)');
	console.log('  lucas@thower.test   — nutrition + sport     — J10 — 160 pts — 7 mesures (99.5→92 kg, -9 cm taille)');
	console.log('  test@thower.test    — nutrition + sport     — J1  — 0 pts   — compte test tâches jour 1');
	console.log(`  ${ADMIN_EMAIL}      — administrateur`);
	console.log('  Mot de passe : thower2026');
}

main()
	.catch((e) => { console.error(e); process.exit(1); })
	.finally(async () => { await prisma.$disconnect(); });
