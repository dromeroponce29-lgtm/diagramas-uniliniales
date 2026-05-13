import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { PlanNormalizacion, ItemCatalogo } from '@tipos/modelo';
import { apiPlanes, apiCatalogo, apiTableros } from '../api/cliente.js';
import { evaluarRIC } from '../../../../tipos/ric/motor.js';
import { sugerirPartidasDesdeHallazgos } from '../../../../tipos/ric/recetas.js';

function clp(n: number): string { return n.toLocaleString('es-CL'); }

function FilaPartida({
  partida, onCambiarCantidad
}: {
  partida: PlanNormalizacion['partidas'][number];
  onCambiarCantidad: (id: string, cantidad: number) => void;
}) {
  const [cantLocal, setCantLocal] = useState<number>(partida.cantidad);
  useEffect(() => setCantLocal(partida.cantidad), [partida.cantidad]);

  return (
    <tr className="border-b">
      <td className="py-1 pr-3 font-mono text-xs">{partida.itemCodigo}</td>
      <td className="py-1 pr-3">{partida.itemDescripcion}</td>
      <td className="py-1 pr-3 text-right">
        <input
          type="number" min={0} step="0.25"
          value={cantLocal}
          onChange={e => {
            const v = Number(e.target.value);
            setCantLocal(v);
            onCambiarCantidad(partida.id, v);
          }}
          className="border rounded px-1 py-0.5 w-16 text-right"
        />
      </td>
      <td className="py-1 pr-3">{partida.unidad}</td>
      <td className="py-1 pr-3 text-right">{clp(partida.precioUnitarioCLP)}</td>
      <td className="py-1 pr-3 text-right">{clp(Math.round(cantLocal * partida.precioUnitarioCLP))}</td>
    </tr>
  );
}

