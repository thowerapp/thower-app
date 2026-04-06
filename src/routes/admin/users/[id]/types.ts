/** Type des données utilisateur chargées côté admin (sérialisées) */
export interface UserSelected {
	id?: string;
	email?: string;
	username?: string | null;
	name?: string | null;
	picture?: string | null;
	role?: string;
	createdAt?: string;
	googleId?: string | null;
	subscriptionEndsAt?: string | null;
	programStartDate?: string | null;
	programPausedAt?: string | null;
	programPausedReason?: string | null;
	profile?: UserProfileSelected | null;
	bodyMeasurements?: BodyMeasurementSelected[];
	transactions?: TransactionSelected[];
	workoutDays?: WorkoutDaySelected[];
	pointEvents?: PointEventSelected[];
	progressPhotos?: ProgressPhotoSelected[];
	userBadges?: UserBadgeSelected[];
	recipes?: RecipeSelected[];
	nutritionDays?: NutritionDaySelected[];
	shoppingLists?: ShoppingListSelected[];
	dailyTaskCompletions?: DailyTaskCompletionSelected[];
	challenges?: UserChallengeSelected[];
}

export interface UserProfileSelected {
	activityLevel?: string | null;
	objectives?: string[];
	painsPathologies?: string | null;
	contextParticular?: string | null;
	breadDaily?: boolean;
	breadGramsPerDay?: number | null;
	breadType?: string | null;
	breadManagement?: string | null;
	allergens?: string[];
	coffeePerDay?: number | null;
	alcoholHabit?: boolean | null;
	tobaccoHabit?: boolean | null;
	breakfastEnabled?: boolean;
	intermittentFastingMorning?: boolean | null;
	sportActivity?: string | null;
	familyCoefficients?: Array<{ label: string; coefficient: number }> | null;
	shoppingListSortOrder?: string | null;
	updatedAt?: string;
}

export interface BodyMeasurementSelected {
	id: string;
	createdAt: string;
	age?: number | null;
	heightCm?: number | null;
	weightKg?: number | null;
	waistCm?: number | null;
	chestCm?: number | null;
	armCm?: number | null;
}

export interface TransactionSelected {
	id: string;
	stripePaymentId: string;
	amount: number;
	currency: string;
	status: string;
	offerSlugs?: string[];
	createdAt: string;
}

export interface WorkoutDaySelected {
	id: string;
	dayIndex: number;
	scheduledDate?: string | null;
	completedAt?: string | null;
	isLocked: boolean;
	session?: { name: string } | null;
}

export interface PointEventSelected {
	id: string;
	type: string;
	amount: number;
	metadata?: Record<string, unknown> | null;
	createdAt: string;
}

export interface ProgressPhotoSelected {
	id: string;
	angle: string;
	url: string;
	month: number;
	uploadedAt: string;
}

export interface UserBadgeSelected {
	id: string;
	progress: number;
	unlockedAt?: string | null;
	badge?: { name: string; slug: string; description?: string | null };
}

export interface RecipeSelected {
	id: string;
	name: string;
}

export interface NutritionDaySelected {
	id: string;
	dayIndex: number;
	intermittentFasting?: boolean;
	meals?: Array<{ position: string; recipe?: { name: string } | null }>;
}

export interface ShoppingListSelected {
	id: string;
	startDayIndex: number;
	endDayIndex: number;
	generatedAt: string;
}

export interface DailyTaskCompletionSelected {
	id: string;
	date: string;
	completedAt: string;
}

export interface UserChallengeSelected {
	id: string;
	joinedAt: string;
	completedAt?: string | null;
	challenge?: {
		name: string;
		description?: string | null;
		durationDays: number;
		bonusPoints: number;
		startAt: string;
		endAt: string;
		active: boolean;
	};
}

export const MONTH_NAMES = [
	'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
	'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function fmtDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleString('fr-FR');
}

export function fmtDateShort(iso: string | null | undefined): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString('fr-FR');
}
