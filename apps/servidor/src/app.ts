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

// Lee ORIGENES_PERMITIDOS (CSV) desde el entorno y devuelve la lista parseada.
// Si la variable no está seteada, devuelve los defaults (dev + producción).
function leerOrigenesPermitidos(): string[] {
  const env = process.env.ORIGENES_PERMITIDOS;
  const raw = env && env.trim().length > 0
    ? env
    : 'http://localhost:5173,https://unilineales.tecnofitness.cl';
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

// Versión del paquete (para el healthcheck). Si falla la lectura, no rompe.
function leerVersion(): string {
  try {
    // process.env.npm_package_version lo expone npm cuando arranca por script
    return process.env.npm_package_version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function crearApp(deps: DepsApp): Express {
  const app = express();
  const origenesPermitidos = leerOrigenesPermitidos();
  app.use(cors({ origin: origenesPermitidos }));
  app.use(express.json({ limit: '20mb' }));

  const respuestaSalud = () => ({
    estado: 'ok' as const,
    timestamp: new Date().toISOString(),
    version: leerVersion()
  });

  app.get('/api/salud', (_req, res) => {
    res.json(respuestaSalud());
  });

  // Render busca /healthz por defecto en algunos casos.
  app.get('/healthz', (_req, res) => {
    res.json(respuestaSalud());
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
