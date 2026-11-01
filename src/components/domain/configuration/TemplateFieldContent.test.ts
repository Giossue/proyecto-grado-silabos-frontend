import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TemplateFieldContent from './TemplateFieldContent.vue';
import type { TemplateField } from '@/api/template';

const field: TemplateField = {
  id: 'f1', key: 'carrera', label: 'Carrera', quien_llena: 'institucional',
  content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Carrera de ' }, { type: 'variable', attrs: { id: 'nombre_carrera' } }] }] },
};
const variables = [{ key: 'nombre_carrera', label: 'Nombre de la carrera', sample: 'Software' }];

describe('TemplateFieldContent', () => {
  it('en la vista deja vacíos los datos del sistema, sin valores de muestra', () => {
    const wrapper = mount(TemplateFieldContent, { props: { field, variables, preview: true } });

    expect(wrapper.get('[data-field-body]').text()).toBe('Carrera de');
    expect(wrapper.text()).not.toContain('Software');
  });

  it('al editar nombra cada dato del sistema', () => {
    const wrapper = mount(TemplateFieldContent, { props: { field, variables } });

    expect(wrapper.get('[data-field-body]').text()).toContain('Carrera de Nombre de la carrera');
  });
});
