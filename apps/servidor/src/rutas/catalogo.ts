import { Router } from 'express';
import { ZodError } from 'zod';
import {
  leerCatalogo,
  reemplazarCatalogo,
  restaurarSemillaCatalogo
} from '../almacen/catalogo.js';

export function crearRutasCatalogo(): Router {
  const router = Router();

  router.get('/clientes/:slug/catalogo', async (req, res) => {
    try {
      const cat = await leerCatalogo(req.params.slug!);
      res.json(cat);
    } catch (e) {
      res.status(404).json({ error: String(e) });
    }
  });

  router.put('/clientes/:slug/catalogo', async (req, res) => {
    try {
      if (!Array.isArray(req.body)) {
        res.status(400).json({ error: 'El body debe ser un array de items' });
        return;
      }
      const reemplazado = await reemplazarCatalogo(req.params.slug!, req.body);
      res.json(reemplazado);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      if (String(e).match(/duplicad/i)) {
        res.status(400).json({ error: String(e) });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.post('/clientes/:slug/catalogo/semilla', async (req, res) => {
    try {
      const cat = await restaurarSemillaCatalogo(req.params.slug!);
      res.json(cat);
    } catch (e) {
      res.status(404).json({ error: String(e) });
    }
  });

  return router;
}
