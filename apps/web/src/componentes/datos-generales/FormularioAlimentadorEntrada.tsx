import { useEffect, useState } from 'react';
import type { Tablero, DatosAlimentadorEntrada, TipoCanalizacion, MaterialCanalizacion } from '@tipos/modelo';
import { useTableroStore } from '../../estado/tableroStore.js';

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

const CANALIZACIONES: TipoCanalizacion[] = ['EMT', 'PVC-rigido', 'PVC-flexible', 'bandeja', 'libre', 'subterranea', 'otro'];
const MATERIALES: MaterialCanalizacion[] = ['acero', 'PVC', 'aluminio', 'fibrocemento', 'otro'];

export function FormularioAlimentadorEntrada({ tablero, clienteSlug, tableroSlug }: Props) {
  const { actualizarDatos } = useTableroStore();
  const a = tablero.alimentadorEntrada ?? {};
  const [seccion, setSeccion] = useState(a.seccionConductorMM2?.toString() ?? '');
  const [longitud, setLongitud] = useState(a.longitudM?.toString() ?? '');
  const [canTipo, setCanTipo] = useState<TipoCanalizacion | ''>(a.canalizacionTipo ?? '');
  const [canDiam, setCanDiam] = useState(a.canalizacionDiametroMM?.toString() ?? '');
  const [canMat, setCanMat] = useState<MaterialCanalizacion | ''>(a.canalizacionMaterial ?? '');
  const [capacidad, setCapacidad] = useState(a.capacidadCorrienteA?.toString() ?? '');
  const [conductores, setConductores] = useState(a.conductoresPorFase?.toString() ?? '1');

  useEffect(() => {
    const x = tablero.alimentadorEntrada ?? {};
    setSeccion(x.seccionConductorMM2?.toString() ?? '');
    setLongitud(x.longitudM?.toString() ?? '');
    setCanTipo(x.canalizacionTipo ?? '');
    setCanDiam(x.canalizacionDiametroMM?.toString() ?? '');
    setCanMat(x.canalizacionMaterial ?? '');
    setCapacidad(x.capacidadCorrienteA?.toString() ?? '');
    setConductores(x.conductoresPorFase?.toString() ?? '1');
  }, [tablero.alimentadorEntrada]);

  const numOpt = (s: string): number | undefined => s ? Number(s) : undefined;

  async function guardar() {
    const payload: DatosAlimentadorEntrada = {
      ...(numOpt(seccion) !== undefined && { seccionConductorMM2: numOpt(seccion) }),
      ...(numOpt(longitud) !== undefined && { longitudM: numOpt(longitud) }),
      ...(canTipo && { canalizacionTipo: canTipo }),
      ...(numOpt(canDiam) !== undefined && { canalizacionDiametroMM: numOpt(canDiam) }),
      ...(canMat && { canalizacionMaterial: canMat }),
      ...(numOpt(capacidad) !== undefined && { capacidadCorrienteA: numOpt(capacidad) }),
      ...(numOpt(conductores) !== undefined && { conductoresPorFase: numOpt(conductores) })
    };
    await actualizarDatos(clienteSlug, tableroSlug, { alimentadorEntrada: payload });
  }

  return (
    <section className="bg-white border rounded p-4 space-y-3">
      <h3 className="font-semibold">Alimentador de entrada</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Sección conductor (mm²)
          <input type="number" step="0.5" value={seccion} onChange={e => setSeccion(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Longitud (m)
          <input type="number" step="0.1" value={longitud} onChange={e => setLongitud(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Canalización: tipo
          <select value={canTipo} onChange={e => setCanTipo(e.target.value as TipoCanalizacion)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="">—</option>
            {CANALIZACIONES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Canalización: Ø (mm)
          <input type="number" step="1" value={canDiam} onChange={e => setCanDiam(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Canalización: material
          <select value={canMat} onChange={e => setCanMat(e.target.value as MaterialCanalizacion)} className="mt-1 w-full border rounded px-2 py-1">
            <option value="">—</option>
            {MATERIALES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Capacidad de corriente (A)
          <input type="number" step="1" value={capacidad} onChange={e => setCapacidad(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="text-sm">
          Conductores por fase
          <input type="number" min="1" value={conductores} onChange={e => setConductores(e.target.value)} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
      </div>
      <button onClick={guardar} className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700">Guardar alimentador</button>
    </section>
  );
}
