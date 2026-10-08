export interface BusinessHours { days: number[]; start: string; end: string; mealPeriods: string[] }
export interface Dish { id: string; restaurantId: string; name: string; price: number; cuisine: string; flavors: string[]; ingredients: string[] | null; dietaryWarnings: string[]; mealPeriods: string[]; description: string | null }
export interface Restaurant { id: string; name: string; canteenName: string; location: string; cuisines: string[]; flavors: string[]; averagePrice: number; distanceMeters: number; rating: number | null; openNow: boolean; description: string | null }
export interface RestaurantDetail extends Restaurant { businessHours: BusinessHours[]; dietaryWarnings: string[]; dishIds: string[]; dishes: Dish[] }
export interface DishDetail extends Dish { restaurant: Restaurant | null }
export interface Reason { type: string; text: string }
export interface Recommendation extends Restaurant { type: 'restaurant'; score: number; reasons: Reason[] }
export interface Options { flavors: string[]; cuisines: string[]; dietaryWarnings: string[]; mealPeriods: string[] }
export interface Preferences { maxPrice?: number; flavors?: string[]; maxDistance?: number; minRating?: number; mealPeriod?: string; avoid?: string[]; openNow?: boolean }
export interface RestaurantListResponse { data: Restaurant[]; meta: { total: number; distanceReference: string } }
export interface RecommendationResponse { data: Recommendation[]; meta: { total: number } }
