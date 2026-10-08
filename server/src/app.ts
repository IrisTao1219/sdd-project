import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { z, ZodError } from 'zod';
import { isRestaurantOpenNow } from './open-now.js';
import { loadCampusFoodData } from './repository.js';
import type { CampusFoodData, Restaurant } from './schema.js';

const mealPeriods = ['breakfast', 'lunch', 'dinner', 'late_night'] as const;
const sortValues = ['distance_asc', 'rating_desc', 'price_asc'] as const;
const csv = z.preprocess((value) => typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : value, z.array(z.string()).optional());
const booleanParam = z.preprocess((value) => value === 'true' ? true : value === 'false' || value === undefined ? false : value, z.boolean());
const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional().default(''),
  maxPrice: z.coerce.number().nonnegative().max(500).optional(),
  flavors: csv,
  maxDistance: z.coerce.number().nonnegative().max(100000).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  openNow: booleanParam,
  mealPeriod: z.enum(mealPeriods).optional(),
  avoid: csv,
  sort: z.enum(sortValues).optional()
});
const recommendationSchema = z.object({
  maxPrice: z.number().nonnegative().max(500).optional(), flavors: z.array(z.string()).optional(),
  maxDistance: z.number().nonnegative().max(100000).optional(), minRating: z.number().min(0).max(5).optional(),
  mealPeriod: z.enum(mealPeriods).optional(), avoid: z.array(z.string()).optional(), openNow: z.boolean().optional()
}).refine((value) => Object.values(value).some((item) => Array.isArray(item) ? item.length > 0 : item !== undefined && item !== false), { message: '请至少选择或输入一项偏好' });

