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
  paused_by: null, classes_ended: false, career_pending: false,
};

const text = (value: Partial<DashboardDeadline>, audience: 'docente' | 'coordinador' | 'bibliotecario' | 'administrador' = 'docente') => mount(DeadlineBanner, { props: { deadline: { ...deadline, ...value }, audience } });

describe('DeadlineBanner', () => {
  it('dice para qué son los días y hasta cuándo, sin barra ni botones', () => {
    const wrapper = text({});

    expect(wrapper.get('[role="status"]').text()).toBe('Quedan 2 días para enviar sus sílabos a revisiónHasta el 28 de septiembre de 2026');
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
    ['coordinador', 'Quedan 2 días para recibir y revisar los sílabos de su carreraHasta el 28 de septiembre de 2026'],
    ['bibliotecario', 'Quedan 2 días para revisar y firmar los sílabosHasta el 28 de septiembre de 2026'],
  ] as const)('dice a %s qué le toca hacer antes del plazo', (audience, notice) => {
    expect(text({}, audience).text()).toBe(notice);
  });

  it('avisa a Biblioteca, antes de empezar, hasta cuándo deben quedar firmados', () => {
    expect(text({ state: 'upcoming', days_until_start: 3 }, 'bibliotecario').text()).toBe('La elaboración de los sílabos inicia en 3 díasDeben quedar revisados y firmados hasta el 28 de septiembre de 2026');
  });

  it('con el plazo vencido sale en rojo y dice a cada rol qué le queda', () => {
    const teacher = text({ state: 'overdue' });
    expect(teacher.get('[role="status"]').classes()).toContain('bg-destructive/10');
    expect(teacher.get('[role="status"]').classes()).not.toContain('bg-notice');
    expect(teacher.text()).toBe('Venció el plazo para enviar sus sílabos a revisiónEra hasta el 28 de septiembre de 2026. Pida una prórroga a Administración');
    for (const audience of ['coordinador', 'bibliotecario'] as const) {
      expect(text({ state: 'overdue' }, audience).text()).toBe('Venció el plazo de entrega de los sílabosEra hasta el 28 de septiembre de 2026. Solo puede revisar lo ya enviado');
    }
    expect(text({}).get('[role="status"]').classes()).toContain('bg-notice');
  });

  it('finalizada dice que los sílabos quedan para consulta, sin conteo', () => {
    expect(text({ state: 'closed', days_until_due: 0 }).text()).toBe('La convocatoria finalizóSus sílabos quedan solo para consulta');
    expect(text({ state: 'closed' }, 'coordinador').text()).toBe('La convocatoria finalizóLos sílabos de la carrera quedan solo para consulta');
    expect(text({ state: 'closed' }, 'bibliotecario').text()).toBe('La convocatoria finalizóLos sílabos quedan solo para consulta');
  });

  it('Administración sabe qué puede hacer con la convocatoria finalizada', () => {
    expect(text({ state: 'closed', classes_ended: false }, 'administrador').text()).toBe('La convocatoria finalizóPuede reabrirla con una prórroga o abrir una nueva');
    expect(text({ state: 'closed', classes_ended: true }, 'administrador').text()).toBe('La convocatoria finalizóPuede abrir una nueva');
  });

  it('Coordinación ve que aún no abre la convocatoria de su carrera', () => {
    expect(text({ state: 'active', career_pending: true }, 'coordinador').text()).toContain('Aún no abre la convocatoria de su carrera');
    expect(text({ state: 'paused', paused_by: 'administracion', career_pending: true }, 'coordinador').text()).not.toContain('Aún no abre');
  });

  it.each([
    ['docente', 'administracion', 'La convocatoria está en pausaLe avisaremos cuando se reanude para que siga con sus sílabos'],
    ['docente', 'coordinacion', 'La convocatoria está en pausaLe avisaremos cuando se reanude para que siga con sus sílabos'],
    ['coordinador', 'administracion', 'La convocatoria está en pausaAdministración pausó la convocatoria institucional. Las revisiones se retoman cuando la reanude; le avisaremos'],
    ['coordinador', 'coordinacion', 'La convocatoria de su carrera está en pausaMientras tanto no se edita ni se revisa. Puede reanudarla desde Revisión'],
    ['administrador', 'administracion', 'La convocatoria institucional está en pausaPuede reanudarla desde Convocatorias'],
    ['bibliotecario', 'administracion', 'La convocatoria está en pausaAdministración pausó la convocatoria institucional. Las revisiones se retoman cuando la reanude; le avisaremos'],
  ] as const)('en pausa, a %s (pausó %s) le dice lo que le toca', (audience, pausedBy, expected) => {
    expect(text({ state: 'paused', days_until_due: 0, paused_by: pausedBy }, audience).text()).toBe(expected);
  });
});
