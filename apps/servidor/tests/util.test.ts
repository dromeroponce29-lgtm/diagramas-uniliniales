import { describe, it, expect } from 'vitest';
import { generarSlug } from '../src/util/slug.js';

describe('generarSlug', () => {
  it('convierte a kebab-case ASCII', () => {
    expect(generarSlug('Constructora Andes Ltda.')).toBe('constructora-andes-ltda');
  });

  it('quita acentos', () => {
    expect(generarSlug('Eléctrica Ñuñoa')).toBe('electrica-nunoa');
  });

  it('colapsa espacios múltiples y signos', () => {
    expect(generarSlug('TG --  Principal  S.A.')).toBe('tg-principal-s-a');
  });

  it('rechaza nombre vacío', () => {
    expect(() => generarSlug('')).toThrow();
    expect(() => generarSlug('   ')).toThrow();
  });

  it('soporta sufijo numérico para colisiones', () => {
    expect(generarSlug('Empresa', 2)).toBe('empresa-2');
    expect(generarSlug('Empresa', 1)).toBe('empresa');
  });
});
