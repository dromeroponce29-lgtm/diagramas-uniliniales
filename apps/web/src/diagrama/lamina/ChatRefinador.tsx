// Chat con agente IA para refinar el diagrama unilineal contra la realidad.
// El usuario describe discrepancias entre el diagrama generado y la foto del
// tablero, y el agente sugiere ajustes específicos: tensión sistema correcta,
// componentes faltantes, polos mal leídos, luces piloto, etc.
import { useState, useRef, useEffect } from 'react';
import type { Tablero } from '@tipos/modelo';

// Prefijo de la API. Vacío en dev (usa proxy de Vite), URL completa en producción.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface Mensaje {
  rol: 'usuario' | 'agente';
  texto: string;
  timestamp: string;
}

interface Props {
  tablero: Tablero;
  clienteSlug: string;
  tableroSlug: string;
}

export function ChatRefinador({ clienteSlug, tableroSlug }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  async function enviar() {
    const texto = input.trim();
    if (!texto || cargando) return;
    const usuarioMsg: Mensaje = { rol: 'usuario', texto, timestamp: new Date().toISOString() };
    setMensajes(prev => [...prev, usuarioMsg]);
    setInput('');
    setCargando(true); setError(null);

    try {
      const r = await fetch(`${API_BASE}/api/clientes/${clienteSlug}/tableros/${tableroSlug}/refinador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: texto,
          historial: mensajes.map(m => ({ rol: m.rol, texto: m.texto }))
        })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
      const data = await r.json() as { respuesta: string };
      setMensajes(prev => [...prev, {
        rol: 'agente',
        texto: data.respuesta,
        timestamp: new Date().toISOString()
      }]);
    } catch (e) {
      setError(String(e));
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="bg-white border rounded p-3 print:hidden">
      <h4 className="font-semibold text-sm mb-2">💬 Chat de refinamiento del diagrama</h4>
      <p className="text-xs text-slate-500 italic mb-2">
        Describí lo que ves diferente entre el diagrama y la foto, o pedile al agente que sugiera
        ajustes. Ej.: "El sistema es trifásico, no monofásico", "Faltan luces piloto en la barra",
        "El IG tiene 3 polos, no 1".
      </p>

      <div className="border rounded bg-slate-50 p-2 h-64 overflow-y-auto mb-2 text-sm">
        {mensajes.length === 0 && (
          <p className="text-slate-400 italic">Sin mensajes aún. Escribí abajo lo que querés ajustar.</p>
        )}
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`mb-2 px-2 py-1 rounded ${
              m.rol === 'usuario' ? 'bg-blue-100 ml-8' : 'bg-amber-50 mr-8'
            }`}
          >
            <div className="text-xs font-medium text-slate-600">
              {m.rol === 'usuario' ? '👤 Tú' : '🤖 Agente'}
            </div>
            <div className="whitespace-pre-line">{m.texto}</div>
          </div>
        ))}
        {cargando && <p className="text-slate-500 italic text-xs">Agente escribiendo…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !cargando) enviar(); }}
          placeholder="Escribí qué querés ajustar del diagrama…"
          disabled={cargando}
          className="flex-1 border rounded px-2 py-1 text-sm"
        />
        <button
          onClick={enviar}
          disabled={cargando || !input.trim()}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        >Enviar</button>
      </div>
    </section>
  );
}
