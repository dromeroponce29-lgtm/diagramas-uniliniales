import 'dotenv/config';
import { crearApp } from './app.js';
import { AgenteClaude } from './agentes/claude.js';
import { AgenteOpenAI } from './agentes/openai.js';
import { auditarTablero } from './agentes/auditoria.js';

const PUERTO = Number(process.env.PUERTO ?? 3001);

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
    })
});

app.listen(PUERTO, () => {
  console.log(`[servidor] escuchando en http://localhost:${PUERTO}`);
});
