import { google } from '$lib/lucia/oauth';
import { ObjectParser } from '@pilcrowjs/object-parser';
import { getUserFromGoogleId, getUserFromEmail } from '$lib/lucia/user';
import { decodeIdToken } from 'arctic';
import { auth } from '$lib/lucia';
import { createUserWithGoogleOAuth } from '$lib/prisma/user/user';

import type { RequestEvent } from './$types';
import type { OAuth2Tokens } from 'arctic';

export async function GET(event: RequestEvent): Promise<Response> {
	const storedState = event.cookies.get('google_oauth_state') ?? null;
	const codeVerifier = event.cookies.get('google_code_verifier') ?? null;
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');

	if (!storedState || !codeVerifier || !code || !state || storedState !== state) {
		return new Response('Invalid request. Please restart the process.', { status: 400 });
	}

	let tokens: OAuth2Tokens;
	try {
		tokens = await google.validateAuthorizationCode(code, codeVerifier);
	} catch (e) {
		return new Response('Authorization failed. Please try again.', { status: 400 });
	}

	const claims = decodeIdToken(tokens.idToken());
	const claimsParser = new ObjectParser(claims);

	const googleId = claimsParser.getString('sub');
	const name = claimsParser.getString('name');
	const picture = claimsParser.getString('picture');
	const email = claimsParser.getString('email');

	let user: { id: string } | null = await getUserFromGoogleId(googleId);
	if (!user) {
		user = await getUserFromEmail(email);

		if (!user) {
			// console.log(googleId, email, name, picture, "Création d'un nouvel utilisateur OAuth");
			user = await createUserWithGoogleOAuth(googleId, email, name, picture);
		}
	}

	if (!user) {
		return new Response('User creation failed.', { status: 500 });
	}

	// ✅ Lucia: créer session + cookie standard
	const session = await auth.createSession(user.id, { twoFactorVerified: false });
	const sessionCookie = auth.createSessionCookie(session.id);
	event.cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '/',
		...sessionCookie.attributes
	});

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/'
		}
	});
}
