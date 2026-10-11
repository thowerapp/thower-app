import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSchemaIndexes } from './schemaIndexes';

const SAMPLE = `
model User {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  email  String @unique
  name   String? // commentaire @unique ignoré
}

type MealComplement {
  name String
}

model UserWorkoutDay {
  id        String @id @default(auto()) @map("_id") @db.ObjectId
  userId    String @db.ObjectId
  sessionId String @db.ObjectId
  dayIndex  Int

  @@unique([userId, sessionId, dayIndex])
  @@index([userId, dayIndex])
  @@map("user_workout_days")
}
`;

describe('parseSchemaIndexes', () => {
	it('déduit collections et index avec les noms de prisma db push', () => {
		expect(parseSchemaIndexes(SAMPLE)).toEqual([
			{ name: 'User', indexes: [{ name: 'User_email_key', key: { email: 1 }, unique: true }] },
			{
				name: 'user_workout_days',
				indexes: [
					{
						name: 'user_workout_days_userId_sessionId_dayIndex_key',
						key: { userId: 1, sessionId: 1, dayIndex: 1 },
						unique: true
					},
					{ name: 'user_workout_days_userId_dayIndex_idx', key: { userId: 1, dayIndex: 1 } }
				]
			}
		]);
	});

	it('retrouve les index affichés par db push sur le vrai schéma', () => {
		const schema = readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
		const names = parseSchemaIndexes(schema).flatMap((c) => c.indexes.map((i) => i.name));
		// Relevés dans la sortie de `prisma db push`.
		for (const expected of [
			'User_email_key',
			'transactions_stripePaymentId_key',
			'workout_videos_cloudflareUid_idx',
			'discovery_contents_cloudflareUid_key',
			'daily_task_completions_userId_taskId_date_key',
			'monthly_checkins_userId_month_key',
			'push_subscriptions_userId_endpoint_key'
		]) {
			expect(names).toContain(expected);
		}
	});
});
