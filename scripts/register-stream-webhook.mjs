#!/usr/bin/env node
/**
 * Enregistre l’URL de notification Cloudflare Stream et affiche le secret à mettre
 * dans CLOUDFLARE_STREAM_WEBHOOK_SECRET.
 *
 * Prérequis : CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN, CLOUDFLARE_STREAM_WEBHOOK_URL
 * (URL HTTPS publique, ex. https://votre-domaine.com/api/cloudflare/stream/webhook)
 *
 * Usage : node scripts/register-stream-webhook.mjs
 */

import process from 'node:process';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const notificationUrl = process.env.CLOUDFLARE_STREAM_WEBHOOK_URL;

if (!accountId || !token || !notificationUrl) {
	console.error(
		'Usage: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN et CLOUDFLARE_STREAM_WEBHOOK_URL requis.'
	);
	process.exit(1);
}

if (!notificationUrl.startsWith('http://') && !notificationUrl.startsWith('https://')) {
	console.error('CLOUDFLARE_STREAM_WEBHOOK_URL doit commencer par http:// ou https://');
	process.exit(1);
}

if (notificationUrl.startsWith('http://') && !notificationUrl.includes('localhost')) {
	console.warn('Attention: Cloudflare recommande https pour les webhooks (sauf tests locaux via tunnel).');
}

const res = await fetch(
	`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/webhook`,
	{
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ notificationUrl })
	}
);

const body = await res.json().catch(() => ({}));

if (!res.ok) {
	console.error('Erreur API:', res.status, JSON.stringify(body, null, 2));
	process.exit(1);
}

const result = body?.result;
console.log('Webhook enregistré :');
console.log('  notificationUrl :', result?.notificationUrl);
console.log('  secret (à copier dans CLOUDFLARE_STREAM_WEBHOOK_SECRET) :', result?.secret);
console.log('  modified         :', result?.modified);
