// Informe técnico completo para entregar al cliente.
//
// Render plano (sin tabs, sin paneles laterales) que reúne:
//   1. Portada
//   2. Datos generales del tablero
//   3. Diagrama unilineal
//   4. Cuadro de cargas
//   5. Cuadro de alimentadores
//   6. Hallazgos de auditoría RIC (si existen)
//   7. Planillas de levantamiento de terreno
//   8. Plan de normalización con partidas (si existen)
//
// Cada sección tiene la clase `informe-seccion` para activar
// page-break-before en @media print. Al cargar la vista dispara
// automáticamente `window.print()` configurado para A4 portrait
// con márgenes 15mm y tipografía serif.
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Tablero, Cliente, PlanNormalizacion } from '@tipos/modelo';
import type { ResultadoAuditoria } from '@tipos/ric/auditoria';
import { useTableroStore } from '../../estado/tableroStore.js';
import { useClienteStore } from '../../estado/clienteStore.js';
import { apiAuditoria, apiPlanes } from '../../api/cliente.js';
import { DiagramaSVG } from '../DiagramaSVG.js';

// ID del <style> temporal para configurar @page A4 + márgenes durante la impresión.
const STYLE_ID_INFORME = 'estilo-page-informe-completo';

function configurarImpresionInforme(): () => void {
  const style = document.createElement('style');
  style.id = STYLE_ID_INFORME;
  // A4 portrait, márgenes 15mm.
  style.textContent = `@page { size: A4 portrait; margin: 15mm; }`;
  document.head.appendChild(style);
  document.body.setAttribute('data-print-mode', 'informe-completo');

  return () => {
    document.body.removeAttribute('data-print-mode');
    document.getElementById(STYLE_ID_INFORME)?.remove();
  };
}

