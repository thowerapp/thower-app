// import type { PageServerLoad } from './$types';
// import { redirect } from '@sveltejs/kit';

// export const load = (async ({ locals }) => {
// 	// Vérifie si l'utilisateur est connecté
// 	if (!locals.user) {
// 		throw redirect(302, '/auth/login'); // Redirige vers la page de connexion
// 	}

// 	// Vérifie le rôle
// 	if (locals.role !== 'ADMIN') {
// 		throw redirect(302, '/'); // Redirige vers la page d'accueil
// 	}

// 	// Retourne les données nécessaires pour l'admin
// 	return {
// 		user: locals.user,
// 		role: locals.role
// 	};
// }) satisfies PageServerLoad;
