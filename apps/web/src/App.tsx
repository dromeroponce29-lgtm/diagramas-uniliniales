import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ListaClientes } from './pantallas/ListaClientes.js';
import { WorkspaceTablero } from './pantallas/WorkspaceTablero.js';
import { NuevoTablero } from './pantallas/NuevoTablero.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/clientes" replace />} />
        <Route path="/clientes" element={<ListaClientes />} />
        <Route path="/clientes/:clienteSlug/nuevo-tablero" element={<NuevoTablero />} />
        <Route path="/clientes/:clienteSlug/tableros/:tableroSlug" element={<WorkspaceTablero />} />
        <Route path="*" element={<Navigate to="/clientes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