function fechaHoyLegible(): string {
  return new Date().toLocaleDateString('es-CL', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function val(...candidatos: (string | number | undefined | null)[]): string {
  for (const c of candidatos) {
    if (c === 0) return '0';
    if (c !== undefined && c !== null && String(c).trim() !== '') return String(c);
  }
  return '—';
}

export function InformeCompleto() {
  const { clienteSlug, tableroSlug } = useParams();
  const navigate = useNavigate();
  const { tablero, cargar, limpiar } = useTableroStore();
  const { clientes, cargarTodos } = useClienteStore();
  const [auditoria, setAuditoria] = useState<ResultadoAuditoria | null>(null);
  const [planes, setPlanes] = useState<PlanNormalizacion[]>([]);
  const [listoParaImprimir, setListoParaImprimir] = useState(false);

  // Cargar tablero y cliente al montar.
  useEffect(() => {
    if (clienteSlug && tableroSlug) {
      void cargar(clienteSlug, tableroSlug);
    }
    return () => limpiar();
  }, [clienteSlug, tableroSlug, cargar, limpiar]);

  useEffect(() => {
    if (clientes.length === 0) cargarTodos();
  }, [clientes.length, cargarTodos]);

  // Cargar auditoría y planes (no bloqueante; si no existen, simplemente no se incluyen).
  useEffect(() => {
    if (!clienteSlug || !tableroSlug) return;
    apiAuditoria.leer(clienteSlug, tableroSlug)
      .then(setAuditoria)
      .catch(() => { /* sin auditoría aún */ });
    apiPlanes.listar(clienteSlug, tableroSlug)
      .then(setPlanes)
      .catch(() => { /* sin planes */ });
  }, [clienteSlug, tableroSlug]);

  // Configurar CSS @page de impresión + lanzar diálogo cuando el tablero esté listo.
  useEffect(() => {
    if (!tablero) return;
    const cleanup = configurarImpresionInforme();
    // Pequeño retardo para que el SVG y los datos terminen de renderizar antes de imprimir.
    const t = setTimeout(() => {
      setListoParaImprimir(true);
      window.print();
    }, 600);

    const onAfterPrint = () => {
      // Mantenemos la vista accesible tras imprimir; el usuario puede volver con el botón.
    };
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', onAfterPrint);
      cleanup();
    };
    // Solo en la primera vez que llega el tablero (evita re-disparar print al refrescar datos).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablero?.id]);

  if (!tablero) {
    return <div className="p-8 text-slate-500">Cargando informe...</div>;
  }
  const cliente = clientes.find(c => c.slug === clienteSlug);

  return (
    <div className="vista-informe bg-white text-slate-900 max-w-[210mm] mx-auto p-8 print:p-0 print:max-w-none">
      {/* Barra de controles — solo en pantalla, oculta al imprimir */}
      <div className="imprimir-oculto mb-6 flex items-center justify-between gap-2 border-b pb-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:underline"
        >← Volver al tablero</button>
        <div className="flex items-center gap-2">
          {!listoParaImprimir && (
            <span className="text-xs text-slate-500 italic">Preparando informe…</span>
          )}
          <button
            onClick={() => window.print()}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >🖨️ Imprimir / Guardar como PDF</button>
        </div>
      </div>

      {/* SECCIÓN 1 — Portada */}
      <SeccionPortada tablero={tablero} cliente={cliente} />

      {/* SECCIÓN 2 — Datos generales */}
      <SeccionDatosGenerales tablero={tablero} cliente={cliente} />

      {/* SECCIÓN 3 — Diagrama unilineal */}
      <SeccionDiagrama tablero={tablero} cliente={cliente} />

      {/* SECCIÓN 4 — Cuadro de cargas */}
      <SeccionCuadroCargas tablero={tablero} />

      {/* SECCIÓN 5 — Cuadro de alimentadores */}
      <SeccionCuadroAlimentadores tablero={tablero} />

      {/* SECCIÓN 6 — Auditoría RIC (opcional) */}
      {auditoria && auditoria.hallazgos.length > 0 && (
        <SeccionAuditoria auditoria={auditoria} />
      )}

      {/* SECCIÓN 7 — Planillas de levantamiento de terreno */}
      <SeccionPlanillasLevantamiento tablero={tablero} cliente={cliente} />

      {/* SECCIÓN 8 — Planes de normalización (opcional) */}
      {planes.length > 0 && (
        <SeccionPlanes planes={planes} />
      )}

      <div className="imprimir-oculto mt-8 text-center">
        <Link
          to={`/clientes/${clienteSlug}/tableros/${tableroSlug}`}
          className="text-sm text-blue-600 hover:underline"
        >← Volver al tablero</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-secciones del informe
// ---------------------------------------------------------------------------

function EncabezadoSeccion({ titulo, tablero, cliente }: {
  titulo: string;
  tablero: Tablero;
  cliente?: Cliente;
}) {
  return (
    <header className="mb-4 pb-2 border-b border-slate-400">
      <div className="text-xs text-slate-600 flex justify-between">
        <span>{val(cliente?.nombre)} — Tablero {tablero.codigo}</span>
        <span>{fechaHoyLegible()}</span>
      </div>
      <h2 className="text-xl font-bold mt-1">{titulo}</h2>
    </header>
  );
}

function SeccionPortada({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const v = tablero.vineta ?? {};
  const instalador = val(v.instaladorNombre, cliente?.instaladorPredeterminadoNombre);
  return (
    <section className="informe-seccion min-h-[24cm] flex flex-col justify-between">
      <div className="text-center pt-12">
        <p className="text-sm tracking-widest text-slate-600 uppercase">Informe técnico</p>
        <h1 className="text-3xl font-bold mt-2">DIAGRAMA UNILINEAL</h1>
        <p className="text-sm text-slate-600 mt-1">
          según Pliego Técnico RIC N°18 — SEC Chile
        </p>
      </div>

      <div className="mt-12 max-w-md mx-auto border border-slate-400 rounded p-6 space-y-3 text-sm">
        <Campo etiqueta="Cliente" valor={val(cliente?.nombre)} />
        <Campo etiqueta="Dirección" valor={val(cliente?.direccion)} />
        <Campo etiqueta="Código tablero" valor={tablero.codigo} />
        <Campo etiqueta="Nombre tablero" valor={tablero.nombre} />
        <Campo etiqueta="Ubicación" valor={val(tablero.ubicacion)} />
        <Campo etiqueta="Fecha de emisión" valor={fechaHoyLegible()} />
        <Campo etiqueta="Instalador" valor={instalador} />
        <Campo etiqueta="RUT instalador" valor={val(v.instaladorRUT, cliente?.instaladorPredeterminadoRUT)} />
        <Campo etiqueta="Clase SEC" valor={val(v.instaladorClaseSEC, cliente?.instaladorPredeterminadoClaseSEC)} />
      </div>

      <div className="text-center pb-8 mt-12">
        <p className="text-xs text-slate-600 italic max-w-md mx-auto">
          Documento preliminar — verificar y firmar por instalador eléctrico
          autorizado SEC antes de su presentación oficial.
        </p>
      </div>
    </section>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 pb-1">
      <span className="text-slate-600">{etiqueta}:</span>
      <span className="font-medium text-right">{valor}</span>
    </div>
  );
}

function SeccionDatosGenerales({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const ac: Partial<NonNullable<Tablero['acometida']>> = tablero.acometida ?? {};
  const al: Partial<NonNullable<Tablero['alimentadorEntrada']>> = tablero.alimentadorEntrada ?? {};
  const pt: Partial<NonNullable<Tablero['puestaATierra']>> = tablero.puestaATierra ?? {};

  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="1. Datos generales del tablero" tablero={tablero} cliente={cliente} />
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <Campo etiqueta="Código" valor={tablero.codigo} />
        <Campo etiqueta="Tipo" valor={tablero.tipo} />
        <Campo etiqueta="Tensión del sistema" valor={tablero.tensionSistema} />
        <Campo etiqueta="Esquema de tierra" valor={tablero.esquemaTierra} />
        <Campo etiqueta="Frecuencia" valor={tablero.frecuenciaHz ? `${tablero.frecuenciaHz} Hz` : '—'} />
        <Campo etiqueta="Capacidad nominal" valor={tablero.capacidadNominalA ? `${tablero.capacidadNominalA} A` : '—'} />
        <Campo etiqueta="Potencia contratada" valor={tablero.potenciaContratadaKW ? `${tablero.potenciaContratadaKW} kW` : '—'} />
        <Campo etiqueta="Corriente nominal" valor={tablero.corrienteNominalA ? `${tablero.corrienteNominalA} A` : '—'} />
        <Campo etiqueta="Ubicación" valor={val(tablero.ubicacion)} />
        <Campo etiqueta="Espacios totales" valor={val(tablero.espaciosTotales)} />
      </div>

      <h3 className="font-bold mt-6 mb-2 text-sm">Acometida</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <Campo etiqueta="Tipo" valor={val(ac.tipo)} />
        <Campo etiqueta="Ubicación" valor={val(ac.ubicacion)} />
      </div>

      <h3 className="font-bold mt-6 mb-2 text-sm">Alimentador de entrada</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <Campo etiqueta="Sección conductor" valor={al.seccionConductorMM2 ? `${al.seccionConductorMM2} mm²` : '—'} />
        <Campo etiqueta="Longitud" valor={al.longitudM ? `${al.longitudM} m` : '—'} />
        <Campo etiqueta="Canalización" valor={val(al.canalizacionTipo)} />
        <Campo etiqueta="Diámetro" valor={al.canalizacionDiametroMM ? `Ø${al.canalizacionDiametroMM} mm` : '—'} />
        <Campo etiqueta="Material canalización" valor={val(al.canalizacionMaterial)} />
        <Campo etiqueta="Capacidad corriente" valor={al.capacidadCorrienteA ? `${al.capacidadCorrienteA} A` : '—'} />
      </div>

      <h3 className="font-bold mt-6 mb-2 text-sm">Puesta a tierra</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <Campo etiqueta="Resistencia medida" valor={pt.resistenciaOhmMedida !== undefined ? `${pt.resistenciaOhmMedida} Ω` : '—'} />
        <Campo etiqueta="Resistencia proyectada" valor={pt.resistenciaOhmProyectada !== undefined ? `${pt.resistenciaOhmProyectada} Ω` : '—'} />
        <Campo etiqueta="Tipo de electrodo" valor={val(pt.tipoElectrodo)} />
        <Campo etiqueta="Fecha medición" valor={val(pt.fechaMedicion)} />
      </div>

      {tablero.notasGenerales && (
        <>
          <h3 className="font-bold mt-6 mb-2 text-sm">Notas generales</h3>
          <p className="text-sm whitespace-pre-line text-slate-800">{tablero.notasGenerales}</p>
        </>
      )}
    </section>
  );
}

function SeccionDiagrama({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="2. Diagrama unilineal" tablero={tablero} cliente={cliente} />
      <div className="w-full border border-slate-300 rounded p-2" style={{ minHeight: '500px' }}>
        <DiagramaSVG tablero={tablero} cliente={cliente} onClicComponente={() => undefined} />
      </div>
    </section>
  );
}

function SeccionCuadroCargas({ tablero }: { tablero: Tablero }) {
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="3. Cuadro de cargas" tablero={tablero} />
      {tablero.circuitos.length === 0 ? (
        <p className="text-sm italic text-slate-600">Sin circuitos definidos para este tablero.</p>
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-700 text-left">
              <th className="py-1 px-1">Nº</th>
              <th className="py-1 px-1">Destino</th>
              <th className="py-1 px-1">Uso</th>
              <th className="py-1 px-1">P (W)</th>
              <th className="py-1 px-1">I (A)</th>
              <th className="py-1 px-1">mm²</th>
              <th className="py-1 px-1">Long. m</th>
              <th className="py-1 px-1">Canaliz.</th>
              <th className="py-1 px-1">Protección</th>
            </tr>
          </thead>
          <tbody>
            {tablero.circuitos.map(c => {
              const prot = tablero.componentes.find(co => co.id === c.proteccionComponenteId);
              const protTxt = prot
                ? `C${prot.calibreA ?? '?'} ${prot.polos ?? '?'}P${prot.curva ? ` ${prot.curva}` : ''}`
                : '—';
              const canalizTxt = c.canalizacionTipo
                ? `${c.canalizacionTipo}${c.canalizacionDiametroMM ? ` Ø${c.canalizacionDiametroMM}` : ''}`
                : '—';
              return (
                <tr key={c.id} className="border-b border-slate-300">
                  <td className="py-1 px-1">{c.numero}</td>
                  <td className="py-1 px-1">{c.destino === 'pendiente' || !c.destino ? '—' : c.destino}</td>
                  <td className="py-1 px-1">{c.uso === 'pendiente' ? '—' : c.uso}</td>
                  <td className="py-1 px-1">{c.cargaW ?? '—'}</td>
                  <td className="py-1 px-1">{c.corrienteA ?? '—'}</td>
                  <td className="py-1 px-1">{c.seccionConductorMM2 ?? '—'}</td>
                  <td className="py-1 px-1">{c.longitudM ?? '—'}</td>
                  <td className="py-1 px-1">{canalizTxt}</td>
                  <td className="py-1 px-1">{protTxt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SeccionCuadroAlimentadores({ tablero }: { tablero: Tablero }) {
  const a = tablero.alimentadorEntrada ?? {};
  const ig = tablero.componentes.find(c => c.tipo === 'interruptor-general');

  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="4. Cuadro de alimentadores" tablero={tablero} />
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-700 text-left">
            <th className="py-1 px-1">Alimentador</th>
            <th className="py-1 px-1">mm²</th>
            <th className="py-1 px-1">Long.</th>
            <th className="py-1 px-1">Canalización</th>
            <th className="py-1 px-1">Capac. A</th>
            <th className="py-1 px-1">In</th>
            <th className="py-1 px-1">Icu kA</th>
            <th className="py-1 px-1">Curva</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-300">
            <td className="py-1 px-1">Acometida → {tablero.codigo}</td>
            <td className="py-1 px-1">{a.seccionConductorMM2 ?? '—'}</td>
            <td className="py-1 px-1">{a.longitudM ?? '—'}</td>
            <td className="py-1 px-1">
              {a.canalizacionTipo
                ? `${a.canalizacionTipo} Ø${a.canalizacionDiametroMM ?? '?'} ${a.canalizacionMaterial ?? ''}`.trim()
                : '—'}
            </td>
            <td className="py-1 px-1">{a.capacidadCorrienteA ?? '—'}</td>
            <td className="py-1 px-1">{ig?.calibreA ? `${ig.calibreA}A` : '—'}</td>
            <td className="py-1 px-1">{ig?.capacidadCortocircuitoKA ?? '—'}</td>
            <td className="py-1 px-1">{ig?.curva ?? '—'}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function SeccionAuditoria({ auditoria }: { auditoria: ResultadoAuditoria }) {
  return (
    <section className="informe-seccion">
      <header className="mb-4 pb-2 border-b border-slate-400">
        <h2 className="text-xl font-bold">5. Hallazgos de auditoría RIC</h2>
        <p className="text-xs text-slate-600 mt-1">
          Estado global: <strong>{auditoria.estadoGlobal}</strong> · {auditoria.hallazgos.length} hallazgos
        </p>
      </header>
      <p className="text-sm mb-4">{auditoria.resumenEjecutivo}</p>
      <ul className="space-y-3">
        {auditoria.hallazgos.map(h => (
          <li key={h.id} className="border border-slate-300 rounded p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <strong>{h.codigo} · {h.titulo}</strong>
              <span className="text-xs uppercase">{h.severidad}</span>
            </div>
            <div className="text-xs mt-1">{h.descripcion}</div>
            {h.referenciaNormativa && (
              <div className="text-xs italic mt-1">Ref: {h.referenciaNormativa}</div>
            )}
            <div className="text-xs mt-1"><strong>Acción:</strong> {h.accionCorrectiva}</div>
            <div className="text-xs"><strong>HH:</strong> {h.tiempoEstimadoHoras}h · <strong>Costo estimado:</strong> CLP {h.costoEstimadoCLP.toLocaleString('es-CL')} · <strong>Prioridad:</strong> {h.prioridadEjecucion}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SECCIÓN 6 — Planillas de levantamiento de terreno
// ---------------------------------------------------------------------------
// Reúne los datos que el instalador completó en sitio. Se muestra una
// sub-planilla por tema (acometida, alimentador, puesta a tierra, viñeta,
// componentes, circuitos, anotaciones). Cada sub-planilla queda visible
// incluso si está vacía, con un mensaje "Sin datos de levantamiento", para
// que el cliente vea claramente qué se levantó y qué quedó pendiente.

function SeccionPlanillasLevantamiento({ tablero, cliente }: {
  tablero: Tablero;
  cliente?: Cliente;
}) {
  return (
    <>
      <PlanillaAcometida tablero={tablero} cliente={cliente} />
      <PlanillaAlimentadorEntrada tablero={tablero} cliente={cliente} />
      <PlanillaPuestaATierra tablero={tablero} cliente={cliente} />
      <PlanillaVineta tablero={tablero} cliente={cliente} />
      <PlanillaComponentesTerreno tablero={tablero} cliente={cliente} />
      <PlanillaLevantamientoCircuitos tablero={tablero} cliente={cliente} />
      <PlanillaAnotacionesLevantamiento tablero={tablero} cliente={cliente} />
    </>
  );
}

// Mensaje uniforme cuando una planilla no tiene datos completados.
function SinDatosLevantamiento() {
  return (
    <p className="text-sm italic text-slate-500 mt-2">
      Sin datos de levantamiento.
    </p>
  );
}

function tieneAlgunValor(obj: Record<string, unknown> | undefined | null): boolean {
  if (!obj) return false;
  return Object.values(obj).some(v =>
    v !== undefined && v !== null && String(v).trim() !== ''
  );
}

function PlanillaAcometida({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const ac = tablero.acometida;
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.1 Planilla — Acometida" tablero={tablero} cliente={cliente} />
      {!tieneAlgunValor(ac as unknown as Record<string, unknown>) ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50 w-1/3">Tipo de acometida</th>
              <td className="py-1 px-2">{val(ac?.tipo)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Ubicación</th>
              <td className="py-1 px-2">{val(ac?.ubicacion)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Tablero de origen</th>
              <td className="py-1 px-2">{val(ac?.tableroOrigenId)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Notas de terreno</th>
              <td className="py-1 px-2 whitespace-pre-line">{val(ac?.notas)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanillaAlimentadorEntrada({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const a = tablero.alimentadorEntrada;
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.2 Planilla — Alimentador de entrada" tablero={tablero} cliente={cliente} />
      {!tieneAlgunValor(a as unknown as Record<string, unknown>) ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50 w-1/3">Sección conductor</th>
              <td className="py-1 px-2">{a?.seccionConductorMM2 ? `${a.seccionConductorMM2} mm²` : '—'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Conductores por fase</th>
              <td className="py-1 px-2">{val(a?.conductoresPorFase)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Longitud</th>
              <td className="py-1 px-2">{a?.longitudM ? `${a.longitudM} m` : '—'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Canalización tipo</th>
              <td className="py-1 px-2">{val(a?.canalizacionTipo)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Canalización diámetro</th>
              <td className="py-1 px-2">{a?.canalizacionDiametroMM ? `Ø${a.canalizacionDiametroMM} mm` : '—'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Material canalización</th>
              <td className="py-1 px-2">{val(a?.canalizacionMaterial)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Capacidad de corriente</th>
              <td className="py-1 px-2">{a?.capacidadCorrienteA ? `${a.capacidadCorrienteA} A` : '—'}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanillaPuestaATierra({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const pt = tablero.puestaATierra;
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.3 Planilla — Puesta a tierra" tablero={tablero} cliente={cliente} />
      {!tieneAlgunValor(pt as unknown as Record<string, unknown>) ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50 w-1/3">Resistencia medida</th>
              <td className="py-1 px-2">{pt?.resistenciaOhmMedida !== undefined ? `${pt.resistenciaOhmMedida} Ω` : '—'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Resistencia proyectada</th>
              <td className="py-1 px-2">{pt?.resistenciaOhmProyectada !== undefined ? `${pt.resistenciaOhmProyectada} Ω` : '—'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Instrumento de medición</th>
              <td className="py-1 px-2">{val(pt?.instrumentoMedicion)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Fecha de medición</th>
              <td className="py-1 px-2">{val(pt?.fechaMedicion)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Tipo de electrodo</th>
              <td className="py-1 px-2">{val(pt?.tipoElectrodo)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Notas de terreno</th>
              <td className="py-1 px-2 whitespace-pre-line">{val(pt?.notas)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanillaVineta({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const v = tablero.vineta;
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.4 Planilla — Viñeta del tablero" tablero={tablero} cliente={cliente} />
      {!tieneAlgunValor(v as unknown as Record<string, unknown>) ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50 w-1/3">Número de lámina</th>
              <td className="py-1 px-2">{val(v?.numeroLamina)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Revisión</th>
              <td className="py-1 px-2">{val(v?.revision)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Fecha de emisión</th>
              <td className="py-1 px-2">{val(v?.fechaEmision)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Nombre del proyecto</th>
              <td className="py-1 px-2">{val(v?.proyectoNombre)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Instalador</th>
              <td className="py-1 px-2">{val(v?.instaladorNombre)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">RUT instalador</th>
              <td className="py-1 px-2">{val(v?.instaladorRUT)}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <th className="py-1 px-2 text-left bg-slate-50">Clase SEC</th>
              <td className="py-1 px-2">{val(v?.instaladorClaseSEC)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanillaComponentesTerreno({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const componentes = tablero.componentes ?? [];
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.5 Planilla — Componentes levantados en terreno" tablero={tablero} cliente={cliente} />
      {componentes.length === 0 ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-700 text-left">
              <th className="py-1 px-1">ID</th>
              <th className="py-1 px-1">Tipo</th>
              <th className="py-1 px-1">Marca</th>
              <th className="py-1 px-1">Modelo</th>
              <th className="py-1 px-1">In (A)</th>
              <th className="py-1 px-1">Polos</th>
              <th className="py-1 px-1">Curva</th>
              <th className="py-1 px-1">Idn (mA)</th>
              <th className="py-1 px-1">Icu kA</th>
              <th className="py-1 px-1">Pos.</th>
              <th className="py-1 px-1">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {componentes.map(c => {
              const pos = c.posicionEnTablero
                ? `F${c.posicionEnTablero.fila}·C${c.posicionEnTablero.columna}`
                : '—';
              return (
                <tr key={c.id} className="border-b border-slate-300">
                  <td className="py-1 px-1 font-mono text-[10px]">{c.id.slice(-6)}</td>
                  <td className="py-1 px-1">{c.tipo}</td>
                  <td className="py-1 px-1">{val(c.marca)}</td>
                  <td className="py-1 px-1">{val(c.modelo)}</td>
                  <td className="py-1 px-1">{val(c.calibreA)}</td>
                  <td className="py-1 px-1">{val(c.polos)}</td>
                  <td className="py-1 px-1">{val(c.curva)}</td>
                  <td className="py-1 px-1">{val(c.sensibilidadMA)}</td>
                  <td className="py-1 px-1">{val(c.capacidadCortocircuitoKA)}</td>
                  <td className="py-1 px-1">{pos}</td>
                  <td className="py-1 px-1 text-[10px]">{c.procedencia?.fuente ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanillaLevantamientoCircuitos({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const circuitos = tablero.circuitos ?? [];
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.6 Planilla — Levantamiento por circuito" tablero={tablero} cliente={cliente} />
      {circuitos.length === 0 ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-700 text-left">
              <th className="py-1 px-1">Nº</th>
              <th className="py-1 px-1">Destino</th>
              <th className="py-1 px-1">Uso</th>
              <th className="py-1 px-1">Cond. mm²</th>
              <th className="py-1 px-1">PE mm²</th>
              <th className="py-1 px-1">Mat.</th>
              <th className="py-1 px-1">Aisl.</th>
              <th className="py-1 px-1">Long. m</th>
              <th className="py-1 px-1">Canaliz.</th>
              <th className="py-1 px-1">Ø mm</th>
              <th className="py-1 px-1">Mat. canaliz.</th>
              <th className="py-1 px-1">Rótulo leído</th>
            </tr>
          </thead>
          <tbody>
            {circuitos.map(c => (
              <tr key={c.id} className="border-b border-slate-300">
                <td className="py-1 px-1">{c.numero}</td>
                <td className="py-1 px-1">{c.destino === 'pendiente' || !c.destino ? '—' : c.destino}</td>
                <td className="py-1 px-1">{c.uso === 'pendiente' ? '—' : c.uso}</td>
                <td className="py-1 px-1">{val(c.seccionConductorMM2)}</td>
                <td className="py-1 px-1">{val(c.seccionConductorPEMM2)}</td>
                <td className="py-1 px-1">{val(c.materialConductor)}</td>
                <td className="py-1 px-1">{val(c.aislacionConductor)}</td>
                <td className="py-1 px-1">{val(c.longitudM)}</td>
                <td className="py-1 px-1">{val(c.canalizacionTipo)}</td>
                <td className="py-1 px-1">{val(c.canalizacionDiametroMM)}</td>
                <td className="py-1 px-1">{val(c.canalizacionMaterial)}</td>
                <td className="py-1 px-1">{val(c.rotulacionLeida)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanillaAnotacionesLevantamiento({ tablero, cliente }: { tablero: Tablero; cliente?: Cliente }) {
  const anotaciones = (tablero.anotacionesHallazgos ?? []).filter(
    a => a.tipo === 'levantamiento-terreno'
  );
  return (
    <section className="informe-seccion">
      <EncabezadoSeccion titulo="6.7 Planilla — Anotaciones de levantamiento" tablero={tablero} cliente={cliente} />
      {anotaciones.length === 0 ? (
        <SinDatosLevantamiento />
      ) : (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-700 text-left">
              <th className="py-1 px-1">Regla RIC</th>
              <th className="py-1 px-1">Componente</th>
              <th className="py-1 px-1">Circuito</th>
              <th className="py-1 px-1">Justificación / Tarea de terreno</th>
              <th className="py-1 px-1">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {anotaciones.map(a => {
              const fecha = a.creadoEn
                ? new Date(a.creadoEn).toLocaleDateString('es-CL')
                : '—';
              return (
                <tr key={a.id} className="border-b border-slate-300">
                  <td className="py-1 px-1 font-mono text-[10px]">{a.reglaId}</td>
                  <td className="py-1 px-1">{val(a.componenteId)}</td>
                  <td className="py-1 px-1">{val(a.circuitoId)}</td>
                  <td className="py-1 px-1 whitespace-pre-line">{val(a.justificacion)}</td>
                  <td className="py-1 px-1">{fecha}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SeccionPlanes({ planes }: { planes: PlanNormalizacion[] }) {
  return (
    <section className="informe-seccion">
      <header className="mb-4 pb-2 border-b border-slate-400">
        <h2 className="text-xl font-bold">7. Plan de normalización</h2>
      </header>
      {planes.map(p => (
        <div key={p.id} className="mb-6">
          <h3 className="font-bold text-sm mb-2">
            Plan #{p.numero} — {p.estado}
            <span className="ml-2 text-slate-600 font-normal">
              Total: CLP {p.totalCLP.toLocaleString('es-CL')}
              {p.incluyeIVA ? ` (IVA ${p.ivaPct}% incl.)` : ''}
            </span>
          </h3>
          {p.partidas.length === 0 ? (
            <p className="text-xs italic text-slate-600">Sin partidas.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-700 text-left">
                  <th className="py-1 px-1">Código</th>
                  <th className="py-1 px-1">Descripción</th>
                  <th className="py-1 px-1">Un.</th>
                  <th className="py-1 px-1 text-right">Precio</th>
                  <th className="py-1 px-1 text-right">Cant.</th>
                  <th className="py-1 px-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {p.partidas.map(pa => (
                  <tr key={pa.id} className="border-b border-slate-300">
                    <td className="py-1 px-1">{pa.itemCodigo}</td>
                    <td className="py-1 px-1">{pa.itemDescripcion}</td>
                    <td className="py-1 px-1">{pa.unidad}</td>
                    <td className="py-1 px-1 text-right">{pa.precioUnitarioCLP.toLocaleString('es-CL')}</td>
                    <td className="py-1 px-1 text-right">{pa.cantidad}</td>
                    <td className="py-1 px-1 text-right">{pa.totalCLP.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 font-bold">
                  <td colSpan={5} className="py-1 px-1 text-right">Subtotal</td>
                  <td className="py-1 px-1 text-right">{p.subtotalCLP.toLocaleString('es-CL')}</td>
                </tr>
                {p.incluyeIVA && (
                  <tr>
                    <td colSpan={5} className="py-1 px-1 text-right">IVA ({p.ivaPct}%)</td>
                    <td className="py-1 px-1 text-right">{p.ivaCLP.toLocaleString('es-CL')}</td>
                  </tr>
                )}
                <tr className="font-bold">
                  <td colSpan={5} className="py-1 px-1 text-right">Total CLP</td>
                  <td className="py-1 px-1 text-right">{p.totalCLP.toLocaleString('es-CL')}</td>
                </tr>
              </tfoot>
            </table>
          )}
          {p.notas && <p className="text-xs italic mt-2">{p.notas}</p>}
        </div>
      ))}
    </section>
  );
}
