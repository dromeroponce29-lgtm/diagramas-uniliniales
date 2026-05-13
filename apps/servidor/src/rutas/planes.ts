import { Router } from 'express';
import { ZodError } from 'zod';
import { EsquemaPlanCreacion, EsquemaPlanActualizacion } from '../esquemas/cotizacion.js';
import {
  crearPlan,
  listarPlanes,
  actualizarPlan,
  eliminarPlan
} from '../almacen/planes.js';

export function crearRutasPlanes(): Router {
  const router = Router();

  router.get('/clientes/:c/tableros/:t/planes', async (req, res) => {
    try {
      const lst = await listarPlanes(req.params.c!, req.params.t!);
      res.json(lst);
    } catch (e) {
      res.status(404).json({ error: String(e) });
    }
  });

  router.post('/clientes/:c/tableros/:t/planes', async (req, res) => {
    try {
      const entrada = EsquemaPlanCreacion.parse(req.body ?? {});
      const plan = await crearPlan(req.params.c!, req.params.t!, entrada);
      res.status(201).json(plan);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.put('/clientes/:c/tableros/:t/planes/:p', async (req, res) => {
    try {
      const parche = EsquemaPlanActualizacion.parse(req.body);
      const plan = await actualizarPlan(req.params.c!, req.params.t!, req.params.p!, parche);
      res.json(plan);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.delete('/clientes/:c/tableros/:t/planes/:p', async (req, res) => {
    try {
      await eliminarPlan(req.params.c!, req.params.t!, req.params.p!);
      res.status(204).end();
    } catch (e) {
      res.status(404).json({ error: String(e) });
    }
  });

  return router;
}
