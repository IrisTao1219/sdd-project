import type { DishDetail, Options, Preferences, RecommendationResponse, RestaurantDetail, RestaurantListResponse } from './types';

export class ApiError extends Error {
  constructor(message: string, public status: number, public fieldErrors: Record<string, string> = {}) { super(message); }
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null) as { error?: { message?: string; fieldErrors?: Record<string, string> } } | null;
  if (!response.ok) throw new ApiError(body?.error?.message ?? '服务暂时不可用', response.status, body?.error?.fieldErrors);
  return body as T;
}
export const getRestaurants = (params: URLSearchParams, signal?: AbortSignal) => request<RestaurantListResponse>(`/api/v1/restaurants?${params.toString()}`, { signal });
export const getOptions = (signal?: AbortSignal) => request<{ data: Options }>('/api/v1/options', { signal });
export const getRestaurant = (id: string, signal?: AbortSignal) => request<{ data: RestaurantDetail }>(`/api/v1/restaurants/${encodeURIComponent(id)}`, { signal });
export const getDish = (id: string, signal?: AbortSignal) => request<{ data: DishDetail }>(`/api/v1/dishes/${encodeURIComponent(id)}`, { signal });
export const getRecommendations = (preferences: Preferences, signal?: AbortSignal) => request<RecommendationResponse>('/api/v1/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preferences), signal });
