// Utilidad para imprimir un módulo individual (datos generales, fotos, diagrama,
// cuadro de cargas, cuadro de alimentadores o auditoría) ocultando el resto.
//
// Cada módulo debe envolverse en un contenedor con clases:
//   "imprimir-modulo imprimir-modulo-{nombre}"
// Donde {nombre} es uno de los identificadores aceptados por `ModuloImprimible`.
// Los botones/controles internos que no deben aparecer en la impresión llevan
// la clase "imprimir-oculto".
//
// El estilo dinámico ":not(.imprimir-modulo-X)" se inyecta como <style> temporal
// y se limpia después de `afterprint`.

export type ModuloImprimible =
  | 'datos'
  | 'fotos'
  | 'diagrama'
  | 'cuadro-cargas'
  | 'cuadro-alimentadores'
  | 'auditoria';

const STYLE_ID_MODULO = 'estilo-imprimir-modulo-actual';

export function imprimirModulo(modulo: ModuloImprimible, paginaA4Landscape = false): void {
  // Inyectar regla CSS dinámica que muestra solo el módulo activo.
  const style = document.createElement('style');
  style.id = STYLE_ID_MODULO;
  style.textContent = `
    @page { size: A4 ${paginaA4Landscape ? 'landscape' : 'portrait'}; margin: 12mm; }
    @media print {
      body[data-print-mode="modulo"] .imprimir-modulo.imprimir-modulo-${modulo} {
        display: block !important;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.setAttribute('data-print-mode', 'modulo');
  document.body.setAttribute('data-print-modulo', modulo);

  const cleanup = () => {
    document.body.removeAttribute('data-print-mode');
    document.body.removeAttribute('data-print-modulo');
    document.getElementById(STYLE_ID_MODULO)?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  window.print();
}

/** Componente botón estandarizado para imprimir un módulo individual. */
export function clasesBotonImprimir(): string {
  return 'imprimir-oculto text-xs px-2 py-1 border border-slate-400 text-slate-700 rounded hover:bg-slate-100';
}