type ListQuery = z.infer<typeof listQuerySchema>;
type Preference = z.infer<typeof recommendationSchema>;
const hasIntersection = (left: string[], right: string[] = []) => left.some((item) => right.includes(item));
const matchesMealPeriod = (restaurant: Restaurant, mealPeriod?: string) => !mealPeriod || restaurant.businessHours.some((hours) => hours.mealPeriods.includes(mealPeriod));
function searchableText(restaurant: Restaurant, source: CampusFoodData) {
  const dishes = source.dishes.filter((dish) => dish.restaurantId === restaurant.id);
  return [restaurant.name, restaurant.canteenName, ...restaurant.cuisines, ...restaurant.flavors, ...dishes.flatMap((dish) => [dish.name, dish.cuisine, ...dish.flavors])].join(' ').toLocaleLowerCase('zh-CN');
}
function matchesQuery(restaurant: Restaurant, source: CampusFoodData, query: ListQuery) {
  if (query.q && !searchableText(restaurant, source).includes(query.q.toLocaleLowerCase('zh-CN'))) return false;
  if (query.maxPrice !== undefined && restaurant.averagePrice > query.maxPrice) return false;
  if (query.flavors?.length && !hasIntersection(restaurant.flavors, query.flavors)) return false;
  if (query.maxDistance !== undefined && restaurant.distanceMeters > query.maxDistance) return false;
  if (query.minRating !== undefined && (restaurant.rating === null || restaurant.rating < query.minRating)) return false;
  if (query.openNow && !isRestaurantOpenNow(restaurant)) return false;
  if (!matchesMealPeriod(restaurant, query.mealPeriod)) return false;
  const warnings = [...restaurant.dietaryWarnings, ...source.dishes.filter((dish) => dish.restaurantId === restaurant.id).flatMap((dish) => dish.dietaryWarnings)];
  if (query.avoid?.length && hasIntersection(warnings, query.avoid)) return false;
  return true;
}
function sortRestaurants(restaurants: Restaurant[], sort?: ListQuery['sort']) {
  return [...restaurants].sort((left, right) => {
    if (sort === 'distance_asc') return left.distanceMeters - right.distanceMeters || (right.rating ?? -1) - (left.rating ?? -1);
    if (sort === 'rating_desc') return (right.rating ?? -1) - (left.rating ?? -1) || left.distanceMeters - right.distanceMeters;
    if (sort === 'price_asc') return left.averagePrice - right.averagePrice || (right.rating ?? -1) - (left.rating ?? -1);
    return 0;
  });
}
function summary(restaurant: Restaurant) {
  return { id: restaurant.id, name: restaurant.name, canteenName: restaurant.canteenName, location: restaurant.location, cuisines: restaurant.cuisines, flavors: restaurant.flavors, averagePrice: restaurant.averagePrice, distanceMeters: restaurant.distanceMeters, rating: restaurant.rating, openNow: isRestaurantOpenNow(restaurant), description: restaurant.description };
}
function scoreRestaurant(restaurant: Restaurant, preference: Preference) {
  const weighted: Array<{ weight: number; value: number }> = [];
  if (preference.flavors?.length) weighted.push({ weight: 40, value: preference.flavors.filter((flavor) => restaurant.flavors.includes(flavor)).length / preference.flavors.length });
  if (preference.maxDistance !== undefined) weighted.push({ weight: 25, value: Math.max(0, 1 - restaurant.distanceMeters / Math.max(preference.maxDistance, 1)) });
  if (preference.minRating !== undefined) weighted.push({ weight: 20, value: (restaurant.rating ?? 0) / 5 });
  if (preference.maxPrice !== undefined) weighted.push({ weight: 15, value: Math.max(0, 1 - restaurant.averagePrice / Math.max(preference.maxPrice, 1)) });
  if (!weighted.length) return (restaurant.rating ?? 0) * 20;
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  return Math.round(weighted.reduce((sum, item) => sum + item.weight * item.value, 0) / totalWeight * 100);
}
function reasonsFor(restaurant: Restaurant, preference: Preference) {
  const reasons: Array<{ type: string; text: string }> = [];
  const flavor = preference.flavors?.find((item) => restaurant.flavors.includes(item));
  if (flavor) reasons.push({ type: 'flavor', text: `提供你偏好的${flavor}口味` });
  if (preference.maxPrice !== undefined) reasons.push({ type: 'budget', text: `人均 ${restaurant.averagePrice} 元，符合你的 ${preference.maxPrice} 元预算` });
  if (preference.maxDistance !== undefined) reasons.push({ type: 'distance', text: `距中心教学楼约 ${restaurant.distanceMeters} 米` });
  if (preference.minRating !== undefined && restaurant.rating !== null) reasons.push({ type: 'rating', text: `评分 ${restaurant.rating}，达到你的评分要求` });
  if (preference.openNow) reasons.push({ type: 'open', text: '当前正在营业' });
  if (preference.mealPeriod) reasons.push({ type: 'mealPeriod', text: '支持你选择的用餐时段' });
  if (preference.avoid?.length) reasons.push({ type: 'dietary', text: `档口标注信息未包含：${preference.avoid.join('、')}` });
  if (!reasons.length && restaurant.rating !== null) reasons.push({ type: 'rating', text: `校园评分 ${restaurant.rating}` });
  return reasons.slice(0, 3);
}
const getFieldErrors = (error: ZodError) => Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'form', issue.message]));

