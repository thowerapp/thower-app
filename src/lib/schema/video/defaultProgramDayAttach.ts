import type { AttachDaySchema } from '$lib/schema/video/attachDaySchema';
import type { VideoKind } from '$lib/schema/video/videoAdminSchema';

/** Valeurs par défaut pour l’UI de rattachement programme (création / édition). */
export function defaultProgramDayAttach(
	kind: VideoKind,
	category: string | null | undefined
): AttachDaySchema {
	if (kind === 'workout') {
		return { dayIndex: 1, type: 'SPORT_SESSION', points: 10, label: null };
	}
	if (category === 'BREATHWORK') {
		return { dayIndex: 1, type: 'BREATHWORK', points: 10, label: null };
	}
	if (category === 'MINDSET') {
		return { dayIndex: 1, type: 'MINDSET_VIDEO', points: 10, label: null };
	}
	return { dayIndex: 1, type: 'VIDEO_OF_DAY', points: 10, label: null };
}
