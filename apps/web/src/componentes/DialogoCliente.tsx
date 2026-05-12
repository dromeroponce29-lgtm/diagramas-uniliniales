import { useState, useEffect } from 'react';
import type { Cliente } from '@tipos/modelo';

interface Props {
  abierto: boolean;
  clienteExistente?: Cliente;
  onCerrar(): void;
  onGuardar(datos: { nombre: string; rut?: string; direccion?: string; contactoNombre?: string; contactoTelefono?: string; contactoEmail?: string }): Promise<void>;
}

export function DialogoCliente({ abierto, clienteExistente, onCerrar, onGuardar }: Props) {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');
  const [contactoEmail, setContactoEmail] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      setNombre(clienteExistente?.nombre ?? '');
      setRut(clienteExistente?.rut ?? '');
      setDireccion(clienteExistente?.direccion ?? '');
      setContactoNombre(clienteExistente?.contactoNombre ?? '');
      setContactoTelefono(clienteExistente?.contactoTelefono ?? '');
      setContactoEmail(clienteExistente?.contactoEmail ?? '');
      setError(null);
    }
  }, [abierto, clienteExistente]);

  if (!abierto) return null;

  async function alGuardar() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        ...(rut.trim() && { rut: rut.trim() }),
        ...(direccion.trim() && { direccion: direccion.trim() }),
        ...(contactoNombre.trim() && { contactoNombre: contactoNombre.trim() }),
        ...(contactoTelefono.trim() && { contactoTelefono: contactoTelefono.trim() }),
        ...(contactoEmail.trim() && { contactoEmail: contactoEmail.trim() })
      });
      onCerrar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4">
          {clienteExistente ? 'Editar cliente' : 'Nuevo cliente'}
        </h3>

        <div className="space-y-3">
          <Campo etiqueta="Nombre *" valor={nombre} alCambiar={setNombre} />
          <Campo etiqueta="RUT" valor={rut} alCambiar={setRut} />
          <Campo etiqueta="Dirección" valor={direccion} alCambiar={setDireccion} />
          <Campo etiqueta="Contacto — nombre" valor={contactoNombre} alCambiar={setContactoNombre} />
          <Campo etiqueta="Contacto — teléfono" valor={contactoTelefono} alCambiar={setContactoTelefono} />
          <Campo etiqueta="Contacto — email" valor={contactoEmail} alCambiar={setContactoEmail} tipo="email" />
        </div>

        {error && <div className="mt-3 text-red-700 text-sm">{error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCerrar} disabled={guardando}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Cancelar</button>
          <button onClick={alGuardar} disabled={guardando}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ etiqueta, valor, alCambiar, tipo = 'text' }: {
  etiqueta: string; valor: string; alCambiar: (v: string) => void; tipo?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{etiqueta}</span>
      <input
        type={tipo}
        value={valor}
        onChange={e => alCambiar(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
