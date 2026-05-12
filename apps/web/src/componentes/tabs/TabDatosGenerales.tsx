import type { Tablero, Cliente } from '@tipos/modelo';

interface Props {
  tablero: Tablero;
  cliente?: Cliente;
  clienteSlug: string;
  tableroSlug: string;
}

export function TabDatosGenerales(_props: Props) {
  return (
    <div className="bg-white border rounded p-6">
      <p className="text-sm text-slate-500">Formulario de datos generales — en construcción (Fase D del Plan 5).</p>
    </div>
  );
}
