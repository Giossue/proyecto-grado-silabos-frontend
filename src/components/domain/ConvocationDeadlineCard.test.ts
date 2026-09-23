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
  it('explica el inicio y ofrece al docente continuar sus sílabos', () => {
    const wrapper = mount(ConvocationDeadlineCard, {
      props: { deadline, role: 'docente' },
      global: {
        stubs: {
          RouterLink: { props: ['to'], template: '<a :data-to="to"><slot /></a>' },
        },
      },
    });

    expect(wrapper.text()).toContain('La elaboración inicia en 2 días.');
    expect(wrapper.text()).toContain('Por iniciar');
    expect(wrapper.text()).toContain('Continuar mis sílabos');
  });

  it('explica la pausa sin presentar un conteo engañoso', () => {
    const wrapper = mount(ConvocationDeadlineCard, {
      props: {
        deadline: { ...deadline, state: 'paused', days_until_start: 0, days_until_due: 0 },
        role: 'docente',
      },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });

    expect(wrapper.text()).toContain('En pausa');
    expect(wrapper.text()).toContain('No se admiten envíos mientras la convocatoria permanezca en pausa.');
    expect(wrapper.text()).not.toContain('Quedan 0 días');
  });

  it('abre el seguimiento para coordinación cuando la carrera ya tiene convocatoria', async () => {
    const wrapper = mount(ConvocationDeadlineCard, {
      props: {
        deadline: { ...deadline, state: 'overdue', convocation_id: 'convocation-1' },
        role: 'coordinador',
      },
    });

    expect(wrapper.text()).toContain('El plazo de entrega venció.');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('tracking')).toHaveLength(1);
  });
});
