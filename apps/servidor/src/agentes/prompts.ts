// Prompts usados por ambos agentes de extracción y por el reconciliador.
// El texto del prompt está pensado para que ambos agentes apliquen
// el principio "no asumir, no estimar".

export const PROMPT_EXTRACCION = `Analiza esta fotografía de un tablero eléctrico chileno y extrae la información de los componentes visibles.

REGLA FUNDAMENTAL: si tienes la menor duda sobre un valor, devuélvelo como null y agrega una nota en el campo "notas". Esta aplicación no debe asumir ni estimar nada — los datos faltantes se levantarán en terreno por el técnico.

Por cada componente claramente visible reporta:
- tipoSugerido: el tipo eléctrico (interruptor-automatico, diferencial, interruptor-general, barra-fase, barra-neutro, barra-tierra, dps, contactor, rele-termico, medidor, borne, otro)
- marca, modelo, calibreA, polos, curva, sensibilidadMA: solo si efectivamente puedes leerlos en la etiqueta del componente. Si no, null.
- posicion: estimación de fila/columna dentro del tablero (0-indexed). Si no es claro, null.
- textoLeido: el texto literal que ves en la etiqueta del componente (útil para auditoría humana).
- confianzaAgente: tu propia confianza ('alta' si lo lees nítido, 'media' si requiere algo de interpretación, 'baja' si dudas).
- notas: cualquier observación relevante (etiqueta parcialmente tapada, brillo, etc.).

Además reporta:
- calidadFoto: 'buena' | 'aceptable' | 'mala'.
- problemasFoto: lista breve de problemas observados (contraluz, desenfoque, ángulo, etc.).
- rotulacionCircuitosLeida: textos legibles de los rótulos del tablero (la lámina que identifica los circuitos), si aparecen en la foto.

EJEMPLO POSITIVO: Si ves un automático con etiqueta "C16" claramente, reporta calibreA: 16, curva: "C", confianzaAgente: "alta".
EJEMPLO NEGATIVO: Si ves un automático pero la etiqueta está parcialmente tapada por un cable, reporta calibreA: null, notas: "etiqueta tapada por cable".

Devuelve EXCLUSIVAMENTE un JSON válido conforme al schema indicado. Sin texto antes ni después.`;

export const PROMPT_RECONCILIACION = `Recibes dos extracciones JSON independientes de la misma foto de un tablero eléctrico (una hecha por Claude, otra por OpenAI) y la foto original. Tu tarea es producir un JSON consolidado.

REGLAS DE CONSOLIDACIÓN:
1. Si ambos agentes coinciden en un campo (mismo valor o equivalente, como "Schneider" y "Schneider Electric"): confianza='alta', fuente='foto-ambos'.
2. Si solo uno reportó valor y el otro null: confianza='media', fuente='foto-claude' o 'foto-openai' según corresponda. Agrega nota indicando el desacuerdo.
3. Si ambos reportaron valores distintos: confianza='discrepancia', en el campo notas escribe textualmente "Claude leyó X, OpenAI leyó Y". Conserva el valor de Claude como tentativo pero deja claro que requiere revisión humana.
4. Si ambos reportaron null: NO INCLUYAS ese campo en el output. No inventes valores.
5. Para identificar el mismo componente físico en ambos JSONs usa la posicion (fila/columna) y/o el tipoSugerido. Si la correspondencia no es clara, prefiere incluir ambos como componentes separados con nota "no se pudo correlacionar entre agentes".

Genera un campo id único (ULID) para cada componente del output.

Devuelve EXCLUSIVAMENTE un JSON válido conforme al schema. Sin texto antes ni después.`;
