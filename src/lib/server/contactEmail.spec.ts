import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.hoisted(() => vi.fn());
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { sendContactNotificationEmail } from './contactEmail';

const payload = { name: 'Alice <b>', email: 'alice@test.local', subject: 'Sujet', message: 'Bonjour & merci' };
const saved = { ...process.env };

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	sendMail.mockReset();
	Object.assign(process.env, {
		CONTACT_NOTIFICATION_EMAIL: 'equipe@test.local',
		SMTP_HOST: 'smtp.test',
		SMTP_USER: 'u',
		SMTP_PASS: 'p'
	});
});

afterEach(() => {
	process.env = { ...saved };
	vi.restoreAllMocks();
});

describe('notification du formulaire de contact', () => {
	it('n’envoie rien sans destinataire configuré', async () => {
		delete process.env.CONTACT_NOTIFICATION_EMAIL;
		await sendContactNotificationEmail(payload);
		expect(sendMail).not.toHaveBeenCalled();
	});

	it('n’envoie rien sans configuration SMTP complète', async () => {
		delete process.env.SMTP_PASS;
		await sendContactNotificationEmail(payload);
		expect(sendMail).not.toHaveBeenCalled();
	});

	it('envoie le message avec le sujet, en échappant le HTML', async () => {
		await sendContactNotificationEmail(payload);
		const mail = sendMail.mock.calls[0][0];
		expect(mail).toMatchObject({ to: 'equipe@test.local', subject: '[Contact Thower] Sujet' });
		expect(mail.html).toContain('Alice &lt;b&gt;');
		expect(mail.html).toContain('Bonjour &amp; merci');
		expect(mail.text).toContain('Sujet: Sujet');
	});

	it('utilise un sujet par défaut et signale un échec d’envoi', async () => {
		await sendContactNotificationEmail({ ...payload, subject: ' ' });
		expect(sendMail.mock.calls[0][0].subject).toBe('[Contact Thower] Nouveau message');
		sendMail.mockRejectedValueOnce(new Error('refusé'));
		await expect(sendContactNotificationEmail(payload)).rejects.toThrow('Envoi de la notification email impossible');
	});
});
