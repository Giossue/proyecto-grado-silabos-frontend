import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DeadlineBanner from '@/components/domain/DeadlineBanner.vue';
import type { DashboardDeadline } from '@/api/dashboard';

const deadline: DashboardDeadline = {
  period: '2026-2027',
  starts_at: '2026-09-24T00:00:00Z',
  due_at: '2026-09-28T00:00:00Z',
  state: 'active',
  days_until_start: 0,
  days_until_due: 2,
  convocation_id: 'c1',
};

const text = (value: Partial<DashboardDeadline>, audience: 'docente' | 'coordinador' | 'bibliotecario' = 'docente') => mount(DeadlineBanner, { props: { deadline: { ...deadline, ...value }, audience } });

describe('DeadlineBanner', () => {
  it('dice para qué son los días y hasta cuándo, sin barra ni botones', () => {
    const wrapper = text({});

    expect(wrapper.get('[role="status"]').text()).toBe('Quedan 2 días para enviar sus sílabos a revisiónHasta el 28 de septiembre de 2026.');
    expect(wrapper.find('[role="progressbar"], button, a').exists()).toBe(false);
  });

  it.each([
    [{ days_until_due: 1 }, 'Queda 1 día para enviar sus sílabos a revisión'],
    [{ days_until_due: 0 }, 'Hoy es el último día para enviar sus sílabos a revisión'],
    [{ state: 'upcoming', days_until_start: 3 }, 'La elaboración de sus sílabos inicia en 3 días'],
    [{ state: 'upcoming', days_until_start: 1 }, 'La elaboración de sus sílabos inicia mañana'],
    [{ state: 'overdue', days_until_due: 0 }, 'Venció el plazo para enviar sus sílabos a revisión'],
  ] as const)('explica cada momento del plazo: %o', (value, headline) => {
    expect(text(value).text()).toContain(headline);
  });

  it.each([
    ['coordinador', 'Quedan 2 días para recibir y revisar los sílabos de su carreraHasta el 28 de septiembre de 2026.'],
    ['bibliotecario', 'Quedan 2 días para revisar y firmar los sílabosHasta el 28 de septiembre de 2026.'],
  ] as const)('dice a %s qué le toca hacer antes del plazo', (audience, notice) => {
    expect(text({}, audience).text()).toBe(notice);
  });

  it('avisa a Biblioteca, antes de empezar, hasta cuándo deben quedar firmados', () => {
    expect(text({ state: 'upcoming', days_until_start: 3 }, 'bibliotecario').text()).toBe('La elaboración de los sílabos inicia en 3 díasDeben quedar revisados y firmados hasta el 28 de septiembre de 2026.');
  });

  it('con el plazo vencido sale en rojo y dice a cada rol qué le queda', () => {
    const teacher = text({ state: 'overdue' });
    expect(teacher.get('[role="status"]').classes()).toContain('bg-destructive/10');
    expect(teacher.get('[role="status"]').classes()).not.toContain('bg-notice');
    expect(teacher.text()).toBe('Venció el plazo para enviar sus sílabos a revisiónEra hasta el 28 de septiembre de 2026. Pida una prórroga a Administración.');
    for (const audience of ['coordinador', 'bibliotecario'] as const) {
      expect(text({ state: 'overdue' }, audience).text()).toBe('Venció el plazo de entrega de los sílabosEra hasta el 28 de septiembre de 2026. Solo puede revisar lo ya enviado.');
    }
    expect(text({}).get('[role="status"]').classes()).toContain('bg-notice');
  });

  it.each(['paused', 'closed'] as const)('en %s solo avisa el estado, sin conteo', (state) => {
    expect(text({ state, days_until_due: 0 }).text()).toBe(state === 'paused' ? 'La convocatoria está pausada' : 'La convocatoria está cerrada');
  });
});
