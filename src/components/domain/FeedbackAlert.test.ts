import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';

describe('FeedbackAlert', () => {
  it('el aviso sin marco no lleva borde, anillo ni fondo', () => {
    const classes = mount(FeedbackAlert, { props: { message: 'Las credenciales proporcionadas no son válidas', appearance: 'plain' } }).get('[role="alert"]').classes();

    expect(classes).toContain('ring-0');
    expect(classes).not.toContain('ring-1');
    expect(classes).toContain('bg-transparent');
  });

  it('el aviso normal conserva su marco', () => {
    const classes = mount(FeedbackAlert, { props: { message: 'Algo falló' } }).get('[role="alert"]').classes();

    expect(classes).toContain('ring-1');
  });
});
