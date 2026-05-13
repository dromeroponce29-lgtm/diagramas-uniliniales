import express, { type Express } from 'express';
import cors from 'cors';
import { crearRutasClientes } from './rutas/clientes.js';
import { crearRutasTableros } from './rutas/tableros.js';
import { crearRutasCatalogo } from './rutas/catalogo.js';
import { crearRutasPlanes } from './rutas/planes.js';
import { crearRutasExportacion } from './rutas/exportacion.js';
import type { ClienteAgenteIA } from './agentes/interfaz.js';

export interface DepsApp {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearApp(deps: DepsApp): Express {
  const app = express();
  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', crearRutasClientes());
  app.use('/api', crearRutasTableros({
    agenteClaude: deps.agenteClaude,
    agenteOpenai: deps.agenteOpenai
  }));
  app.use('/api', crearRutasCatalogo());
  app.use('/api', crearRutasPlanes());
  app.use('/api', crearRutasExportacion());

  return app;
}
