import { Router } from 'express';
import { leerTablero } from '../almacen/tablero.js';
import { construirExportXLSX } from '../exportacion/excel.js';

export function crearRutasExportacion(): Router {
  const router = Router();

  router.get('/clientes/:c/tableros/:t/exportar.xlsx', async (req, res) => {
    try {
      const tablero = await leerTablero(req.params.c!, req.params.t!);
      const buffer = await construirExportXLSX(tablero);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${tablero.codigo}-${tablero.slug}.xlsx"`
      );
      res.send(buffer);
    } catch (e) {
      res.status(404).json({ error: String(e) });
    }
  });

  return router;
}
