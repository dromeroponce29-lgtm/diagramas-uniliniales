import { Router } from 'express';
import { leerTablero } from '../almacen/tablero.js';
import { archivoTablero } from '../almacen/rutas.js';
import { escribirJsonAtomico } from '../almacen/escritura.js';
import type { Tablero } from '../../../../tipos/modelo.js';
import type { ResultadoAuditoria } from '../../../../tipos/ric/auditoria.js';

// Inyectable: facilita testear sin pegarle al modelo de IA.
export type EjecutorAuditoria = (
  tablero: Tablero,
  slugCliente: string,
  slugTablero: string
) => Promise<ResultadoAuditoria>;

export interface DepsRutasAuditoria {
  ejecutarAuditoria: EjecutorAuditoria;
}

export function crearRutasAuditoria(deps: DepsRutasAuditoria): Router {
  const router = Router();

  // POST: ejecutar nueva auditoría sobre el tablero actual (consume IA).
  router.post('/clientes/:c/tableros/:t/auditoria', async (req, res) => {
    try {
      const tablero = await leerTablero(req.params.c!, req.params.t!);
      if (tablero.fotos.length === 0) {
        res.status(400).json({ error: 'Sube al menos una foto antes de ejecutar la auditoría.' });
        return;
      }
      const resultado = await deps.ejecutarAuditoria(tablero, req.params.c!, req.params.t!);
      // Persistir el resultado en el tablero
      const tableroOut = {
        ...tablero,
        auditoriaNormativa: resultado,
        actualizadoEn: new Date().toISOString()
      };
      await escribirJsonAtomico(archivoTablero(req.params.c!, req.params.t!), tableroOut);
      res.json(resultado);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // GET: leer última auditoría persistida.
  router.get('/clientes/:c/tableros/:t/auditoria', async (req, res) => {
    try {
      const tablero = await leerTablero(req.params.c!, req.params.t!);
      if (!tablero.auditoriaNormativa) {
        res.status(404).json({ error: 'Aún no se ha generado una auditoría para este tablero.' });
        return;
      }
      res.json(tablero.auditoriaNormativa);
    } catch (e) {
      res.status(404).json({ error: String(e) });
    }
  });

  return router;
}
