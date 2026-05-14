import { Router } from 'express';
import { z } from 'zod';
import { leerTablero } from '../almacen/tablero.js';
import type { Tablero } from '../../../../tipos/modelo.js';
import type { MensajeHistorial } from '../agentes/refinador.js';

export type EjecutorRefinador = (
  tablero: Tablero,
  slugCliente: string,
  slugTablero: string,
  mensaje: string,
  historial: MensajeHistorial[]
) => Promise<{ respuesta: string }>;

const EsquemaMensajeRefinador = z.object({
  mensaje: z.string().min(1).max(2000),
  historial: z.array(z.object({
    rol: z.enum(['usuario', 'agente']),
    texto: z.string()
  })).optional().default([])
});

export function crearRutasRefinador(deps: { ejecutarRefinador: EjecutorRefinador }): Router {
  const router = Router();

  router.post('/clientes/:c/tableros/:t/refinador', async (req, res) => {
    try {
      const { mensaje, historial } = EsquemaMensajeRefinador.parse(req.body);
      const tablero = await leerTablero(req.params.c!, req.params.t!);
      const out = await deps.ejecutarRefinador(tablero, req.params.c!, req.params.t!, mensaje, historial);
      res.json(out);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  return router;
}
