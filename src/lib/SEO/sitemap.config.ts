// Configuration du sitemap
export const sitemapConfig = {
	// URL de base du site
	site: 'https://thower.com', // Domaine Thower
	
	// Routes à exclure du sitemap (routes privées, admin, auth)
	excludedRoutes: [
		'/auth',
		'/admin',
		'/checkout',
		'/sitemap.xml',
		'/api',
		'/+page.svelte' // Fichier technique
	],
	
	// Configuration des priorités et fréquences par type de route
	routeConfig: {
		'/': { priority: '1.0', changefreq: 'daily' },
		'/contact': { priority: '0.7', changefreq: 'monthly' }
	},
	
	// Configuration par défaut pour les routes non configurées
	defaultConfig: {
		priority: '0.5',
		changefreq: 'weekly'
	}
};
