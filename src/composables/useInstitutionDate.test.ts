import { describe, expect, it, afterEach } from 'vitest';
import { useInstitutionCalendarDate, useInstitutionToday } from '@/composables/useInstitutionDate';
import { sessionState } from '@/state/session';
import type { Session } from '@/api/session';

const sessionWith = (institution?: Session['institution']): Session => ({
  user: {
    id: 'user-1',
    name: 'Docente de prueba',
    email: 'docente@silabos.test',
    email_verified: true,
    can_edit_identity: false,
  },
  active_role: null,
  available_roles: [],
  ...(institution === undefined ? {} : { institution }),
});

const localToday = (): string => {
  const now = new Date();

  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

describe('useInstitutionToday', () => {
  afterEach(() => {
    sessionState.clear();
  });

  it('devuelve el día que publica el servidor', () => {
    sessionState.replace(sessionWith({ today: '2026-10-21', timezone: 'America/Guayaquil' }));

    expect(useInstitutionToday().value).toBe('2026-10-21');
  });

  it('reacciona cuando la sesión llega después de montar', () => {
    const today = useInstitutionToday();
    sessionState.replace(sessionWith({ today: '2026-10-21', timezone: 'America/Guayaquil' }));

    expect(today.value).toBe('2026-10-21');
  });

  it('usa el día local cuando la sesión no trae el de la institución', () => {
    sessionState.replace(sessionWith());

    expect(useInstitutionToday().value).toBe(localToday());
  });

  it('convierte el día institucional en fecha de calendario', () => {
    sessionState.replace(sessionWith({ today: '2026-10-21', timezone: 'America/Guayaquil' }));

    expect(useInstitutionCalendarDate().value.toString()).toBe('2026-10-21');
  });
});
