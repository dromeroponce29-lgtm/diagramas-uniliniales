import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PanelAnalisisRIC } from '../src/componentes/PanelAnalisisRIC.js';
import type { Tablero } from '@tipos/modelo';

vi.mock('../src/estado/tableroStore.js', () => ({
  useTableroStore: () => ({ reemplazarAnotacionesHallazgos: vi.fn() })
}));

afterEach(cleanup);

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

function tableroConDatos(): Tablero {
  const t = tableroVacio();
  t.tensionSistema = '220V-mono';
  return t;
}

describe('PanelAnalisisRIC', () => {
  it('renderiza el título y los tabs cuando el tablero tiene datos', () => {
    render(<PanelAnalisisRIC tablero={tableroConDatos()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getByText('Análisis RIC')).toBeDefined();
    expect(screen.getByText(/Hallazgos \(/)).toBeDefined();
    expect(screen.getByText(/Levantamientos terreno \(/)).toBeDefined();
  });

  it('lista al menos una regla evaluada como no-cumple para tablero con datos', () => {
    render(<PanelAnalisisRIC tablero={tableroConDatos()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getAllByText(/Diferencial presente/).length).toBeGreaterThan(0);
  });

  it('muestra empty-state cuando el tablero está vacío', () => {
    render(<PanelAnalisisRIC tablero={tableroVacio()} clienteSlug="c" tableroSlug="t" />);
    expect(screen.getByText(/Tablero sin datos/i)).toBeDefined();
    // No debe mostrar la lista de hallazgos
    expect(screen.queryAllByText(/RIC N°/).length).toBe(0);
  });

  it('muestra hallazgos normales cuando el tablero tiene al menos un dato', () => {
    const t = tableroVacio();
    t.tensionSistema = '220V-mono';   // un solo campo basta
    render(<PanelAnalisisRIC tablero={t} clienteSlug="c" tableroSlug="t" />);
    // Ahora debe mostrar reglas
    expect(screen.queryAllByText(/RIC N°/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tablero sin datos/i)).toBeNull();
  });
});
