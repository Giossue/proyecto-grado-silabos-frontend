import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import TemplateDocumentView from './TemplateDocumentView.vue';
import { fieldNode, type DocumentField } from '@/lib/templateDocument';

const wrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

describe('selección curricular en la plantilla', () => {
  it('conserva el vínculo de una selección existente con sus listas curriculares', () => {
    expect(fieldNode({ key: 'habilidades', label: 'Habilidades', type: 'seleccion_multiple', options_source: 'curricular_habilidades', options: [{ value: 'Anterior', label: 'Anterior' }] }).attrs).toMatchObject({ kind: 'seleccion_multiple', options_source: 'curricular_habilidades', options: null });
    expect(fieldNode({ key: 'habilidades', label: 'Habilidades', type: 'seleccion_multiple', options_sources: ['curricular_habilidades', 'curricular_transversales'] }).attrs).toMatchObject({ options_source: null, options_sources: ['curricular_habilidades', 'curricular_transversales'], options: null });
  });

  it('?Docente se responde con dos botones Sí y No, también dentro de una tabla', async () => {
    const field: DocumentField = { key: 'discapacidad', label: 'Estudiantes con discapacidad', type: 'seleccion_unica', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }], value: 'No', teacher_editable: true };
    const cell = { type: 'tableCell', content: [{ type: 'paragraph', content: [fieldNode(field)] }] };
    const wrapper = mount(TemplateDocumentView, { props: { document: { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [cell] }] }] }, fields: [field], variables: {}, editable: true, presentation: 'form' } });
    wrappers.push(wrapper);
    const buttons = wrapper.findAll('[role="radio"]');
    expect(buttons.map((button) => button.text())).toEqual(['Sí', 'No']);
    expect(buttons[1]!.attributes('aria-checked')).toBe('true');
    await buttons[0]!.trigger('click');
    expect(wrapper.emitted('value')?.[0]).toEqual(['discapacidad', 'Sí']);
  });

  it('en una lista, lo fijo, lo del docente y el Proyecto de carrera forman una sola lista', () => {
    const field: DocumentField = { key: 'normas', label: 'Normas', type: 'texto_largo', value: 'Puntualidad', teacher_editable: true };
    const item = (content: object) => ({ type: 'listItem', content: [{ type: 'paragraph', content: [content] }] });
    const wrapper = mount(TemplateDocumentView, { props: { document: { type: 'doc', content: [{ type: 'bulletList', content: [
      item({ type: 'text', text: 'Respeto en clase' }),
      item({ ...fieldNode(field), attrs: { ...fieldNode(field).attrs, listStyle: 'bullet' } }),
      item({ type: 'variable', attrs: { id: 'curricular_normas', label: 'curricular_normas', listStyle: 'bullet' } }),
    ] }] } as never, fields: [field], variables: { curricular_normas: '1. Trabajo en equipo\n2. Ética profesional' } } });
    wrappers.push(wrapper);
    expect(wrapper.findAll('ul')).toHaveLength(1);
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Respeto en clase', 'Puntualidad', 'Trabajo en equipo', 'Ética profesional']);
  });

  it('el docente elige varias opciones resueltas para su sílabo y la vista de lectura conserva el contenido', async () => {
    const field: DocumentField = { key: 'habilidades', label: 'Habilidades', type: 'seleccion_multiple', options_source: 'curricular_habilidades', options: [{ value: 'Liderazgo', label: 'Liderazgo' }, { value: 'Comunicación', label: 'Comunicación' }], value: ['Liderazgo'], teacher_editable: true };
    const wrapper = mount(TemplateDocumentView, { props: { document: { type: 'doc', content: [{ type: 'paragraph', content: [fieldNode(field)] }] }, fields: [field], variables: {}, editable: true, presentation: 'form' } });
    wrappers.push(wrapper);
    expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(2);
    await wrapper.findAll('[role="checkbox"]')[1]!.trigger('click');
    expect(wrapper.emitted('value')?.[0]).toEqual(['habilidades', ['Liderazgo', 'Comunicación']]);
    await wrapper.setProps({ fields: [{ ...field, value: ['Liderazgo', 'Comunicación'] }] });
    await wrapper.findAll('[role="checkbox"]')[0]!.trigger('click');
    expect(wrapper.emitted('value')?.[1]).toEqual(['habilidades', ['Comunicación']]);
    await wrapper.setProps({ editable: false });
    expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(0);
    expect(wrapper.text()).toContain('Liderazgo');
    expect(wrapper.text()).toContain('Comunicación');
  });
});
