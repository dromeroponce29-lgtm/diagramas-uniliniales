import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiTableros } from '../api/cliente.js';
import { DialogoTablero } from '../componentes/DialogoTablero.js';

export function NuevoTablero() {
  const { clienteSlug } = useParams();
  const navigate = useNavigate();

  async function alGuardar(datos: Parameters<typeof apiTableros.crear>[1]) {
    const t = await apiTableros.crear(clienteSlug!, datos);
    navigate(`/clientes/${clienteSlug}/tableros/${t.slug}`);
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <Link to="/clientes" className="text-sm text-blue-600 hover:underline">← Volver a clientes</Link>
        <h1 className="text-3xl font-bold mt-2">Nuevo tablero — {clienteSlug}</h1>
      </header>
      <DialogoTablero onGuardar={alGuardar} onCancelar={() => navigate('/clientes')} />
    </div>
  );
}
