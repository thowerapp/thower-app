// Configuration SEO pour Thower
export const seoConfig = {
	// Informations de base du site
	site: {
		name: 'Thower',
		url: 'https://thower.com',
		description: 'Thower - Suivez votre évolution physique avec un programme sur-mesure et l\'accompagnement d\'un coach sportif. Alimentation et sport.',
		keywords: 'Thower, suivi physique, coach sportif, programme alimentation, programme sportif, évolution physique, nutrition, entraînement',
		author: 'Thower',
		locale: 'fr_FR'
	},

	// Métadonnées par défaut
	defaults: {
		title: 'Thower - Suivi physique et accompagnement coach sportif',
		description: 'Suivez votre évolution physique avec un programme sur-mesure et l\'accompagnement d\'un coach sportif. Alimentation et sport.',
		keywords: 'Thower, suivi physique, coach sportif, programme alimentation, programme sportif, évolution physique, nutrition, entraînement',
		image: '/og-default.jpg',
		type: 'website'
	},

	// Configuration des pages principales
	pages: {
		home: {
			title: 'Thower - Suivi physique et accompagnement coach sportif',
			description: 'Suivez votre évolution physique avec un programme sur-mesure et l\'accompagnement d\'un coach sportif. Alimentation et sport.',
			keywords: 'Thower, suivi physique, coach sportif, programme alimentation, programme sportif, évolution physique, nutrition, entraînement',
			image: '/og-home.jpg'
		},
		blog: {
			title: 'Blog - Conseils nutrition, sport et suivi avec Thower',
			description: 'Conseils nutrition, programmes sportifs et actualités Thower. Suivi de l\'évolution physique et accompagnement par un coach.',
			keywords: 'blog Thower, conseils nutrition, programme sportif, suivi physique, coach sportif, évolution physique',
			image: '/og-blog.jpg'
		},
		catalogue: {
			title: 'Programmes - Nos offres d\'accompagnement Thower',
			description: 'Découvrez les programmes Thower : suivi physique, nutrition et accompagnement par un coach sportif. Choisissez l\'offre adaptée à vos objectifs.',
			keywords: 'programmes Thower, accompagnement coach, suivi physique, programme nutrition, offre coaching',
			image: '/og-catalogue.jpg'
		},
		atelier: {
			title: 'Mon suivi - Suivi personnalisé Thower',
			description: 'Accédez à votre suivi personnalisé Thower : évolution physique, programme alimentaire et entraînement avec votre coach sportif.',
			keywords: 'suivi personnalisé Thower, évolution physique, programme coach, tableau de bord',
			image: '/og-atelier.jpg'
		},
		contact: {
			title: 'Contact - Parlons de votre projet Thower',
			description: 'Contactez l\'équipe Thower pour discuter de votre accompagnement, de vos objectifs physiques ou pour rejoindre notre programme.',
			keywords: 'contact Thower, accompagnement coach, objectifs physiques, programme sportif',
			image: '/og-contact.jpg'
		},
		checkout: {
			title: 'Finaliser - Souscription Thower',
			description: 'Finalisez votre souscription au programme Thower. Paiement sécurisé et accès à votre accompagnement coach.',
			keywords: 'souscription Thower, paiement sécurisé, programme coach, finalisation',
			image: '/og-checkout.jpg'
		},
		checkoutSuccess: {
			title: 'Souscription confirmée - Thower',
			description: 'Votre souscription Thower a été confirmée avec succès. Merci pour votre confiance. Votre coach vous accompagne.',
			keywords: 'souscription confirmée, succès, Thower, confirmation',
			image: '/og-checkout-success.jpg'
		},
		error: {
			title: 'Page non trouvée - Thower',
			description: 'La page que vous recherchez n\'existe pas. Retournez à l\'accueil pour découvrir Thower et notre accompagnement coach sportif.',
			keywords: 'page non trouvée, erreur 404, Thower',
			image: '/og-error.jpg'
		},
		auth: {
			title: 'Authentification - Thower',
			description: 'Connectez-vous à votre compte Thower pour accéder à votre suivi physique et à l\'accompagnement de votre coach.',
			keywords: 'connexion, authentification, compte Thower, profil, suivi physique',
			image: '/og-auth.jpg'
		},
		admin: {
			title: 'Administration - Thower',
			description: 'Panneau d\'administration Thower. Gestion des utilisateurs, des programmes et de l\'accompagnement.',
			keywords: 'administration, gestion, utilisateurs, programmes, Thower',
			image: '/og-admin.jpg'
		}
	},

	// Configuration des réseaux sociaux
	social: {
		twitter: {
			site: '@thower',
			creator: '@thower'
		},
		facebook: {
			appId: 'votre-app-id-facebook'
		}
	},

	// Configuration des images Open Graph
	images: {
		default: '/og-default.jpg',
		home: '/og-home.jpg',
		blog: '/og-blog.jpg',
		catalogue: '/og-catalogue.jpg',
		atelier: '/og-atelier.jpg',
		contact: '/og-contact.jpg',
		article: '/og-article.jpg'
	}
};
