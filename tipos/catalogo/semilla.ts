// Set semilla de catálogo — precios CLP referenciales 2026. El usuario
// debe revisarlos antes de cotizar a un cliente real.
import type { ItemCatalogo } from '../modelo.js';

export const CATALOGO_SEMILLA: Omit<ItemCatalogo, 'id'>[] = [
  // Protección
  { codigo: 'AUT-1P-10A-C',     descripcion: 'Automático 1P 10A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  4200, categoria: 'proteccion' },
  { codigo: 'AUT-1P-16A-C',     descripcion: 'Automático 1P 16A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  4500, categoria: 'proteccion' },
  { codigo: 'AUT-1P-20A-C',     descripcion: 'Automático 1P 20A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  4800, categoria: 'proteccion' },
  { codigo: 'AUT-1P-25A-C',     descripcion: 'Automático 1P 25A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  5200, categoria: 'proteccion' },
  { codigo: 'AUT-2P-40A-C',     descripcion: 'Automático 2P 40A curva C',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP: 12500, categoria: 'proteccion' },
  { codigo: 'AUT-3P-63A-C',     descripcion: 'Automático 3P 63A curva C (IG típico)',     tipo: 'material', unidad: 'ud', precioUnitarioCLP: 28000, categoria: 'proteccion' },
  { codigo: 'DIF-2P-25A-30MA',  descripcion: 'Diferencial 2P 25A 30mA',                   tipo: 'material', unidad: 'ud', precioUnitarioCLP: 42000, categoria: 'proteccion' },
  { codigo: 'DIF-4P-40A-30MA',  descripcion: 'Diferencial 4P 40A 30mA',                   tipo: 'material', unidad: 'ud', precioUnitarioCLP: 78000, categoria: 'proteccion' },
  { codigo: 'DPS-1P-T2',        descripcion: 'DPS monofásico tipo 2 (clase II) 25kA',     tipo: 'material', unidad: 'ud', precioUnitarioCLP: 35000, categoria: 'proteccion' },
  { codigo: 'DPS-3P-T2',        descripcion: 'DPS trifásico+N tipo 2 25kA',               tipo: 'material', unidad: 'ud', precioUnitarioCLP: 95000, categoria: 'proteccion' },
  // Accesorios
  { codigo: 'BARRA-N',          descripcion: 'Barra de neutro aislada 12 vías',           tipo: 'material', unidad: 'ud', precioUnitarioCLP:  8500, categoria: 'accesorio' },
  { codigo: 'BARRA-T',          descripcion: 'Barra de tierra 1.5x10x100mm',              tipo: 'material', unidad: 'ud', precioUnitarioCLP:  8500, categoria: 'accesorio' },
  { codigo: 'BORNERA-12',       descripcion: 'Bornera 12 polos riel DIN',                 tipo: 'material', unidad: 'ud', precioUnitarioCLP:  6800, categoria: 'accesorio' },
  // Conductor
  { codigo: 'CABLE-25-THHN',    descripcion: 'Conductor THHN cobre 2.5mm² (#14 AWG)',     tipo: 'material', unidad: 'm',  precioUnitarioCLP:   850, categoria: 'conductor' },
  { codigo: 'CABLE-4-THHN',     descripcion: 'Conductor THHN cobre 4mm² (#12 AWG)',       tipo: 'material', unidad: 'm',  precioUnitarioCLP:  1300, categoria: 'conductor' },
  { codigo: 'CABLE-6-THHN',     descripcion: 'Conductor THHN cobre 6mm² (#10 AWG)',       tipo: 'material', unidad: 'm',  precioUnitarioCLP:  1850, categoria: 'conductor' },
  { codigo: 'CABLE-10-THHN',    descripcion: 'Conductor THHN cobre 10mm² (#8 AWG)',       tipo: 'material', unidad: 'm',  precioUnitarioCLP:  3100, categoria: 'conductor' },
  // Mano de obra
  { codigo: 'HH-electricista',  descripcion: 'Hora-hombre electricista certificado',      tipo: 'labor',    unidad: 'h',  precioUnitarioCLP: 25000, categoria: 'mano-de-obra' },
  { codigo: 'HH-ayudante',      descripcion: 'Hora-hombre ayudante',                      tipo: 'labor',    unidad: 'h',  precioUnitarioCLP: 12000, categoria: 'mano-de-obra' },
  // Servicios
  { codigo: 'VISITA',           descripcion: 'Visita técnica y diagnóstico',              tipo: 'labor',    unidad: 'gl', precioUnitarioCLP: 50000, categoria: 'servicio' },
  { codigo: 'MEDICION-MEGGER',  descripcion: 'Medición de aislamiento (megger)',          tipo: 'labor',    unidad: 'gl', precioUnitarioCLP: 35000, categoria: 'servicio' },
  { codigo: 'MEDICION-TIERRA',  descripcion: 'Medición de puesta a tierra',               tipo: 'labor',    unidad: 'gl', precioUnitarioCLP: 40000, categoria: 'servicio' }
];
