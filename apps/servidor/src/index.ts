import 'dotenv/config';
import { crearApp } from './app.js';

const PUERTO = Number(process.env.PUERTO ?? 3001);
const app = crearApp();

app.listen(PUERTO, () => {
  console.log(`[servidor] escuchando en http://localhost:${PUERTO}`);
});
