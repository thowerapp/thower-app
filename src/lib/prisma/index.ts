// Offres
export { getActiveOffers, type OfferRow } from './offer/getActiveOffers';

// Programme 91 jours
export { getProgram } from './program/getProgram';
export { getProgramDayWithItems } from './program/getProgramDayWithItems';
export { createProgramDayItem, type CreateProgramDayItemData } from './program/createProgramDayItem';
export { updateProgramDayItem, type UpdateProgramDayItemData } from './program/updateProgramDayItem';
export { createProgramDayItemCompletion, type CreateCompletionData } from './programDayCompletion/createCompletion';
export { getCompletionsForUserAndDay } from './programDayCompletion/getCompletionsForUserAndDay';
export { getPopupsForDay } from './dayPopup/getPopupsForDay';

// Sport
export { getActiveSessions } from './workoutSession/getActiveSessions';
export { getSessionWithVideos } from './workoutSession/getSessionWithVideos';
export { getWorkoutDaysByUserId } from './userWorkoutDay/getByUserId';
export { assignSessionToDay, type AssignSessionToDayData } from './userWorkoutDay/assignSessionToDay';
export { setWorkoutDayCompleted } from './userWorkoutDay/setCompleted';
export { markVideoWatched } from './userVideoWatch/markWatched';
export { getWatchedVideoIdsForUser } from './userVideoWatch/getWatchedIdsForUser';

// Nutrition
export { getRecipesByUserIdOrCatalog, type GetRecipesOptions } from './recipe/getByUserIdOrCatalog';
export { createRecipe, type CreateRecipeData } from './recipe/createRecipe';
export { updateRecipe, type UpdateRecipeData } from './recipe/updateRecipe';
export { addFavoriteRecipe } from './userFavoriteRecipe/addFavorite';
export { removeFavoriteRecipe } from './userFavoriteRecipe/removeFavorite';
export { getFavoriteRecipeIds } from './userFavoriteRecipe/getFavoriteIds';
export { getOrCreateNutritionDay } from './nutritionDay/getOrCreateNutritionDay';
export { getMealsForNutritionDay } from './nutritionDay/getMealsForDay';
export { upsertMeal, type UpsertMealData } from './nutritionDay/upsertMeal';

// Liste de courses
export { getCurrentShoppingList } from './shoppingList/getCurrentList';
export { toggleShoppingItemChecked } from './shoppingList/toggleItemChecked';
export {
	generateShoppingListFromPlanning,
	type GenerateShoppingListOptions
} from './shoppingList/generateFromPlanning';
export {
	regenerateShoppingListsOverlappingDay,
	regenerateShoppingListsForRecipe
} from './shoppingList/regenerateOverlappingDay';

// Gamification
export { createPointEvent, type CreatePointEventData } from './pointEvent/createEvent';
export { getTotalPointsForUser } from './pointEvent/getTotalPointsForUser';
export { getActiveRewards } from './pointReward/getActiveRewards';
export { getBadges } from './badge/getBadges';
export { getUserBadges } from './badge/getUserBadges';

// Ligne directrice
export { getActiveTasks } from './dailyTask/getActiveTasks';
export { optOutOfDailyTask } from './userDailyTaskOptOut/optOut';
export { getDailyTaskOptOutIds } from './userDailyTaskOptOut/getOptOutIds';
export { completeDailyTask } from './dailyTaskCompletion/completeTask';

// Découverte
export { getDiscoveryContentByCategory } from './discoveryContent/getByCategory';
export { markDiscoveryWatched } from './userDiscoveryWatch/markWatched';

// Progression
export { createProgressPhoto, type CreateProgressPhotoData } from './progressPhoto/createProgressPhoto';
export { getProgressPhotosByUserAndMonth } from './progressPhoto/getByUserAndMonth';

// Défis admin
export { getActiveChallenges } from './adminChallenge/getActiveChallenges';
export { joinChallenge } from './adminChallenge/joinChallenge';

// Push
export { getPushSubscriptionsByUserId } from './pushSubscription/getByUserId';
export { createOrUpdatePushSubscription, type CreateOrUpdatePushSubscriptionData } from './pushSubscription/createOrUpdate';
export { deletePushSubscriptionByEndpoint } from './pushSubscription/deleteByEndpoint';

// Profil & mensurations
export { getProfileByUserId, type UserProfileSnapshot } from './profile/getProfileByUserId';
export { upsertProfile, type UpsertProfileData } from './profile/upsertProfile';
export { getBodyMeasurementsByUserId, type BodyMeasurementSnapshot } from './bodyMeasurement/getBodyMeasurementsByUserId';
export { createBodyMeasurement, type CreateBodyMeasurementData } from './bodyMeasurement/createBodyMeasurement';

// Transaction
export { createTransactionFromStripeSession, type CreateTransactionData } from './transaction/createTransactionFromStripeSession';
export { getTransactionById } from './transaction/getTransactionById';
export { getTransactionsByUserId } from './transaction/getTransactionsByUserId';
export { getHasValidPaymentByUserId } from './transaction/getHasValidPaymentByUserId';
export { getAllTransactions } from './transaction/getAllTransactions';
export { getAllTransactionsDashboard } from './transaction/getAllTransactionsDashboard';
