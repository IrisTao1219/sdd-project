import type { Restaurant } from './schema.js';

export function isRestaurantOpenNow(restaurant: Restaurant, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const day = weekday ? dayMap[weekday] : undefined;
  const time = `${hour}:${minute}`;

  return day !== undefined && restaurant.businessHours.some(
    (hours) => hours.days.includes(day) && time >= hours.start && time < hours.end
  );
}
