// Tipos compartidos entre apps/servidor y apps/web.
// Para Plan 1 se incluyen solo los tipos necesarios para el flujo de extracción
// de una foto. Los tipos completos (Cliente, Tablero, etc.) se agregarán
// en planes posteriores.

export type FuenteDato =
  | 'foto-claude'
  | 'foto-openai'
  | 'foto-ambos'
  | 'manual'
  | 'pendiente';

export type ConfianzaDato = 'alta' | 'media' | 'baja' | 'discrepancia';

export interface Procedencia {
  fuente: FuenteDato;
  confianza: ConfianzaDato;
  fotoId?: string;
  notas?: string;
}

export type TipoComponente =
  | 'interruptor-automatico'
  | 'diferencial'
  | 'interruptor-general'
  | 'barra-fase'
  | 'barra-neutro'
  | 'barra-tierra'
  | 'dps'
  | 'contactor'
  | 'rele-termico'
  | 'medidor'
  | 'borne'
  | 'otro';

export type CalidadFoto = 'buena' | 'aceptable' | 'mala';

// Salida de un solo agente (Claude o OpenAI) tras analizar una foto.
export interface ResultadoExtraccionAgente {
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentesDetectados: ComponenteDetectadoAgente[];
  rotulacionCircuitosLeida: RotulacionCircuito[];
}

export interface ComponenteDetectadoAgente {
  tipoSugerido: TipoComponente;
  marca: string | null;
  modelo: string | null;
  calibreA: number | null;
  polos: 1 | 2 | 3 | 4 | null;
  curva: 'B' | 'C' | 'D' | 'K' | null;
  sensibilidadMA: number | null;
  posicion: { fila: number; columna: number } | null;
  textoLeido: string | null;
  confianzaAgente: 'alta' | 'media' | 'baja';
  notas: string | null;
}

export interface RotulacionCircuito {
  numero: number | null;
  textoOriginal: string;
}

// Salida del reconciliador: la verdad consolidada que ve el usuario.
export interface ComponenteReconciliado {
  id: string;
  tipo: TipoComponente;
  marca?: string;
  modelo?: string;
  calibreA?: number;
  polos?: 1 | 2 | 3 | 4;
  curva?: 'B' | 'C' | 'D' | 'K';
  sensibilidadMA?: number;
  posicionEnTablero?: { fila: number; columna: number };
  procedencia: Procedencia;
}

export interface ResultadoExtraccion {
  fotoId: string;
  calidadFoto: CalidadFoto;
  problemasFoto: string[];
  componentes: ComponenteReconciliado[];
  rotulacionesLeidas: RotulacionCircuito[];
  // Discrepancias y datos no leídos quedan reflejados como confianza/notas
  // en los componentes — no requieren un campo separado en Plan 1.
}
