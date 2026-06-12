import 'dotenv/config';
import { crearApp } from './app.js';
import { AgenteClaude } from './agentes/claude.js';
import { AgenteOpenAI } from './agentes/openai.js';
import { auditarTablero } from './agentes/auditoria.js';
import { refinarConversacion } from './agentes/refinador.js';

// En Render el puerto se inyecta en PORT (convención estándar).
// Localmente seguimos aceptando PUERTO. Fallback: 3001.
const PUERTO = Number(process.env.PORT ?? process.env.PUERTO ?? 3001);

const claveAnthropic = process.env.ANTHROPIC_API_KEY ?? '';
const claveOpenai = process.env.OPENAI_API_KEY ?? '';
const modeloClaude = process.env.CLAUDE_MODEL ?? 'claude-opus-4-7';
const modeloOpenai = process.env.OPENAI_MODEL ?? 'gpt-4o';

if (!claveAnthropic || !claveOpenai) {
  console.error(
    '[servidor] Faltan claves API. Copia apps/servidor/.env.example a apps/servidor/.env y completa ANTHROPIC_API_KEY y OPENAI_API_KEY.'
  );
  process.exit(1);
}

const app = crearApp({
  agenteClaude: new AgenteClaude(claveAnthropic, modeloClaude),
  agenteOpenai: new AgenteOpenAI(claveOpenai, modeloOpenai),
  ejecutarAuditoria: (tablero, slugCliente, slugTablero) =>
    auditarTablero(tablero, slugCliente, slugTablero, {
      apiKey: claveAnthropic,
      modelo: modeloClaude
    }),
  ejecutarRefinador: (tablero, slugCliente, slugTablero, mensaje, historial) =>
    refinarConversacion(tablero, slugCliente, slugTablero, mensaje, historial, {
      apiKey: claveAnthropic,
      modelo: modeloClaude
    })
});

// 0.0.0.0 es requerido por Render (sino el healthcheck no llega al servicio).
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`[servidor] escuchando en puerto ${PUERTO}`);
});
