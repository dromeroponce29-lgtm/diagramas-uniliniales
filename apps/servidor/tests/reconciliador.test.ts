import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconciliar } from '../src/agentes/reconciliador.js';
import type { ExtraccionAgente } from '../src/esquemas/extraccion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function cargarFixture(nombre: string): ExtraccionAgente {
  return JSON.parse(
    readFileSync(join(__dirname, 'fixtures', nombre), 'utf-8')
  ) as ExtraccionAgente;
}

describe('reconciliar', () => {
  const claude = cargarFixture('claude-foto-01.json');
  const openai = cargarFixture('openai-foto-01.json');
  const resultado = reconciliar({
    fotoId: 'foto-01',
    extraccionClaude: claude,
    extraccionOpenai: openai
  });

  it('preserva el fotoId', () => {
    expect(resultado.fotoId).toBe('foto-01');
  });

  it('marca componente con coincidencia exacta como alta confianza y fuente foto-ambos', () => {
    const intGen = resultado.componentes.find(c => c.tipo === 'interruptor-general');
    expect(intGen).toBeDefined();
    expect(intGen!.procedencia.confianza).toBe('alta');
    expect(intGen!.procedencia.fuente).toBe('foto-ambos');
    expect(intGen!.calibreA).toBe(63);
  });

  it('marca campo donde solo uno reportó valor como media confianza', () => {
    // Claude reportó marca "Schneider" en el automático C16, OpenAI no.
    // El componente debe quedar con confianza media y la marca tomada de Claude.
    const c16 = resultado.componentes.find(
      c => c.tipo === 'interruptor-automatico' && c.calibreA === 16
    );
    expect(c16).toBeDefined();
    expect(c16!.marca).toBe('Schneider');
    expect(c16!.procedencia.confianza).toBe('media');
  });

  it('marca discrepancia entre agentes con confianza="discrepancia" y nota explícita', () => {
    // Claude leyó 10A, OpenAI leyó 6A en el mismo componente (fila 2, columna 1).
    const componente = resultado.componentes.find(
      c => c.posicionEnTablero?.fila === 2 && c.posicionEnTablero?.columna === 1
    );
    expect(componente).toBeDefined();
    expect(componente!.procedencia.confianza).toBe('discrepancia');
    expect(componente!.procedencia.notas).toContain('Claude');
    expect(componente!.procedencia.notas).toContain('OpenAI');
  });

  it('omite campo si ambos agentes lo reportaron como null', () => {
    // sensibilidadMA es null en todos los componentes en ambos fixtures.
    const algunoConSensibilidad = resultado.componentes.find(c => c.sensibilidadMA !== undefined);
    expect(algunoConSensibilidad).toBeUndefined();
  });

  it('asigna ID único a cada componente reconciliado', () => {
    const ids = resultado.componentes.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
  });

  it('preserva calidadFoto y problemasFoto del JSON (toma el peor caso)', () => {
    expect(resultado.calidadFoto).toBe('buena');
    expect(resultado.problemasFoto).toEqual([]);
  });

  it('expone rotulaciones de circuitos detectadas (concatenando las de ambos agentes, sin duplicar)', () => {
    expect(resultado.rotulacionesLeidas.length).toBeGreaterThanOrEqual(2);
  });
});
