import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTabActiva } from '../src/hooks/useTabActiva.js';

function wrapper(initialEntries: string[]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe('useTabActiva', () => {
  it('devuelve tab por defecto cuando no hay query param', () => {
    const { result } = renderHook(
      () => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']),
      { wrapper: wrapper(['/']) }
    );
    expect(result.current.tab).toBe('datos-generales');
  });

  it('lee el query param ?tab=', () => {
    const { result } = renderHook(
      () => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']),
      { wrapper: wrapper(['/?tab=diagrama']) }
    );
    expect(result.current.tab).toBe('diagrama');
  });

  it('rechaza valores fuera de la lista permitida y vuelve al default', () => {
    const { result } = renderHook(
      () => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']),
      { wrapper: wrapper(['/?tab=basura']) }
    );
    expect(result.current.tab).toBe('datos-generales');
  });

  it('cambiar la tab actualiza el valor', () => {
    const { result } = renderHook(
      () => useTabActiva('datos-generales', ['datos-generales', 'fotos', 'diagrama', 'ric']),
      { wrapper: wrapper(['/?tab=fotos']) }
    );
    act(() => result.current.setTab('ric'));
    expect(result.current.tab).toBe('ric');
  });
});
