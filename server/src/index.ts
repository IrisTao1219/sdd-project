import { createApp } from './app.js';
import { loadCampusFoodData } from './repository.js';

const port = Number(process.env.PORT ?? 3001);

loadCampusFoodData()
  .then(() => {
    createApp().listen(port, () => {
      console.log(`Campus Food API is running at http://localhost:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to load campus food data', error);
    process.exitCode = 1;
  });
