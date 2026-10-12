import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const GEOCODER_URL = 'https://data.geopf.fr/geocodage/search';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const query = url.searchParams.get('q')?.trim();
	if (!query) {
		return json({ error: 'Query parameter is missing' }, { status: 400 });
	}

	const params = new URLSearchParams({ q: query.slice(0, 200), limit: '5' });
	let response: Response;
	try {
		response = await fetch(`${GEOCODER_URL}?${params}`);
	} catch {
		return json({ error: 'Geocoding service unavailable' }, { status: 502 });
	}
	if (!response.ok) {
		return json({ error: 'Geocoding service unavailable' }, { status: 502 });
	}

	const data = (await response.json()) as {
		features?: { properties: Record<string, string | undefined> }[];
	};
	if (!data.features?.length) {
		return json({ error: 'No results found' }, { status: 404 });
	}

	const suggestions = data.features.map(({ properties }) => ({
		label: properties.label,
		name: properties.name,
		postcode: properties.postcode,
		city: properties.city,
		context: properties.context
	}));

	return json({ suggestions });
};
