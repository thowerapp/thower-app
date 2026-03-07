import { generateRandomOTP } from './utils';
import { ExpiringTokenBucket } from './rate-limit';
import { ObjectId } from 'mongodb'; // Import de ObjectId
import type { RequestEvent } from '@sveltejs/kit';
import {
	createEmailVerificationRequestPrisma,
	deleteEmailVerificationRequestsByUserId,
	findEmailVerificationRequest
} from '$lib/prisma/emailVerificationRequest/emailVerificationRequest';
import nodemailer from 'nodemailer';

import dotenv from 'dotenv';
dotenv.config();

export interface EmailVerificationRequest {
	id: string;
	userId: string;
	code: string;
	email: string;
	expiresAt: Date;
}

// Récupère une requête de vérification d'email pour un utilisateur
export async function getUserEmailVerificationRequest(
	userId: string,
	id: string
): Promise<EmailVerificationRequest | null> {
	// Validation de l'identifiant
	if (!ObjectId.isValid(id)) {
		throw new Error('Invalid email verification request ID');
	}

	const request = await findEmailVerificationRequest(id, userId);

	if (!request) {
		return null;
	}

	return {
		id: request.id,
		userId: request.userId,
		code: request.code,
		email: request.email,
		expiresAt: request.expiresAt
	};
}

// Crée une nouvelle requête de vérification d'email
export async function createEmailVerificationRequest(
	userId: string,
	email: string
): Promise<EmailVerificationRequest> {
	// Supprime les requêtes existantes pour éviter les doublons
	await deleteUserEmailVerificationRequest(userId);

	// Génération d'un nouvel identifiant
	const id = new ObjectId().toString(); // Utilisation d'un ObjectId valide
	const code = generateRandomOTP();
	const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // Expiration dans 10 minutes

	const request = await createEmailVerificationRequestPrisma({
		id,
		userId,
		code,
		email,
		expiresAt
	});

	return {
		id: request.id,
		userId: request.userId,
		code: request.code,
		email: request.email,
		expiresAt: request.expiresAt
	};
}

// Supprime toutes les requêtes de vérification d'email pour un utilisateur
export async function deleteUserEmailVerificationRequest(userId: string): Promise<void> {
	await deleteEmailVerificationRequestsByUserId(userId);
}

function logEmail(...args: unknown[]) {
	console.log('[email-verification]', ...args);
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
	logEmail('sendVerificationEmail called', { email, codeLength: code?.length });

	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT || '587';
	const user = process.env.SMTP_USER;
	const hasPass = Boolean(process.env.SMTP_PASS);

	if (!host || !user || !hasPass) {
		logEmail('SMTP config missing:', {
			hasHost: Boolean(host),
			hasUser: Boolean(user),
			hasPass
		});
		throw new Error('Email sending failed: SMTP configuration incomplete (SMTP_HOST, SMTP_USER, SMTP_PASS)');
	}

	// Configuration du transporteur SMTP avec Brevo
	const transporter = nodemailer.createTransport({
		host,
		port: parseInt(port, 10),
		secure: false, // STARTTLS
		auth: {
			user,
			pass: process.env.SMTP_PASS
		},
		logger: true,
		debug: true
	});

	logEmail('Transporter created', { host, port: parseInt(port, 10) });

	try {
		const mailOptions = {
			from: '"Thower" <contact@thower.com>',
			to: email,
			subject: 'Your Verification Code',
			text: `Your verification code is: ${code}`,
			html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Thower - Verification Code</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Inline styling for a simple responsive design -->
  <style>
    /* Reset some default email client styles */
    body {
      margin: 0;
      padding: 0;
      background-color: #f6f6f6;
      font-family: Arial, sans-serif;
    }
    table {
      border-collapse: collapse;
      margin: 0 auto;
    }
    img {
      display: block;
      margin: 0 auto;
      max-width: 180px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      width: 600px;
      max-width: 95%;
      margin: 20px auto;
      padding: 20px;
      text-align: center;
    }
    .title {
      font-size: 24px;
      color: #333333;
      margin-bottom: 20px;
    }
    .code {
      font-size: 28px;
      font-weight: bold;
      color: #e3342f; /* Adjust color to match your branding */
      margin: 20px 0;
    }
    .footer {
      font-size: 14px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <!-- Outer table to center everything -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 20px;">
        <!-- Logo at the top -->
        <img src="https://example.com/logo.png" alt="Thower Logo" />

        <!-- Main email container -->
        <div class="container">
          <h1 class="title">Your Verification Code</h1>
          <p>Thank you for using Thower! Please use the verification code below to complete your signup process:</p>
          <p class="code">${code}</p>
          <p>This code will expire in 10 minutes.</p>
          
          <div class="footer">
            <p>If you did not request this code, please ignore this email.</p>
            <p>— The Thower Team</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
		};

		// Envoi de l'e-mail
		logEmail('Sending mail to', email);
		const info = await transporter.sendMail(mailOptions);
		logEmail('Email sent successfully', { to: email, messageId: info.messageId, response: info.response });
	} catch (error) {
		logEmail('Failed to send email:', error);
		console.error('[email-verification] send error details:', error);
		throw new Error('Email sending failed');
	}
}

// Définit un cookie pour la requête de vérification d'email
export function setEmailVerificationRequestCookie(
	event: RequestEvent,
	request: EmailVerificationRequest
): void {
	event.cookies.set('email_verification', request.id, {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		expires: request.expiresAt
	});
}

// Supprime le cookie de la requête de vérification d'email
export function deleteEmailVerificationRequestCookie(event: RequestEvent): void {
	event.cookies.set('email_verification', '', {
		httpOnly: true,
		path: '/',
		secure: import.meta.env.PROD,
		sameSite: 'lax',
		maxAge: 0
	});
}

// Récupère une requête de vérification d'email à partir des cookies
export async function getUserEmailVerificationRequestFromRequest(
	event: RequestEvent
): Promise<EmailVerificationRequest | null> {
	if (event.locals.user === null) {
		return null;
	}

	const id = event.cookies.get('email_verification') ?? null;
	if (!id || !ObjectId.isValid(id)) {
		return null;
	}

	const request = await getUserEmailVerificationRequest(event.locals.user.id, id);
	if (!request) {
		deleteEmailVerificationRequestCookie(event);
	}

	return request;
}

// Limiteur de taux pour l'envoi des emails de vérification
export const sendVerificationEmailBucket = new ExpiringTokenBucket<string>(3, 60 * 10);