export function createApp() {
  const app = express();
  app.use(cors()); app.use(express.json());
  app.use((_request, response, next) => { response.locals.requestId = randomUUID(); next(); });
  app.get('/api/v1/health', async (_request, response, next) => { try { await loadCampusFoodData(); response.json({ data: { status: 'ok' }, meta: { requestId: response.locals.requestId } }); } catch (error) { next(error); } });
  app.get('/api/v1/options', async (_request, response, next) => {
    try {
      const source = await loadCampusFoodData(); const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
      response.json({ data: { flavors: unique(source.restaurants.flatMap((item) => item.flavors)), cuisines: unique(source.restaurants.flatMap((item) => item.cuisines)), dietaryWarnings: unique([...source.restaurants.flatMap((item) => item.dietaryWarnings), ...source.dishes.flatMap((item) => item.dietaryWarnings)]), mealPeriods }, meta: { requestId: response.locals.requestId } });
    } catch (error) { next(error); }
  });
  app.get('/api/v1/restaurants', async (request, response, next) => {
    try {
      const query = listQuerySchema.parse(request.query); const source = await loadCampusFoodData();
      const restaurants = sortRestaurants(source.restaurants.filter((restaurant) => matchesQuery(restaurant, source, query)), query.sort);
      response.json({ data: restaurants.map(summary), meta: { total: restaurants.length, distanceReference: source.meta.distanceReference, appliedFilters: query, requestId: response.locals.requestId } });
    } catch (error) { next(error); }
  });
  app.get('/api/v1/restaurants/:id', async (request, response, next) => {
    try {
      const source = await loadCampusFoodData(); const restaurant = source.restaurants.find((item) => item.id === request.params.id);
      if (!restaurant) return response.status(404).json({ error: { code: 'NOT_FOUND', message: '没有找到这个餐饮档口', retryable: false }, meta: { requestId: response.locals.requestId } });
      return response.json({ data: { ...restaurant, openNow: isRestaurantOpenNow(restaurant), dishes: source.dishes.filter((dish) => dish.restaurantId === restaurant.id) }, meta: { requestId: response.locals.requestId } });
    } catch (error) { return next(error); }
  });
  app.get('/api/v1/dishes/:id', async (request, response, next) => {
    try {
      const source = await loadCampusFoodData(); const dish = source.dishes.find((item) => item.id === request.params.id);
      if (!dish) return response.status(404).json({ error: { code: 'NOT_FOUND', message: '没有找到这个菜品', retryable: false }, meta: { requestId: response.locals.requestId } });
      const restaurant = source.restaurants.find((item) => item.id === dish.restaurantId);
      return response.json({ data: { ...dish, restaurant: restaurant ? summary(restaurant) : null }, meta: { requestId: response.locals.requestId } });
    } catch (error) { return next(error); }
  });
  app.post('/api/v1/recommendations', async (request, response, next) => {
    try {
      const preference = recommendationSchema.parse(request.body); const source = await loadCampusFoodData();
      const query: ListQuery = { q: '', openNow: preference.openNow ?? false, ...preference };
      const candidates = source.restaurants.filter((restaurant) => matchesQuery(restaurant, source, query)).map((restaurant) => ({ restaurant, score: scoreRestaurant(restaurant, preference) })).sort((left, right) => right.score - left.score || (right.restaurant.rating ?? -1) - (left.restaurant.rating ?? -1) || left.restaurant.distanceMeters - right.restaurant.distanceMeters || left.restaurant.id.localeCompare(right.restaurant.id)).slice(0, 5).map(({ restaurant, score }) => ({ ...summary(restaurant), type: 'restaurant', score, reasons: reasonsFor(restaurant, preference) }));
      response.json({ data: candidates, meta: { total: candidates.length, appliedPreferences: preference, requestId: response.locals.requestId } });
    } catch (error) { next(error); }
  });
  app.use((_request, response) => { response.status(404).json({ error: { code: 'NOT_FOUND', message: '请求的内容不存在', retryable: false }, meta: { requestId: response.locals.requestId } }); });
  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) { response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '输入内容不符合要求', fieldErrors: getFieldErrors(error), retryable: false }, meta: { requestId: response.locals.requestId } }); return; }
    const invalidData = error instanceof SyntaxError;
    response.status(invalidData ? 503 : 500).json({ error: { code: invalidData ? 'DATA_UNAVAILABLE' : 'INTERNAL_ERROR', message: invalidData ? '餐饮数据暂时不可用' : '服务暂时不可用，请稍后重试', retryable: true }, meta: { requestId: response.locals.requestId } });
  });
  return app;
}
