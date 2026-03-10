import type { RequestHandler } from './$types';
import { sitemapConfig } from '$lib/SEO/sitemap.config';

type RouteConfig = { priority: string; changefreq: string };

// Importer toutes les pages Svelte automatiquement
const pages = import.meta.glob('../**/+page.svelte', { eager: true });

const extractPaths = () => {
	const paths: Array<{ path: string; priority: string; changefreq: string }> = [];

	for (const path in pages) {
		let route = path.replace('../', '').replace('/+page.svelte', '');

		if (route.includes('[') && route.includes(']')) {
			continue;
		}

		if (!route.startsWith('/')) {
			route = `/${route}`;
		}

		const shouldExclude = sitemapConfig.excludedRoutes.some((excludedRoute: string) => {
			if (excludedRoute.endsWith('*')) {
				const pattern = excludedRoute.slice(0, -1);
				return route.startsWith(pattern);
			}
			return route === excludedRoute || route.startsWith(excludedRoute + '/');
		});

		if (shouldExclude) {
			continue;
		}

		if (route === '/index') {
			route = '/';
		}

		let priority = sitemapConfig.defaultConfig.priority;
		let changefreq = sitemapConfig.defaultConfig.changefreq;

		for (const [pattern, config] of Object.entries(sitemapConfig.routeConfig) as [string, RouteConfig][]) {
			if (route.startsWith(pattern)) {
				priority = config.priority;
				changefreq = config.changefreq;
				break;
			}
		}

		paths.push({ path: route, priority, changefreq });
	}

	return paths;
};

const escapeXml = (str: string): string => {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
};

const generateSitemap = (paths: Array<{ path: string; priority: string; changefreq: string }>) => {
	const currentDate = new Date().toISOString();

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${paths
	.map(
		({ path, priority, changefreq }) => `    <url>
        <loc>${escapeXml(sitemapConfig.site + path)}</loc>
        <changefreq>${escapeXml(changefreq)}</changefreq>
        <priority>${escapeXml(priority)}</priority>
        <lastmod>${escapeXml(currentDate)}</lastmod>
    </url>`
	)
	.join('\n')}
</urlset>`;
};

export const GET: RequestHandler = async () => {
	const paths = extractPaths();
	const body = generateSitemap(paths);
	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
