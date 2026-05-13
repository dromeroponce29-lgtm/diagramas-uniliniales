// Prompts usados por ambos agentes de extracción y por el reconciliador.
// El texto del prompt está pensado para que ambos agentes apliquen
// el principio "no asumir, no estimar".

export const PROMPT_EXTRACCION = `Analiza esta fotografía de un tablero eléctrico chileno y extrae la información de los componentes visibles. Esta información se usará para generar un diagrama unilineal y verificar cumplimiento del Pliego Técnico RIC N°18 (SEC Chile).

REGLA FUNDAMENTAL: si tienes la menor duda sobre un valor, devuélvelo como null y agrega una nota en el campo "notas". Esta aplicación no debe asumir ni estimar nada — los datos faltantes se levantarán en terreno por el técnico.

Por cada componente claramente visible reporta:
- tipoSugerido: el tipo eléctrico (interruptor-automatico, diferencial, interruptor-general, barra-fase, barra-neutro, barra-tierra, dps, contactor, rele-termico, medidor, borne, otro)
- marca, modelo: si se lee la marca/modelo en la etiqueta o el cuerpo. Si no, null.
- calibreA: amperaje nominal (típicamente impreso como "C16", "16A"). Si no, null.
- polos: número de polos (1, 2, 3 o 4). Mirá el ancho del módulo si la etiqueta no es clara. Si dudás, null.
- curva: B, C, D o K (la letra acompañando el calibre). Si no, null.
- sensibilidadMA: solo para diferenciales (típicamente 30, 100, 300, 500). Si no, null.
- capacidadCortocircuitoKA: SOLO si la etiqueta lo indica explícitamente (ej. "6kA", "10kA", "Icu 25kA"). Si no, null. Es típico que solo el IG y automáticos de gama industrial lo lleven impreso.
- posicion: estimación de fila/columna dentro del tablero (0-indexed). Si no es claro, null.
- textoLeido: el texto literal que ves en la etiqueta del componente (útil para auditoría humana).
- confianzaAgente: tu propia confianza ('alta' si lo lees nítido, 'media' si requiere algo de interpretación, 'baja' si dudas).
- notas: cualquier observación relevante (etiqueta parcialmente tapada, brillo, etc.).

Por cada rotulación de circuito visible (en la lámina identificatoria del tablero, etiquetas adhesivas o rotuladoras dentro del gabinete) reporta:
- numero: el número correlativo del circuito si está. Si no, null.
- textoOriginal: el texto exacto que aparece en la rotulación (ej. "C-1 Iluminación living").
- destinoLeido: el destino interpretado del texto (ej. "Iluminación living", "Enchufes dormitorio principal", "Cocina vitrocerámica"). Limpiá el texto pero mantenelo fiel. Si no se puede inferir, null.

Si en la foto aparecen datos generales del tablero (en una plaquita, viñeta del fabricante, etiqueta de servicio), reportalos en datosGeneralesObservados (o null si no se ve nada de esto):
- tensionSistema: '220V-mono', '380V-trif' o '380V/220V-trif-n' si se identifica la tensión y configuración.
- esquemaTierra: 'TT', 'TN-S', 'TN-C-S' o 'IT' si se especifica.
- frecuenciaHz: 50 o 60 si se ve.
- capacidadNominalA: si la viñeta indica corriente nominal del gabinete.
- marcaGabinete, modeloGabinete: del propio gabinete (Schneider, ABB, Legrand, etc.), si está visible.
- observaciones: cualquier otro texto relevante leído del tablero (ej. "Proyecto SEC N° 12345").

Además reporta:
- calidadFoto: 'buena' | 'aceptable' | 'mala'.
- problemasFoto: lista breve de problemas observados (contraluz, desenfoque, ángulo, etc.).

EJEMPLOS:
- Etiqueta "C16 6kA" → calibreA: 16, curva: "C", capacidadCortocircuitoKA: 6.
- Rotulación adhesiva "C-3 ENCHUFES COCINA" → numero: 3, textoOriginal: "C-3 ENCHUFES COCINA", destinoLeido: "Enchufes cocina".
- Plaquita Schneider "Iₙ 63A, TN-S, 380V/220V trifásico+N" → datosGeneralesObservados: { tensionSistema: "380V/220V-trif-n", esquemaTierra: "TN-S", capacidadNominalA: 63, marcaGabinete: "Schneider" }.

FORMATO OBLIGATORIO: el JSON debe incluir SIEMPRE estos campos como arrays — usa [] si están vacíos, nunca null y nunca los omitas:
- problemasFoto
- componentesDetectados
- rotulacionCircuitosLeida

El campo datosGeneralesObservados puede ser null si no detectaste nada a nivel tablero.

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
