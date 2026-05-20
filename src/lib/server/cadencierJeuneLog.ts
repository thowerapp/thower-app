/** Logs jeûne intermittent cadencier — toujours actifs (Vercel / terminal). */
export function cadencierJeuneLog(
	event: string,
	payload: Record<string, unknown>
): void {
	console.log(
		'[cadencier-jeune]',
		JSON.stringify({ ts: new Date().toISOString(), event, ...payload })
	);
}
