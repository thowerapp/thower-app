// Auth
export { signupSchema, type SignupForm } from './auth/signupSchema';
export { loginSchema, type LoginForm } from './auth/loginSchema';
export { forgotPasswordSchema, type ForgotPasswordForm } from './auth/forgotPasswordSchema';
export { resetPasswordSchema } from './auth/resetPasswordSchema';
export { recoveryCodeSchema, type recoveryCodeForm } from './auth/recoveryCodeSchema';
export { verifyCodeSchema, type verifyCodeForm } from './auth/verifyCodeSchema';
export { totpSchema, type totpForm } from './auth/totpSchema';
export { totpCodeSchema, type totpCodeForm } from './auth/totpCodeSchema';
export { emailSchema, passwordSchema } from './auth/settingsSchemas';

// Contact
export { contactSchema, deleteContactSchema, type ContactForm, type DeleteContactForm } from './contact/contactSchema';

// Measurement & Profil
export {
	measurementSchema,
	activityLevelEnum,
	objectiveValues,
	type MeasurementSchema
} from './measurement/measurementSchema';
export {
	profileSchema,
	shoppingListSortOrderEnum,
	familyCoefficientItemSchema,
	type ProfileSchema
} from './profile/profileSchema';

// Users
export { updateUserSchema, deleteUserSchema, adminUpdateUserSchema, type UpdateUser, type DeleteUser, type AdminUpdateUser } from './users/userSchema';
export { isMfaEnabledSchema, type isMfaEnabled } from './users/MfaEnabledSchema';

// Programme 91 jours
export {
	programDayItemSchema,
	programDayItemTypeEnum,
	type ProgramDayItemSchema
} from './program/programDayItemSchema';

// Recettes
export { recipeSchema, recipeCategoryEnum, type RecipeSchema } from './recipe/recipeSchema';
export { recipeIngredientSchema, type RecipeIngredientSchema } from './recipe/recipeIngredientSchema';

// Nutrition
export { mealSchema, mealPositionEnum, type MealSchema } from './nutrition/mealSchema';
export { nutritionDaySchema, type NutritionDaySchema } from './nutrition/nutritionDaySchema';

// Liste de courses
export { shoppingListSchema, type ShoppingListSchema } from './shopping/shoppingListSchema';

// Gamification
export { pointEventSchema, pointEventTypeEnum, type PointEventSchema } from './gamification/pointEventSchema';
export { pointRewardSchema, type PointRewardSchema } from './gamification/pointRewardSchema';

// Ligne directrice
export { dailyTaskSchema, type DailyTaskSchema } from './dailyTask/dailyTaskSchema';

// Découverte
export {
	discoveryContentSchema,
	discoveryCategoryEnum,
	type DiscoveryContentSchema
} from './discovery/discoveryContentSchema';

// Sport
export {
	workoutSessionSchema,
	workoutSessionTypeEnum,
	type WorkoutSessionSchema
} from './workout/workoutSessionSchema';
export {
	workoutVideoSchema,
	workoutVideoPositionEnum,
	type WorkoutVideoSchema
} from './workout/workoutVideoSchema';
