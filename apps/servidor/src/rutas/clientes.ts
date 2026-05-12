import { Router } from 'express';
import { ZodError } from 'zod';
import { EsquemaClienteEntrada } from '../esquemas/cliente.js';
import {
  crearCliente,
  leerCliente,
  listarClientes,
  actualizarCliente,
  eliminarCliente
} from '../almacen/cliente.js';

export function crearRutasClientes(): Router {
  const router = Router();

  router.get('/clientes', async (_req, res) => {
    const lista = await listarClientes();
    res.json(lista);
  });

  router.post('/clientes', async (req, res) => {
    try {
      const entrada = EsquemaClienteEntrada.parse(req.body);
      const cliente = await crearCliente(entrada);
      res.status(201).json(cliente);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(500).json({ error: String(e) });
    }
  });

  router.get('/clientes/:slug', async (req, res) => {
    try {
      const cliente = await leerCliente(req.params.slug!);
      res.json(cliente);
    } catch {
      res.status(404).json({ error: `Cliente "${req.params.slug}" no existe` });
    }
  });

  router.put('/clientes/:slug', async (req, res) => {
    try {
      const parche = EsquemaClienteEntrada.partial().parse(req.body);
      const cliente = await actualizarCliente(req.params.slug!, parche);
      res.json(cliente);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.delete('/clientes/:slug', async (req, res) => {
    try {
      await eliminarCliente(req.params.slug!);
      res.status(204).end();
    } catch {
      res.status(404).json({ error: `Cliente "${req.params.slug}" no existe` });
    }
  });

  return router;
}
