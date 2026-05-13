import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { PlanNormalizacion, ItemCatalogo } from '@tipos/modelo';
import { apiPlanes, apiCatalogo } from '../api/cliente.js';

function clp(n: number): string { return n.toLocaleString('es-CL'); }

export function VistaPlan() {
  const { clienteSlug, tableroSlug, planId } = useParams<{
    clienteSlug: string; tableroSlug: string; planId: string;
  }>();
  const [plan, setPlan] = useState<PlanNormalizacion | null>(null);
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteSlug || !tableroSlug || !planId) return;
    Promise.all([
      apiPlanes.listar(clienteSlug, tableroSlug),
      apiCatalogo.leer(clienteSlug)
    ])
      .then(([planes, cat]) => {
        const p = planes.find(p => p.id === planId);
        if (!p) { setError(`Plan ${planId} no existe`); return; }
        setPlan(p);
        setCatalogo(cat);
      })
      .catch(e => setError(String(e)));
  }, [clienteSlug, tableroSlug, planId]);

  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!plan) return <div className="p-4">Cargando plan…</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Plan #{plan.numero}</h1>
        <Link to={`/clientes/${clienteSlug}/tableros/${tableroSlug}?tab=ric`} className="text-sm text-blue-600 hover:underline">← Volver al tablero</Link>
      </div>
      <div className="text-sm text-slate-600 mb-4">
        Estado: <span className="font-medium">{plan.estado}</span>
        {' · '}
        Creado: {new Date(plan.creadoEn).toLocaleDateString('es-CL')}
        {' · '}
        IVA: {plan.incluyeIVA ? `${plan.ivaPct}%` : 'no incluido'}
      </div>

      <section className="bg-white border rounded p-3">
        <h2 className="font-semibold mb-2">Partidas</h2>
        {plan.partidas.length === 0 ? (
          <p className="text-slate-500 italic text-sm">Sin partidas en este plan.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600 border-b">
              <tr>
                <th className="py-1 pr-3">Código</th>
                <th className="py-1 pr-3">Descripción</th>
                <th className="py-1 pr-3 text-right">Cant.</th>
                <th className="py-1 pr-3">Un.</th>
                <th className="py-1 pr-3 text-right">P. Unit.</th>
                <th className="py-1 pr-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {plan.partidas.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="py-1 pr-3 font-mono text-xs">{p.itemCodigo}</td>
                  <td className="py-1 pr-3">{p.itemDescripcion}</td>
                  <td className="py-1 pr-3 text-right">{p.cantidad}</td>
                  <td className="py-1 pr-3">{p.unidad}</td>
                  <td className="py-1 pr-3 text-right">{clp(p.precioUnitarioCLP)}</td>
                  <td className="py-1 pr-3 text-right">{clp(p.totalCLP)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-3 ml-auto w-72 text-sm">
        <div className="flex justify-between py-0.5"><span>Subtotal:</span><span>CLP {clp(plan.subtotalCLP)}</span></div>
        <div className="flex justify-between py-0.5"><span>IVA:</span><span>CLP {clp(plan.ivaCLP)}</span></div>
        <div className="flex justify-between py-1 font-semibold border-t"><span>Total:</span><span>CLP {clp(plan.totalCLP)}</span></div>
      </section>
    </div>
  );
}
