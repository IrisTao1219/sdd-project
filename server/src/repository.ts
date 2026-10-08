import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { campusFoodDataSchema, type CampusFoodData } from './schema.js';

const dataPath = fileURLToPath(new URL('../data/campus-food-data.json', import.meta.url));

let cache: CampusFoodData | undefined;

export async function loadCampusFoodData(): Promise<CampusFoodData> {
  if (cache) return cache;

  const raw = await readFile(dataPath, 'utf8');
  cache = campusFoodDataSchema.parse(JSON.parse(raw));
  return cache;
}
