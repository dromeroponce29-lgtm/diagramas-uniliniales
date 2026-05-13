// Panel que ejecuta y muestra la auditoría normativa IA del tablero.
// Complementa las 14 reglas determinísticas con hallazgos cualitativos
// que requieren analizar las fotos.
import { useEffect, useState } from 'react';
import { apiAuditoria } from '../api/cliente.js';
import type { ResultadoAuditoria, SeveridadAuditoria, EstadoGlobalAuditoria } from '@tipos/ric/auditoria';

interface Props {
  clienteSlug: string;
  tableroSlug: string;
}

const COLOR_SEVERIDAD: Record<SeveridadAuditoria, string> = {
  critica: 'bg-red-100 text-red-700 border-red-300',
  mayor: 'bg-orange-100 text-orange-700 border-orange-300',
  menor: 'bg-amber-100 text-amber-700 border-amber-300',
  observacion: 'bg-blue-100 text-blue-700 border-blue-300'
};

const COLOR_ESTADO: Record<EstadoGlobalAuditoria, string> = {
  'apto': 'bg-green-100 text-green-800',
  'apto-con-observaciones': 'bg-amber-100 text-amber-800',
  'no-apto': 'bg-red-100 text-red-800'
};

export function PanelAuditoria({ clienteSlug, tableroSlug }: Props) {
  const [auditoria, setAuditoria] = useState<ResultadoAuditoria | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiAuditoria.leer(clienteSlug, tableroSlug)
      .then(setAuditoria)
      .catch(() => { /* sin auditoría aún, ignorar */ });
  }, [clienteSlug, tableroSlug]);

  async function ejecutar() {
    setCargando(true); setError(null);
    try {
      const r = await apiAuditoria.ejecutar(clienteSlug, tableroSlug);
      setAuditoria(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="mt-4 border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Auditoría IA del tablero</h3>
        <button
          onClick={ejecutar}
          disabled={cargando}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >{cargando ? 'Auditando…' : (auditoria ? 'Re-ejecutar auditoría' : 'Ejecutar auditoría')}</button>
      </div>
      <p className="text-xs text-slate-500 italic mb-2">
        Un inspector SEC virtual analiza las fotos + datos del tablero y emite hallazgos cualitativos
        (cosas que las 14 reglas determinísticas no detectan: estado del gabinete, cables sueltos, etc.).
      </p>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      {!auditoria && !cargando && (
        <p className="text-slate-500 italic text-sm">Aún no se ejecutó auditoría sobre este tablero.</p>
      )}

      {auditoria && (
        <>
          <div className={`px-3 py-2 rounded mb-2 text-sm ${COLOR_ESTADO[auditoria.estadoGlobal]}`}>
            <strong>Estado: {auditoria.estadoGlobal}.</strong> {auditoria.resumenEjecutivo}
          </div>
          <div className="text-xs text-slate-500 mb-2">
            Generada: {new Date(auditoria.generadoEn).toLocaleString('es-CL')} · modelo: {auditoria.modelo}
            {auditoria.hallazgos.length > 0 && ` · ${auditoria.hallazgos.length} hallazgos`}
          </div>

          <ul className="space-y-2">
            {auditoria.hallazgos.map(h => (
              <li key={h.id} className={`p-2 border rounded ${COLOR_SEVERIDAD[h.severidad]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {h.codigo} · {h.titulo}
                    </div>
                    <div className="text-xs">{h.descripcion}</div>
                    {h.referenciaNormativa && (
                      <div className="text-xs italic mt-1">📖 {h.referenciaNormativa}</div>
                    )}
                  </div>
                  <span className="text-xs uppercase font-semibold">{h.severidad}</span>
                </div>
                <details className="mt-1 text-xs">
                  <summary className="cursor-pointer">Plan de corrección</summary>
                  <div className="mt-1 pl-2 space-y-1">
                    <div><strong>Acción:</strong> {h.accionCorrectiva}</div>
                    {h.pasosEjecucion.length > 0 && (
                      <div>
                        <strong>Pasos:</strong>
                        <ol className="list-decimal list-inside ml-2">
                          {h.pasosEjecucion.map((p, i) => <li key={i}>{p}</li>)}
                        </ol>
                      </div>
                    )}
                    {h.materialesRequeridos.length > 0 && (
                      <div>
                        <strong>Materiales:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {h.materialesRequeridos.map((m, i) => (
                            <li key={i}>{m.descripcion} — {m.cantidad} {m.unidad}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <strong>HH:</strong> {h.tiempoEstimadoHoras}h · <strong>Costo:</strong> CLP {h.costoEstimadoCLP.toLocaleString('es-CL')} · <strong>Plazo:</strong> {h.prioridadEjecucion}
                    </div>
                    {h.circuitosAfectados.length > 0 && (
                      <div><strong>Circuitos afectados:</strong> {h.circuitosAfectados.map(n => n === 0 ? 'IG' : `C${n}`).join(', ')}</div>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
