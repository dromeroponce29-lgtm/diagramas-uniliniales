import { useParams } from 'react-router-dom';

export function WorkspaceTablero() {
  const { clienteSlug, tableroSlug } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Workspace (placeholder)</h1>
      <p className="text-slate-600">Cliente: {clienteSlug} / Tablero: {tableroSlug}</p>
    </div>
  );
}
