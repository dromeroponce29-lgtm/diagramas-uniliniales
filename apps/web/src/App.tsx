import { useRef } from 'react';
import { useExtraccionStore } from './estado/extraccionStore.js';

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { estadoCarga, resultado, error, procesar, reset } = useExtraccionStore();

  function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (archivo) {
      procesar(archivo);
    }
  }

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Diagramas Uniliniales</h1>
        <p className="text-slate-600 mt-1">
          Plan 1 — MVP: subir una foto de tablero y ver los componentes detectados
          por Claude + OpenAI (reconciliados).
        </p>
      </header>

      <section className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Subir foto del tablero</h2>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={alSeleccionarArchivo}
          disabled={estadoCarga === 'procesando'}
          className="block"
        />
        <div className="mt-3 text-sm text-slate-500">
          La foto se envía al backend, que llama a Claude y OpenAI en paralelo
          y consolida los resultados.
        </div>
      </section>

      {estadoCarga === 'procesando' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-blue-900">
          Procesando foto... (puede tomar 10-20 segundos)
        </div>
      )}

      {estadoCarga === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-900">
          <strong>Error:</strong> {error}
          <button
            onClick={reset}
            className="ml-4 underline"
          >Reintentar</button>
        </div>
      )}

      {estadoCarga === 'completado' && resultado && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">2. Componentes detectados</h2>

          <div className="mb-4 text-sm text-slate-600">
            <span className="mr-4">
              <strong>Foto ID:</strong> {resultado.fotoId}
            </span>
            <span className="mr-4">
              <strong>Calidad:</strong> {resultado.calidadFoto}
            </span>
            <span>
              <strong>Componentes:</strong> {resultado.componentes.length}
            </span>
          </div>

          {resultado.problemasFoto.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong>Problemas reportados en la foto:</strong>
              <ul className="list-disc ml-6 mt-1">
                {resultado.problemasFoto.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2 pr-2">Tipo</th>
                <th className="py-2 pr-2">Marca</th>
                <th className="py-2 pr-2">Modelo</th>
                <th className="py-2 pr-2">Calibre</th>
                <th className="py-2 pr-2">Polos</th>
                <th className="py-2 pr-2">Confianza</th>
                <th className="py-2">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {resultado.componentes.map(c => (
                <tr key={c.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{c.tipo}</td>
                  <td className="py-2 pr-2">{c.marca ?? '—'}</td>
                  <td className="py-2 pr-2">{c.modelo ?? '—'}</td>
                  <td className="py-2 pr-2">{c.calibreA ? `${c.calibreA} A` : '—'}</td>
                  <td className="py-2 pr-2">{c.polos ?? '—'}</td>
                  <td className="py-2 pr-2">
                    <span className={claseConfianza(c.procedencia.confianza)}>
                      {c.procedencia.confianza}
                    </span>
                  </td>
                  <td className="py-2">{c.procedencia.fuente}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6">
            <button
              onClick={reset}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded"
            >Procesar otra foto</button>
          </div>
        </section>
      )}
    </div>
  );
}

function claseConfianza(c: string): string {
  switch (c) {
    case 'alta': return 'px-2 py-0.5 rounded bg-green-100 text-green-800';
    case 'media': return 'px-2 py-0.5 rounded bg-yellow-100 text-yellow-800';
    case 'baja': return 'px-2 py-0.5 rounded bg-orange-100 text-orange-800';
    case 'discrepancia': return 'px-2 py-0.5 rounded bg-red-100 text-red-800';
    default: return '';
  }
}
