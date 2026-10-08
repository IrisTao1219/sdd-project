import { z } from 'zod';

const businessHoursSchema = z.object({
  days: z.array(z.number().int().min(1).max(7)),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  mealPeriods: z.array(z.string())
});

export const restaurantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  canteenName: z.string().min(1),
  location: z.string().min(1),
  cuisines: z.array(z.string()),
  flavors: z.array(z.string()),
  averagePrice: z.number().nonnegative(),
  businessHours: z.array(businessHoursSchema),
  distanceMeters: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5).nullable(),
  dietaryWarnings: z.array(z.string()),
  dishIds: z.array(z.string()),
  description: z.string().nullable()
});

const dishSchema = z.object({
  id: z.string().min(1),
  restaurantId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  cuisine: z.string().min(1),
  flavors: z.array(z.string()),
  ingredients: z.array(z.string()).nullable(),
  dietaryWarnings: z.array(z.string()),
  mealPeriods: z.array(z.string()),
  description: z.string().nullable()
});

export const campusFoodDataSchema = z.object({
  meta: z.object({
    version: z.string(),
    updatedAt: z.string(),
    timezone: z.string(),
    currency: z.string(),
    distanceReference: z.string(),
    distanceUnit: z.string()
  }),
  restaurants: z.array(restaurantSchema),
  dishes: z.array(dishSchema)
});

export type CampusFoodData = z.infer<typeof campusFoodDataSchema>;
export type Restaurant = z.infer<typeof restaurantSchema>;
