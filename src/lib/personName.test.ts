import { describe, expect, it } from 'vitest';
import { joinName, splitName } from '@/lib/personName';

describe('personName', () => {
  it('reparte un nombre de cuatro palabras y lo vuelve a unir igual', () => {
    const parts = splitName('ANA MARÍA PÉREZ LÓPEZ');

    expect(parts).toEqual({ primer_nombre: 'ANA', segundo_nombre: 'MARÍA', primer_apellido: 'PÉREZ', segundo_apellido: 'LÓPEZ' });
    expect(joinName(parts)).toBe('ANA MARÍA PÉREZ LÓPEZ');
  });

  it('un apellido compuesto queda en el primer apellido', () => {
    const parts = splitName('JUAN CARLOS DE LA CRUZ MORA');

    expect(parts.primer_apellido).toBe('DE LA CRUZ');
    expect(parts.segundo_apellido).toBe('MORA');
    expect(joinName(parts)).toBe('JUAN CARLOS DE LA CRUZ MORA');
  });

  it('un nombre con menos de cuatro palabras deja vacías las partes que faltan', () => {
    expect(splitName('ADMINISTRADOR DEMO')).toEqual({ primer_nombre: 'ADMINISTRADOR', segundo_nombre: 'DEMO', primer_apellido: '', segundo_apellido: '' });
  });
});
