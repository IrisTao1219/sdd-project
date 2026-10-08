import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const response = {
  data: [
    {
      id: 'rest-001',
      name: '一食堂·家常菜档口',
      canteenName: '第一食堂',
      location: '第一食堂一层东侧',
      cuisines: ['家常菜'],
      flavors: ['清淡'],
      averagePrice: 18,
      distanceMeters: 350,
      rating: 4.5,
      openNow: true,
      description: '提供日常家常菜。'
    }
  ],
  meta: { total: 1, distanceReference: '校园中心教学楼' }
};

describe('App', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads and displays restaurant data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => Promise.resolve({
      ok: true,
      json: async () => input.includes('/options') ? { data: { flavors: ['清淡'], cuisines: ['家常菜'], dietaryWarnings: [], mealPeriods: ['lunch'] } } : response
    })));

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /今天，\s*吃点好的。/ })).toBeInTheDocument();
    expect(await screen.findByText('一食堂·家常菜档口')).toBeInTheDocument();
    expect(screen.getByText('找到 1 个档口')).toBeInTheDocument();
  });
});
