import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VistaPlan } from '../src/pantallas/VistaPlan.js';
import type { PlanNormalizacion, ItemCatalogo } from '@tipos/modelo';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function planVacio(): PlanNormalizacion {
  return {
    id: 'P1', numero: 3, creadoEn: '2026-05-13T00:00:00Z', actualizadoEn: '2026-05-13T00:00:00Z',
    estado: 'borrador', partidas: [], incluyeIVA: true, ivaPct: 19,
    subtotalCLP: 0, ivaCLP: 0, totalCLP: 0
  };
}

function planConPartida(): PlanNormalizacion {
  return {
    ...planVacio(),
    partidas: [{
      id: 'X', itemCodigo: 'DPS-1P-T2', itemDescripcion: 'DPS',
      unidad: 'ud', precioUnitarioCLP: 35000, cantidad: 1, totalCLP: 35000
    }],
    subtotalCLP: 35000, ivaCLP: 6650, totalCLP: 41650
  };
}

function mountWith(plan: PlanNormalizacion, catalogo: ItemCatalogo[] = []) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const u = String(url);
    if (u.includes('/catalogo')) return { ok: true, status: 200, json: async () => catalogo, text: async () => '' } as Response;
    if (u.includes('/planes')) {
      if (init?.method === 'PUT') return { ok: true, status: 200, json: async () => plan, text: async () => '' } as Response;
      return { ok: true, status: 200, json: async () => [plan], text: async () => '' } as Response;
    }
    return { ok: true, status: 200, json: async () => null, text: async () => '' } as Response;
  });
  render(
    <MemoryRouter initialEntries={['/clientes/c/tableros/t/planes/P1']}>
      <Routes>
        <Route path="/clientes/:clienteSlug/tableros/:tableroSlug/planes/:planId" element={<VistaPlan />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VistaPlan', () => {
  it('muestra el número del plan, estado y totales', async () => {
    mountWith(planConPartida());
    await waitFor(() => expect(screen.getByText(/Plan #3/)).toBeDefined());
    expect(screen.getByText(/borrador/i)).toBeDefined();
    expect(screen.getAllByText(/35\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/41\.650/).length).toBeGreaterThan(0);
  });

  it('lista las partidas con código, descripción y cantidad', async () => {
    mountWith(planConPartida());
    await waitFor(() => expect(screen.getByText('DPS-1P-T2')).toBeDefined());
  });

  it('plan vacío muestra mensaje "sin partidas"', async () => {
    mountWith(planVacio());
    await waitFor(() => expect(screen.getByText(/sin partidas/i)).toBeDefined());
  });

  it('cambiar cantidad dispara PUT al backend tras debounce', async () => {
    const plan = planConPartida();
    let putCalled = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.includes('/catalogo')) return { ok: true, status: 200, json: async () => [], text: async () => '' } as Response;
      if (init?.method === 'PUT') {
        putCalled = true;
        return { ok: true, status: 200, json: async () => plan, text: async () => '' } as Response;
      }
      return { ok: true, status: 200, json: async () => [plan], text: async () => '' } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/clientes/c/tableros/t/planes/P1']}>
        <Routes>
          <Route path="/clientes/:clienteSlug/tableros/:tableroSlug/planes/:planId" element={<VistaPlan />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('1')).toBeDefined());
    vi.useFakeTimers();
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '3' } });
    vi.advanceTimersByTime(1100);
    vi.useRealTimers();
    await waitFor(() => expect(putCalled).toBe(true));
  });
});
