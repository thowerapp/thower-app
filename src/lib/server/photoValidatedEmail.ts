import nodemailer from 'nodemailer';

/**
 * Envoie un email de notification à l'utilisateur pour confirmer que ses photos
 * ont été validées et que son profil est prêt à être rempli.
 */
export async function sendPhotoValidatedEmail(payload: {
	userEmail: string;
	userName?: string | null;
}): Promise<void> {
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT || '587';
	const user = process.env.SMTP_USER;
	const hasPass = Boolean(process.env.SMTP_PASS);

	if (!host || !user || !hasPass) {
		console.warn('[photoValidatedEmail] Config SMTP incomplète, notification non envoyée.');
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

	const subject = 'Vos données sont prêtes — Commencez votre programme';
	const greeting = payload.userName ? `Bonjour ${payload.userName}` : 'Bonjour';

	const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #00e5ff;">${greeting},</h2>
  <p>Vos photos ont été analysées avec succès par notre équipe.</p>
  <p>Votre profil est maintenant prêt à être complété. Vous pouvez accéder à votre formulaire personnalisé et commencer votre programme d'entraînement.</p>
  <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
    <a href="${process.env.PUBLIC_URL ?? 'https://thower.app'}/auth/measurement" style="
      display: inline-block;
      padding: 14px 28px;
      background: #00e5ff;
      color: #0d0d0d;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
    ">Accéder à mon formulaire</a>
  </div>
  <p style="margin-top: 30px; color: #666; font-size: 12px;">
    Si vous n'avez pas demandé cette notification, veuillez contacter notre support.
  </p>
</body>
</html>`;

	const text = `${greeting},\n\nVos photos ont été analysées avec succès par notre équipe.\nVotre profil est maintenant prêt à être complété. Accédez à votre formulaire pour commencer votre programme.\n\n${process.env.PUBLIC_URL ?? 'https://thower.app'}/auth/measurement`;

	try {
		await transporter.sendMail({
			from: process.env.SMTP_FROM ?? '"Thower" <noreply@thower.com>',
			to: payload.userEmail,
			subject,
			text,
			html
		});
		console.log('[photoValidatedEmail] Email envoyé à', payload.userEmail);
	} catch (err) {
		console.error('[photoValidatedEmail] Échec envoi:', err);
		// Ne pas lever l'erreur : l'admin a déjà validé, le user verra le statut changé au prochain refresh
	}
}
