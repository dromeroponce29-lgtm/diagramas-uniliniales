import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CuadroDeCargas } from '../src/diagrama/lamina/CuadroDeCargas.js';
import type { Tablero } from '@tipos/modelo';

afterEach(cleanup);

function base(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('CuadroDeCargas', () => {
  it('muestra "sin circuitos" cuando el tablero no tiene circuitos', () => {
    render(
      <MemoryRouter>
        <CuadroDeCargas tablero={base()} />
      </MemoryRouter>
    );
    expect(screen.getByText(/sin circuitos/i)).toBeDefined();
  });

  it('lista una fila por circuito con destino, sección y protección', () => {
    const t = base();
    t.componentes = [{ id: 'a1', tipo: 'interruptor-automatico', calibreA: 16, polos: 1, curva: 'C', procedencia: { fuente: 'manual', confianza: 'alta' } }];
    t.circuitos = [{
      id: 'c1', numero: 1, proteccionComponenteId: 'a1',
      destino: 'Iluminación living', uso: 'iluminacion',
      seccionConductorMM2: 2.5, longitudM: 8, cargaW: 600, corrienteA: 2.7,
      procedencia: { fuente: 'manual', confianza: 'alta' }
    }];
    render(
      <MemoryRouter>
        <CuadroDeCargas tablero={t} />
      </MemoryRouter>
    );
    expect(screen.getByText('Iluminación living')).toBeDefined();
    expect(screen.getByText(/C16/)).toBeDefined();
    expect(screen.getByText('2.5')).toBeDefined();
  });
});
