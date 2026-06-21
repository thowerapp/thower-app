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
	emailVerified?: boolean;
	isMfaEnabled?: boolean;
	subscriptionEndsAt?: string | null;
	nutritionDaysAllocated?: number;
	programStartDate?: string | null;
	programPausedAt?: string | null;
	programPausedReason?: string | null;
	photoValidationStatus?: 'PENDING' | 'VALIDATED';
	photoValidatedAt?: string | null;
	profile?: UserProfileSelected | null;
	bodyMeasurements?: BodyMeasurementSelected[];
	transactions?: TransactionSelected[];
	sessions?: SessionSelected[];
	workoutDays?: WorkoutDaySelected[];
	pointEvents?: PointEventSelected[];
	progressPhotos?: ProgressPhotoSelected[];
	userBadges?: UserBadgeSelected[];
	favoriteRecipes?: UserFavoriteRecipeSelected[];
	recipes?: RecipeSelected[];
	nutritionDays?: NutritionDaySelected[];
	shoppingLists?: ShoppingListSelected[];
	dailyTaskCompletions?: DailyTaskCompletionSelected[];
	dailyTaskOptOuts?: DailyTaskOptOutSelected[];
	videoProgress?: UserVideoProgressSelected[];
	monthlyCheckIns?: MonthlyCheckInSelected[];
	programDayItemCompletions?: ProgramDayItemCompletionSelected[];
	pushSubscriptions?: PushSubscriptionSelected[];
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
	bodyFatPercent?: number | null;
	weightLossGoalKg?: number | null;
	intermittentFastingMorning?: boolean | null;
	sportActivity?: string | null;
	familyCoefficients?: Array<{ label: string; coefficient: number }> | null;
	shoppingListSortOrder?: string | null;
	stressLevel?: number | null;
	sleepQuality?: number | null;
	bodyConfidence?: number | null;
	digestionQuality?: number | null;
	happinessLevel?: number | null;
	readinessToChange?: number | null;
	kitchenEquipment?: string[];
	disgustingFoods?: string | null;
	otherAllergens?: string | null;
	physicalObjective?: string | null;
	eventMotivation?: string | null;
	addictionsText?: string | null;
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

export interface SessionSelected {
	id: string;
	expiresAt: string;
	twoFactorVerified?: boolean;
	oauthProvider?: string | null;
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

export interface UserFavoriteRecipeSelected {
	id: string;
	recipeId: string;
	createdAt: string;
	recipe?: { id: string; name: string } | null;
}

export interface RecipeSelected {
	id: string;
	name: string;
}

export interface NutritionDaySelected {
	id: string;
	dayIndex: number;
	intermittentFasting?: boolean;
	meals?: Array<{
		id: string;
		position: string;
		recipeId?: string | null;
		eatenAt?: string | null;
		quantityG?: number | null;
		calcProteinG?: number | null;
		calcCarbsG?: number | null;
		calcFatG?: number | null;
		calcCalories?: number | null;
		calcFiberG?: number | null;
		isManual?: boolean;
		manualProteinG?: number | null;
		manualCarbsG?: number | null;
		manualFatG?: number | null;
		manualCalories?: number | null;
		manualFiberG?: number | null;
		recipe?: { name: string } | null;
	}>;
}

export interface ShoppingListSelected {
	id: string;
	startDayIndex: number;
	endDayIndex: number;
	generatedAt: string;
	items?: ShoppingItemSelected[];
}

export interface ShoppingItemSelected {
	id: string;
	ingredientName: string;
	category?: string | null;
	totalQuantityG: number;
	unit?: string | null;
	isChecked?: boolean;
	isReported?: boolean;
	sources?: unknown;
}

export interface DailyTaskCompletionSelected {
	id: string;
	taskId?: string;
	date: string;
	completedAt: string;
	task?: { label: string } | null;
}

export interface DailyTaskOptOutSelected {
	id: string;
	taskId: string;
	task?: { label: string } | null;
}

export interface UserVideoProgressSelected {
	id: string;
	workoutVideoId?: string | null;
	discoveryContentId?: string | null;
	maxPositionSec: number;
	lastHeartbeatAt: string;
	completedAt?: string | null;
	workoutVideo?: { title?: string | null } | null;
	discoveryContent?: { title?: string | null } | null;
}

export interface MonthlyCheckInSelected {
	id: string;
	month: number;
	stressLevel?: number | null;
	sleepQuality?: number | null;
	bodyConfidence?: number | null;
	digestionQuality?: number | null;
	happinessLevel?: number | null;
	readinessToChange?: number | null;
	pointsAwarded?: boolean;
	nutritionRecalibrated?: boolean;
	submittedAt: string;
}

export interface ProgramDayItemCompletionSelected {
	id: string;
	programDayItemId: string;
	completedAt: string;
	stepsValue?: number | null;
	item?: { label?: string | null; type?: string; points?: number; order?: number } | null;
}

export interface PushSubscriptionSelected {
	id: string;
	endpoint: string;
	createdAt: string;
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

export interface AdminUserOptions {
	recipeCatalog?: Array<{ id: string; name: string; category?: string; isCustom?: boolean }>;
	dailyTasks?: Array<{ id: string; label: string; points?: number; active?: boolean }>;
	badges?: Array<{ id: string; name: string; slug: string }>;
	programDayItems?: Array<{ id: string; type?: string; label?: string | null; points?: number; order?: number }>;
	adminChallenges?: Array<{ id: string; name: string; active?: boolean }>;
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
