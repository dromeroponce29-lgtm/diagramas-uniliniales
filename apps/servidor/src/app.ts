import express, { type Express } from 'express';
import cors from 'cors';
import { crearRutasClientes } from './rutas/clientes.js';
import { crearRutasTableros } from './rutas/tableros.js';
import { crearRutasCatalogo } from './rutas/catalogo.js';
import { crearRutasPlanes } from './rutas/planes.js';
import { crearRutasExportacion } from './rutas/exportacion.js';
import { crearRutasAuditoria, type EjecutorAuditoria } from './rutas/auditoria.js';
import { crearRutasRefinador, type EjecutorRefinador } from './rutas/refinador.js';
import type { ClienteAgenteIA } from './agentes/interfaz.js';

export interface DepsApp {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
  ejecutarAuditoria?: EjecutorAuditoria;   // opcional para tests
  ejecutarRefinador?: EjecutorRefinador;   // opcional para tests
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
  if (deps.ejecutarAuditoria) {
    app.use('/api', crearRutasAuditoria({ ejecutarAuditoria: deps.ejecutarAuditoria }));
  }
  if (deps.ejecutarRefinador) {
    app.use('/api', crearRutasRefinador({ ejecutarRefinador: deps.ejecutarRefinador }));
  }

  return app;
}
