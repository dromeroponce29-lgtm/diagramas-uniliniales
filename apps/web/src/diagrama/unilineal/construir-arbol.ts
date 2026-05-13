// Función pura que mapea un Tablero a la estructura del diagrama unilineal.
import type {
  Tablero, ComponenteReconciliado, Circuito,
  DatosAcometida, DatosPuestaATierra, DatosAlimentadorEntrada,
  TensionSistema
} from '@tipos/modelo';

export interface NodoRamal {
  proteccion: ComponenteReconciliado;
  diferencialAsociado?: ComponenteReconciliado;
  circuito?: Circuito;
}

export interface ArbolUnilineal {
  tensionSistema: TensionSistema;
  frecuenciaHz: number;
  acometida: DatosAcometida;
  tieneMedidor: boolean;
  medidor?: ComponenteReconciliado;
  alimentadorEntrada: DatosAlimentadorEntrada;
  ig?: ComponenteReconciliado;
  protecciones: {
    dps: ComponenteReconciliado[];
    diferenciales: ComponenteReconciliado[];
  };
  barras: {
    tieneFase: boolean;
    tieneNeutro: boolean;
    tieneTierra: boolean;
  };
  ramales: NodoRamal[];
  tierra: DatosPuestaATierra & { esquema: Tablero['esquemaTierra'] };
}

export function construirArbolUnilineal(t: Tablero): ArbolUnilineal {
  const ig = t.componentes.find(c => c.tipo === 'interruptor-general');
  const medidor = t.componentes.find(c => c.tipo === 'medidor');

  // Diferenciales que ya están asociados a un circuito no se muestran como generales
  const diferencialesAsociadosIds = new Set(
    t.circuitos.map(c => c.diferencialComponenteId).filter((x): x is string => !!x)
  );

  const automaticos = t.componentes.filter(c => c.tipo === 'interruptor-automatico');
  const ramales: NodoRamal[] = automaticos.map(a => {
    const circuito = t.circuitos.find(c => c.proteccionComponenteId === a.id);
    const dif = circuito?.diferencialComponenteId
      ? t.componentes.find(c => c.id === circuito.diferencialComponenteId)
      : undefined;
    return {
      proteccion: a,
      ...(dif && { diferencialAsociado: dif }),
      ...(circuito && { circuito })
    };
  });

  return {
    tensionSistema: t.tensionSistema,
    frecuenciaHz: t.frecuenciaHz ?? 50,
    acometida: t.acometida ?? { tipo: 'pendiente' },
    tieneMedidor: !!medidor,
    ...(medidor && { medidor }),
    alimentadorEntrada: t.alimentadorEntrada ?? {},
    ...(ig && { ig }),
    protecciones: {
      dps: t.componentes.filter(c => c.tipo === 'dps'),
      diferenciales: t.componentes.filter(c =>
        c.tipo === 'diferencial' && !diferencialesAsociadosIds.has(c.id)
      )
    },
    barras: {
      tieneFase: t.componentes.some(c => c.tipo === 'barra-fase'),
      tieneNeutro: t.componentes.some(c => c.tipo === 'barra-neutro'),
      tieneTierra: t.componentes.some(c => c.tipo === 'barra-tierra')
    },
    ramales,
    tierra: {
      esquema: t.esquemaTierra,
      ...t.puestaATierra
    }
  };
}
