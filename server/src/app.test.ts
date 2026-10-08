import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp();
describe('campus food API', () => {
  it('returns all example restaurants', async () => {
    const response = await request(app).get('/api/v1/restaurants');
    expect(response.status).toBe(200); expect(response.body.meta.total).toBe(6); expect(response.body.data[0]).toMatchObject({ id: 'rest-001' });
  });
  it('searches, filters and sorts restaurants', async () => {
    const response = await request(app).get('/api/v1/restaurants?q=面&maxPrice=20&sort=price_asc');
    expect(response.status).toBe(200); expect(response.body.data.map((item: { id: string }) => item.id)).toEqual(['rest-002']);
  });
  it('returns restaurant and dish details', async () => {
    const restaurant = await request(app).get('/api/v1/restaurants/rest-001'); const dish = await request(app).get('/api/v1/dishes/dish-001');
    expect(restaurant.status).toBe(200); expect(restaurant.body.data.dishes).toHaveLength(2); expect(dish.body.data.restaurant.id).toBe('rest-001');
  });
  it('returns recommendations with reasons', async () => {
    const response = await request(app).post('/api/v1/recommendations').send({ maxPrice: 20, flavors: ['清淡'], avoid: ['花生'] });
    expect(response.status).toBe(200); expect(response.body.data.length).toBeGreaterThanOrEqual(1); expect(response.body.data.length).toBeLessThanOrEqual(5); expect(response.body.data.every((item: { averagePrice: number; reasons: unknown[] }) => item.averagePrice <= 20 && item.reasons.length > 0)).toBe(true);
  });
  it('validates empty preferences and missing details', async () => {
    const invalid = await request(app).post('/api/v1/recommendations').send({}); const missing = await request(app).get('/api/v1/restaurants/missing');
    expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe('VALIDATION_ERROR'); expect(missing.status).toBe(404);
  });
});