export function VistaPlan() {
  const { clienteSlug, tableroSlug, planId } = useParams<{
    clienteSlug: string; tableroSlug: string; planId: string;
  }>();
  const [plan, setPlan] = useState<PlanNormalizacion | null>(null);
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planLocalRef = useRef<PlanNormalizacion | null>(null);

  useEffect(() => { planLocalRef.current = plan; }, [plan]);

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

  function programarGuardado() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const p = planLocalRef.current;
      if (!p || !clienteSlug || !tableroSlug) return;
      apiPlanes.actualizar(clienteSlug, tableroSlug, p.id, {
        partidas: p.partidas.map(par => ({
          id: par.id,
          itemCodigo: par.itemCodigo,
          itemDescripcion: par.itemDescripcion,
          unidad: par.unidad,
          precioUnitarioCLP: par.precioUnitarioCLP,
          cantidad: par.cantidad,
          ...(par.hallazgoReglaId && { hallazgoReglaId: par.hallazgoReglaId }),
          ...(par.hallazgoComponenteId && { hallazgoComponenteId: par.hallazgoComponenteId }),
          ...(par.hallazgoCircuitoId && { hallazgoCircuitoId: par.hallazgoCircuitoId }),
          ...(par.notas && { notas: par.notas })
        })),
        ...(p.notas !== undefined && { notas: p.notas })
      })
        .then(setPlan)
        .catch(e => setError(String(e)));
    }, 1000);
  }

  function cambiarCantidad(id: string, cantidad: number) {
    if (!plan) return;
    const partidas = plan.partidas.map(p => p.id === id
      ? { ...p, cantidad, totalCLP: Math.round(p.precioUnitarioCLP * cantidad) }
      : p
    );
    const subtotal = partidas.reduce((a, x) => a + x.totalCLP, 0);
    const iva = plan.incluyeIVA ? Math.round(subtotal * plan.ivaPct / 100) : 0;
    setPlan({ ...plan, partidas, subtotalCLP: subtotal, ivaCLP: iva, totalCLP: subtotal + iva });
    programarGuardado();
  }

  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!plan) return <div className="p-4">Cargando plan…</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Plan #{plan.numero}</h1>
        <Link to={`/clientes/${clienteSlug}/tableros/${tableroSlug}?tab=ric`} className="text-sm text-blue-600 hover:underline">← Volver al tablero</Link>
      </div>
      <div className="text-sm text-slate-600 mb-4 flex items-center gap-3 flex-wrap">
        <span>Estado:
          <select
            value={plan.estado}
            onChange={async e => {
              if (!clienteSlug || !tableroSlug) return;
              try {
                const out = await apiPlanes.actualizar(clienteSlug, tableroSlug, plan.id, {
                  estado: e.target.value as PlanNormalizacion['estado']
                });
                setPlan(out);
              } catch (err) { setError(String(err)); }
            }}
            className="border rounded px-1 py-0.5 ml-1"
          >
            {(['borrador','enviado','aceptado','rechazado'] as const).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </span>
        <span>Creado: {new Date(plan.creadoEn).toLocaleDateString('es-CL')}</span>
        <label className="ml-1">
          IVA <input
            type="checkbox"
            checked={plan.incluyeIVA}
            onChange={async e => {
              if (!clienteSlug || !tableroSlug) return;
              try {
                const out = await apiPlanes.actualizar(clienteSlug, tableroSlug, plan.id, {
                  incluyeIVA: e.target.checked
                });
                setPlan(out);
              } catch (err) { setError(String(err)); }
            }}
          /> {plan.ivaPct}%
        </label>
      </div>

      <section className="bg-white border rounded p-3">
        <h2 className="font-semibold mb-2">Partidas
          <button
            onClick={async () => {
              if (!confirm('Esto reemplazará todas las partidas del plan por las sugeridas a partir de los hallazgos actuales. ¿Continuar?')) return;
              if (!plan || !clienteSlug || !tableroSlug) return;
              try {
                const tablero = await apiTableros.leer(clienteSlug, tableroSlug);
                const hallazgos = evaluarRIC(tablero).filter(h => h.resultado === 'no-cumple');
                const sugeridas = sugerirPartidasDesdeHallazgos(hallazgos, catalogo);
                const partidas = sugeridas.map(s => ({
                  itemCodigo: s.itemCatalogo.codigo,
                  itemDescripcion: s.itemCatalogo.descripcion,
                  unidad: s.itemCatalogo.unidad,
                  precioUnitarioCLP: s.itemCatalogo.precioUnitarioCLP,
                  cantidad: s.cantidad,
                  hallazgoReglaId: s.hallazgo.reglaId,
                  ...(s.hallazgo.componenteId && { hallazgoComponenteId: s.hallazgo.componenteId }),
                  ...(s.hallazgo.circuitoId && { hallazgoCircuitoId: s.hallazgo.circuitoId }),
                  ...(s.notasReceta && { notas: s.notasReceta })
                }));
                const actualizado = await apiPlanes.actualizar(clienteSlug, tableroSlug, plan.id, { partidas });
                setPlan(actualizado);
              } catch (e) {
                setError(String(e));
              }
            }}
            className="ml-2 text-sm text-blue-600 hover:underline font-normal"
          >Re-sugerir desde hallazgos</button>
        </h2>
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
                <FilaPartida key={p.id} partida={p} onCambiarCantidad={cambiarCantidad} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AgregarPartida
        catalogo={catalogo}
        onAgregar={(item, cantidad) => {
          if (!plan) return;
          const nueva = {
            id: `tmp-${Date.now()}`,
            itemCodigo: item.codigo,
            itemDescripcion: item.descripcion,
            unidad: item.unidad,
            precioUnitarioCLP: item.precioUnitarioCLP,
            cantidad,
            totalCLP: Math.round(item.precioUnitarioCLP * cantidad)
          };
          const partidas = [...plan.partidas, nueva];
          const subtotal = partidas.reduce((a, x) => a + x.totalCLP, 0);
          const iva = plan.incluyeIVA ? Math.round(subtotal * plan.ivaPct / 100) : 0;
          setPlan({ ...plan, partidas, subtotalCLP: subtotal, ivaCLP: iva, totalCLP: subtotal + iva });
          programarGuardado();
        }}
      />

      <section className="mt-3 ml-auto w-72 text-sm">
        <div className="flex justify-between py-0.5"><span>Subtotal:</span><span>CLP {clp(plan.subtotalCLP)}</span></div>
        <div className="flex justify-between py-0.5"><span>IVA:</span><span>CLP {clp(plan.ivaCLP)}</span></div>
        <div className="flex justify-between py-1 font-semibold border-t"><span>Total:</span><span>CLP {clp(plan.totalCLP)}</span></div>
      </section>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          value={plan.notas ?? ''}
          onChange={e => {
            if (!plan) return;
            const nuevo = { ...plan, notas: e.target.value };
            setPlan(nuevo);
            programarGuardado();
          }}
          rows={3}
          className="w-full border rounded p-2 text-sm"
        />
      </div>
    </div>
  );
}

function AgregarPartida({ catalogo, onAgregar }: {
  catalogo: ItemCatalogo[];
  onAgregar: (item: ItemCatalogo, cantidad: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);

  if (!abierto) {
    return <button onClick={() => setAbierto(true)} className="mt-2 text-sm text-blue-600 hover:underline">+ Agregar partida</button>;
  }

  return (
    <div className="mt-2 p-2 border rounded bg-amber-50 flex gap-2 items-center text-sm">
      <select value={seleccion} onChange={e => setSeleccion(e.target.value)} className="border rounded px-1 py-0.5 flex-1">
        <option value="">— seleccionar item del catálogo —</option>
        {catalogo.map(i => (
          <option key={i.id} value={i.id}>{i.codigo} — {i.descripcion}</option>
        ))}
      </select>
      <input type="number" min={0} step="0.25" value={cantidad} onChange={e => setCantidad(Number(e.target.value))} className="border rounded px-1 py-0.5 w-20 text-right" />
      <button
        onClick={() => {
          const it = catalogo.find(c => c.id === seleccion);
          if (!it) { alert('Seleccioná un item'); return; }
          onAgregar(it, cantidad);
          setSeleccion(''); setCantidad(1); setAbierto(false);
        }}
        className="px-2 py-0.5 bg-blue-600 text-white rounded"
      >Agregar</button>
      <button onClick={() => setAbierto(false)} className="px-2 py-0.5 border rounded">×</button>
    </div>
  );
}
