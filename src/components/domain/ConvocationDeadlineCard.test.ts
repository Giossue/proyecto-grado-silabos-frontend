import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ConvocationDeadlineCard from '@/components/domain/ConvocationDeadlineCard.vue';

const deadline = {
  period: '2026-2027',
  starts_at: '2026-09-25T12:00:00Z',
  due_at: '2026-10-02T12:00:00Z',
  state: 'upcoming' as const,
  days_until_start: 2,
  days_until_due: 9,
  convocation_id: null,
};

describe('ConvocationDeadlineCard', () => {
  it('muestra al docente solo los días y la barra, sin fechas ni botones', () => {
    const wrapper = mount(ConvocationDeadlineCard, { props: { deadline, audience: 'docente' } });

    expect(wrapper.text()).toBe('La elaboración de sus sílabos inicia en 2 días, el 25 de septiembre de 2026.');
    expect(wrapper.find('[aria-label="Avance del plazo: 0 %"]').exists()).toBe(true);
    expect(wrapper.find('button, a, time').exists()).toBe(false);
  });

  it('muestra la pausa sin mensaje ni conteo engañoso', () => {
    const wrapper = mount(ConvocationDeadlineCard, {
      props: {
        deadline: { ...deadline, state: 'paused', days_until_start: 0, days_until_due: 0 },
        audience: 'docente',
      },
    });

    expect(wrapper.text()).toBe('La convocatoria está pausada.');
    expect(wrapper.text()).not.toContain('No se admiten envíos');
    expect(wrapper.text()).not.toContain('Quedan 0 días');
  });

  it('abre el seguimiento para coordinación cuando la carrera ya tiene convocatoria', async () => {
    const wrapper = mount(ConvocationDeadlineCard, {
      props: {
        deadline: { ...deadline, state: 'overdue', convocation_id: 'convocation-1' },
        audience: 'coordinador',
      },
    });

    expect(wrapper.text()).toContain('El plazo de entrega venció.');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('tracking')).toHaveLength(1);
  });

  it('muestra una barra con el avance del plazo entre inicio y entrega', () => {
    const wrapper = mount(ConvocationDeadlineCard, {
      props: {
        deadline: { ...deadline, state: 'active', days_until_start: 0, days_until_due: 2, starts_at: '2026-09-24T00:00:00Z', due_at: '2026-09-28T00:00:00Z' },
        audience: 'docente',
      },
    });

    expect(wrapper.find('[aria-label="Avance del plazo: 50 %"]').exists()).toBe(true);
    expect(wrapper.text()).toBe('Quedan 2 días para enviar sus sílabos a revisión: hasta el 28 de septiembre de 2026.');
  });
});
