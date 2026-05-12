import { useState } from 'react';
import type { ComponenteReconciliado } from '@tipos/modelo';

interface Props {
  componente: ComponenteReconciliado;
  onCerrar(): void;
  onResolver(valoresElegidos: Partial<ComponenteReconciliado>): Promise<void>;
}

// Parsea la nota "Claude leyó X, OpenAI leyó Y" para mostrar las dos opciones.
function parsearDiscrepancia(notas: string | undefined): { claude?: string; openai?: string } {
  if (!notas) return {};
  const m = notas.match(/Claude leyó (.+?), OpenAI leyó (.+?)(?:$| ·)/);
  if (!m) return {};
  return { claude: m[1], openai: m[2] };
}

export function ResolverDiscrepancia({ componente, onCerrar, onResolver }: Props) {
  const partes = (componente.procedencia.notas ?? '').split(' · ');
  const [eligiendo, setEligiendo] = useState(false);

  async function elegir(fuente: 'foto-claude' | 'foto-openai' | 'manual', valorManual?: { calibreA?: number }) {
    setEligiendo(true);
    await onResolver({
      ...valorManual,
      procedencia: {
        ...componente.procedencia,
        fuente,
        confianza: 'alta',
        notas: `Resuelto manualmente desde: ${componente.procedencia.notas}`
      }
    });
    setEligiendo(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-xl font-semibold mb-2">Resolver discrepancia</h3>
        <p className="text-sm text-slate-600 mb-4">
          Componente: <strong>{componente.tipo}</strong> · ID {componente.id.substring(0, 8)}
        </p>

        <div className="space-y-2 mb-4">
          {partes.map((p, i) => {
            const dis = parsearDiscrepancia(p);
            if (!dis.claude && !dis.openai) {
              return <div key={i} className="text-sm text-slate-600">{p}</div>;
            }
            return (
              <div key={i} className="grid grid-cols-2 gap-2">
                <button onClick={() => elegir('foto-claude')} disabled={eligiendo}
                  className="border border-slate-300 rounded p-3 text-left hover:bg-blue-50">
                  <div className="text-xs text-slate-500">Claude</div>
                  <div className="font-mono">{dis.claude}</div>
                </button>
                <button onClick={() => elegir('foto-openai')} disabled={eligiendo}
                  className="border border-slate-300 rounded p-3 text-left hover:bg-blue-50">
                  <div className="text-xs text-slate-500">OpenAI</div>
                  <div className="font-mono">{dis.openai}</div>
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Si ninguna lectura es correcta, edita el componente manualmente desde el panel central.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onCerrar} disabled={eligiendo}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
