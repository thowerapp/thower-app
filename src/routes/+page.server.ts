// -----------------------------------------------------------------------------
// src/routes/+page.server.ts
// Signup action moved to root page so the homepage can handle registrations
// -----------------------------------------------------------------------------

import { redirect, fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from '$lib/superforms-zod';

import { signupSchema } from '$lib/schema/auth/signupSchema';

import { checkEmailAvailability } from '$lib/prisma/email/email';
import { createUser } from '$lib/lucia/user';

import {
  createEmailVerificationRequest,
  sendVerificationEmail,
  setEmailVerificationRequestCookie
} from '$lib/lucia/email-verification';

import { RefillingTokenBucket } from '$lib/lucia/rate-limit';
import { auth } from '$lib/lucia';

import type { PageServerLoad, Actions } from './$types';

const ipBucket = new RefillingTokenBucket<string>(3, 10); // 3 req / 10 s

function log(...args: unknown[]) {
  console.log('[root-signup]', ...args);
}

export const load: PageServerLoad = async (event) => {
  log('load() start', { isAuthenticated: !!event.locals.user, user: event.locals.user?.id });

  if (event.locals.session && event.locals.user) {
    const u = event.locals.user;

    if (!u.emailVerified) return redirect(302, '/auth/verify-email');
    if (!u.googleId && u.isMfaEnabled) {
      if (!u.registered2FA) return redirect(302, '/auth/2fa/setup');
      if (!event.locals.session.twoFactorVerified) return redirect(302, '/auth/2fa');
    }
    return redirect(302, '/auth/');
  }

  const form = await superValidate(zod(signupSchema));
  log('load() done → empty form');
  return { form };
};

export const actions: Actions = {
  signup: async (event) => {
    log('POST / (signup) hit');

    const ip = event.request.headers.get('x-forwarded-for') ?? 'localhost';
    if (!ipBucket.check(ip, 1)) return fail(429, { message: 'Too many requests' });

    const form = await superValidate(event, zod(signupSchema));
    log('Form received', form.data);

    if (!form.valid) {
      log('❌ Form validation failed:', form.errors);
      return fail(400, { message: 'Erreurs de validation. Vérifiez vos données.' });
    }

    const email = form.data.email as string;
    const username = form.data.username as string;
    const password = form.data.password as string;
    log('📧 Extracted data:', { email, username });

    if (!(await checkEmailAvailability(email))) {
      log('❌ Email already exists → redirect login', email);
      throw redirect(
        303,
        `/auth/login?reason=already_registered&email=${encodeURIComponent(email)}`
      );
    }

    if (!ipBucket.consume(ip, 1)) return fail(429, { message: 'Too many requests' });

    const user = await createUser(email, username, password);
    log('✅  User created', { id: user.id, email: user.email });

    const evReq = await createEmailVerificationRequest(user.id, user.email);
    try {
      await sendVerificationEmail(evReq.email, evReq.code);
      log('📧  Verification e-mail sent →', evReq.email);
    } catch (err) {
      log('⚠️  FAILED to send verification e-mail', err);
    }
    setEmailVerificationRequestCookie(event, evReq);

    const session = await auth.createSession(user.id, { twoFactorVerified: false });
    const cookie = auth.createSessionCookie(session.id);

    event.cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });
    log('✅  Session created', { sid: session.id });

    log('Redirect to 2FA setup');
    throw redirect(303, '/auth/2fa/setup');
  }
};
