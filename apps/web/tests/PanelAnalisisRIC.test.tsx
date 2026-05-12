import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PanelAnalisisRIC } from '../src/componentes/PanelAnalisisRIC.js';
import type { Tablero } from '@tipos/modelo';

vi.mock('../src/estado/tableroStore.js', () => ({
  useTableroStore: () => ({ reemplazarAnotacionesHallazgos: vi.fn() })
}));

function tableroVacio(): Tablero {
  return {
    id: '01J', slug: 't', clienteId: '01C', codigo: 'TG', nombre: 'X', tipo: 'general',
    tensionSistema: 'pendiente', esquemaTierra: 'pendiente',
    fotos: [], componentes: [], pendientes: [],
    circuitos: [], anotacionesHallazgos: [],
    porcentajeCompletitud: 0,
    creadoEn: '2026-05-12T00:00:00Z', actualizadoEn: '2026-05-12T00:00:00Z'
  };
}

describe('PanelAnalisisRIC', () => {
  it('renderiza el título y los tabs', () => {
    render(<PanelAnalisisRIC tablero={tableroVacio()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getByText('Análisis RIC')).toBeDefined();
    expect(screen.getByText(/Hallazgos \(/)).toBeDefined();
    expect(screen.getByText(/Levantamientos terreno \(/)).toBeDefined();
  });

  it('lista al menos una regla evaluada como no-cumple para tablero vacío', () => {
    render(<PanelAnalisisRIC tablero={tableroVacio()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getAllByText(/Diferencial presente/).length).toBeGreaterThan(0);
  });
});
