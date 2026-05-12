import { type Router, Router as crearRouter } from 'express';
import multer from 'multer';
import { nuevoId } from '../util/ulid.js';
import { reconciliar } from '../agentes/reconciliador.js';
import type { ClienteAgenteIA } from '../agentes/interfaz.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

interface Deps {
  agenteClaude: ClienteAgenteIA;
  agenteOpenai: ClienteAgenteIA;
}

export function crearRutaExtraer(deps: Deps): Router {
  const router = crearRouter();

  router.post('/extract', upload.single('foto'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Falta el archivo "foto"' });
      return;
    }

    const fotoId = nuevoId();
    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    try {
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

      // Si uno falló, se usa una extracción vacía para él (el reconciliador
      // marcará todo lo del otro agente como confianza media).
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

      const resultado = reconciliar({
        fotoId,
        extraccionClaude: claudeExtraccion,
        extraccionOpenai: openaiExtraccion
      });

      res.json(resultado);
    } catch (e) {
      res.status(500).json({ error: 'Error inesperado en extracción', detalle: String(e) });
    }
  });

  return router;
}
