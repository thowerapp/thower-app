import nodemailer from 'nodemailer';

/**
 * Envoie une notification par email lorsqu'un message est soumis via le formulaire de contact.
 * Utilise la même config SMTP que le reste du projet (ex. Brevo).
 *
 * Variable d'environnement : CONTACT_NOTIFICATION_EMAIL = adresse qui reçoit les messages.
 * Si absente, l'envoi est ignoré (le message est quand même enregistré en base).
 */
export async function sendContactNotificationEmail(payload: {
	name: string;
	email: string;
	subject?: string | null;
	message: string;
}): Promise<void> {
	const to = process.env.CONTACT_NOTIFICATION_EMAIL;
	if (!to?.trim()) {
		console.warn('[contactEmail] CONTACT_NOTIFICATION_EMAIL non défini, notification non envoyée.');
		return;
	}

	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT || '587';
	const user = process.env.SMTP_USER;
	const hasPass = Boolean(process.env.SMTP_PASS);

	if (!host || !user || !hasPass) {
		console.warn('[contactEmail] Config SMTP incomplète, notification non envoyée.');
		return;
	}

	const transporter = nodemailer.createTransport({
		host,
		port: parseInt(port, 10),
		secure: false,
		auth: {
			user,
			pass: process.env.SMTP_PASS
		}
	});

	const subjectLine = payload.subject?.trim()
		? `[Contact Thower] ${payload.subject}`
		: '[Contact Thower] Nouveau message';

	const text = [
		`Nom: ${payload.name}`,
		`Email: ${payload.email}`,
		payload.subject?.trim() ? `Sujet: ${payload.subject}` : null,
		'',
		'Message:',
		payload.message
	]
		.filter(Boolean)
		.join('\n');

	const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Nouveau message depuis le formulaire de contact</h2>
  <p><strong>Nom :</strong> ${escapeHtml(payload.name)}</p>
  <p><strong>Email :</strong> <a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></p>
  ${payload.subject?.trim() ? `<p><strong>Sujet :</strong> ${escapeHtml(payload.subject)}</p>` : ''}
  <p><strong>Message :</strong></p>
  <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${escapeHtml(payload.message)}</div>
</body>
</html>`;

	try {
		await transporter.sendMail({
			from: process.env.SMTP_FROM ?? '"Thower Contact" <noreply@thower.com>',
			to,
			subject: subjectLine,
			text,
			html
		});
	} catch (err) {
		console.error('[contactEmail] Échec envoi:', err);
		throw new Error('Envoi de la notification email impossible');
	}
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
