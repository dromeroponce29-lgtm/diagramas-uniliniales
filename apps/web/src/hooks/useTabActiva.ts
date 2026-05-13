import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useTabActiva<T extends string>(defecto: T, permitidos: readonly T[]) {
  const [params, setParams] = useSearchParams();
  const valor = params.get('tab') as T | null;
  const tab: T = valor && permitidos.includes(valor) ? valor : defecto;

  const setTab = useCallback((nueva: T) => {
    const next = new URLSearchParams(params);
    next.set('tab', nueva);
    setParams(next, { replace: false });
  }, [params, setParams]);

  return { tab, setTab };
}
