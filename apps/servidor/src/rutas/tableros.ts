import { Router } from 'express';
import multer from 'multer';
import { ZodError, z } from 'zod';
import { writeFile, mkdir } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  EsquemaTableroEntrada,
  EsquemaTableroActualizacion,
  EsquemaComponenteActualizacion,
  EsquemaCircuito,
  EsquemaAnotacionHallazgo
} from '../esquemas/tablero.js';
import {
  crearTablero,
  leerTablero,
  listarTableros,
  actualizarTablero,
  eliminarTablero,
  agregarFotoYComponentes,
  actualizarComponente,
  reemplazarCircuitos,
  reemplazarAnotacionesHallazgos
} from '../almacen/tablero.js';
import { reconciliar } from '../agentes/reconciliador.js';
import { dirFotos, archivoFoto, dirExtracciones, archivoExtraccion } from '../almacen/rutas.js';
import { escribirJsonAtomico } from '../almacen/escritura.js';
import { nuevoId } from '../util/ulid.js';
import type { ClienteAgenteIA } from '../agentes/interfaz.js';
import type { Foto } from '../../../../tipos/modelo.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const MAX_FOTOS_POR_TABLERO = 20;

interface Deps {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearRutasTableros(deps: Deps): Router {
  const router = Router();

  router.get('/clientes/:c/tableros', async (req, res) => {
    try {
      const tableros = await listarTableros(req.params.c!);
      res.json(tableros);
    } catch {
      res.status(404).json({ error: `Cliente "${req.params.c}" no existe` });
    }
  });

  router.post('/clientes/:c/tableros', async (req, res) => {
    try {
      const entrada = EsquemaTableroEntrada.parse(req.body);
      const tablero = await crearTablero(req.params.c!, entrada);
      res.status(201).json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.get('/clientes/:c/tableros/:t', async (req, res) => {
    try {
      const tablero = await leerTablero(req.params.c!, req.params.t!);
      res.json(tablero);
    } catch {
      res.status(404).json({ error: `Tablero no encontrado` });
    }
  });

  router.put('/clientes/:c/tableros/:t', async (req, res) => {
    try {
      const parche = EsquemaTableroActualizacion.parse(req.body);
      const tablero = await actualizarTablero(req.params.c!, req.params.t!, parche);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.delete('/clientes/:c/tableros/:t', async (req, res) => {
    try {
      await eliminarTablero(req.params.c!, req.params.t!);
      res.status(204).end();
    } catch {
      res.status(404).json({ error: 'Tablero no encontrado' });
    }
  });

  router.post('/clientes/:c/tableros/:t/fotos', upload.single('foto'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Falta el archivo "foto"' });
      return;
    }
    const { c, t } = req.params;

    let tablero;
    try {
      tablero = await leerTablero(c!, t!);
    } catch {
      res.status(404).json({ error: 'Tablero no encontrado' });
      return;
    }

    if (tablero.fotos.length >= MAX_FOTOS_POR_TABLERO) {
      res.status(409).json({ error: `Límite de ${MAX_FOTOS_POR_TABLERO} fotos por tablero alcanzado` });
      return;
    }

    const fotoId = nuevoId();
    const ext = extname(req.file.originalname).slice(1).toLowerCase() || 'jpg';

    // Guardar foto a disco
    await mkdir(dirFotos(c!, t!), { recursive: true });
    await writeFile(archivoFoto(c!, t!, fotoId, ext), req.file.buffer);

    // Procesar con agentes
    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    const [claudeRes, openaiRes] = await Promise.allSettled([
      deps.agenteClaude.extraer(base64, mime),
      deps.agenteOpenai.extraer(base64, mime)
    ]);

    if (claudeRes.status === 'rejected' && openaiRes.status === 'rejected') {
      res.status(502).json({
        error: 'Ambos agentes fallaron',
        claude: String(claudeRes.reason),
        openai: String(openaiRes.reason)
      });
      return;
    }

    const claudeExtraccion = claudeRes.status === 'fulfilled' ? claudeRes.value : {
      calidadFoto: 'aceptable' as const,
      problemasFoto: ['Claude falló en esta foto'],
      componentesDetectados: [],
      rotulacionCircuitosLeida: []
    };
    const openaiExtraccion = openaiRes.status === 'fulfilled' ? openaiRes.value : {
      calidadFoto: 'aceptable' as const,
      problemasFoto: ['OpenAI falló en esta foto'],
      componentesDetectados: [],
      rotulacionCircuitosLeida: []
    };

    // Guardar extracciones crudas (auditoría)
    await mkdir(dirExtracciones(c!, t!), { recursive: true });
    await escribirJsonAtomico(archivoExtraccion(c!, t!, fotoId, 'claude'), claudeExtraccion);
    await escribirJsonAtomico(archivoExtraccion(c!, t!, fotoId, 'openai'), openaiExtraccion);

    const reconciliado = reconciliar({
      fotoId,
      extraccionClaude: claudeExtraccion,
      extraccionOpenai: openaiExtraccion
    });
    await escribirJsonAtomico(archivoExtraccion(c!, t!, fotoId, 'reconciliado'), reconciliado);

    // Registrar la foto en el tablero junto con sus componentes (escritura atómica).
    const nuevaFoto: Foto = {
      id: fotoId,
      nombreOriginal: req.file.originalname,
      mimeType: mime,
      calidadFoto: reconciliado.calidadFoto,
      problemasFoto: reconciliado.problemasFoto,
      subidaEn: new Date().toISOString()
    };
    const tableroFinal = await agregarFotoYComponentes(c!, t!, nuevaFoto, reconciliado.componentes);
    res.json(tableroFinal);
  });

  router.patch('/clientes/:c/tableros/:t/componentes/:id', async (req, res) => {
    try {
      const parche = EsquemaComponenteActualizacion.parse(req.body);
      const tablero = await actualizarComponente(req.params.c!, req.params.t!, req.params.id!, parche);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.put('/clientes/:c/tableros/:t/circuitos', async (req, res) => {
    try {
      const payload = z.object({ circuitos: z.array(EsquemaCircuito) }).parse(req.body);
      const tablero = await reemplazarCircuitos(req.params.c!, req.params.t!, payload.circuitos);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  router.put('/clientes/:c/tableros/:t/anotaciones-ric', async (req, res) => {
    try {
      const payload = z.object({ anotaciones: z.array(EsquemaAnotacionHallazgo) }).parse(req.body);
      const tablero = await reemplazarAnotacionesHallazgos(req.params.c!, req.params.t!, payload.anotaciones);
      res.json(tablero);
    } catch (e) {
      if (e instanceof ZodError) {
        res.status(400).json({ error: 'Datos inválidos', detalles: e.errors });
        return;
      }
      res.status(404).json({ error: String(e) });
    }
  });

  return router;
}
