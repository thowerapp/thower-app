import { describe, expect, it } from 'vitest';
import { defaultProgramDayAttach } from './defaultProgramDayAttach';

describe('defaultProgramDayAttach', () => {
	it('propose le type de rattachement selon la vidéo', () => {
		expect(defaultProgramDayAttach('workout', null).type).toBe('SPORT_SESSION');
		expect(defaultProgramDayAttach('discovery', 'BREATHWORK').type).toBe('BREATHWORK');
		expect(defaultProgramDayAttach('discovery', 'MINDSET').type).toBe('MINDSET_VIDEO');
		expect(defaultProgramDayAttach('discovery', 'MOTIVATION').type).toBe('VIDEO_OF_DAY');
		expect(defaultProgramDayAttach('discovery', undefined)).toEqual({ dayIndex: 1, type: 'VIDEO_OF_DAY', points: 10, label: null });
	});
});
