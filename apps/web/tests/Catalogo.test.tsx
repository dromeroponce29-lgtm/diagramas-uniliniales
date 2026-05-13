import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Catalogo } from '../src/pantallas/Catalogo.js';
import type { ItemCatalogo } from '@tipos/modelo';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function items(): ItemCatalogo[] {
  return [
    { id: '01', codigo: 'AUT-1', descripcion: 'Aut 1', tipo: 'material', unidad: 'ud', precioUnitarioCLP: 4500, categoria: 'proteccion' },
    { id: '02', codigo: 'HH-elec', descripcion: 'HH elec', tipo: 'labor',    unidad: 'h',  precioUnitarioCLP: 25000, categoria: 'mano-de-obra' }
  ];
}

function mountWith(json: ItemCatalogo[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true, status: 200, json: async () => json, text: async () => ''
  } as Response);
  render(
    <MemoryRouter initialEntries={['/clientes/x/catalogo']}>
      <Routes>
        <Route path="/clientes/:slug/catalogo" element={<Catalogo />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Catalogo', () => {
  it('muestra todos los items al cargar', async () => {
    mountWith(items());
    await waitFor(() => expect(screen.getByText('Aut 1')).toBeDefined());
    expect(screen.getByText('HH elec')).toBeDefined();
  });

  it('muestra mensaje cuando el catálogo está vacío', async () => {
    mountWith([]);
    await waitFor(() => expect(screen.getByText(/sin items/i)).toBeDefined());
  });

  it('lista la columna de precio formateada en CLP', async () => {
    mountWith(items());
    await waitFor(() => expect(screen.getByText(/4\.500/)).toBeDefined());
    expect(screen.getByText(/25\.000/)).toBeDefined();
  });
});
