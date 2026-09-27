import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import TemplateDocumentView from './TemplateDocumentView.vue';
import TemplateTableNewFieldDialog from './template-table/TemplateTableNewFieldDialog.vue';
import CurricularOptionsSourceSelect from './CurricularOptionsSourceSelect.vue';
import { Select } from '@/components/ui/select';
import { fieldNode, type DocumentField, type TemplateVariable } from '@/lib/templateDocument';

const variables: TemplateVariable[] = [
  { key: 'curricular_habilidades', label: 'Habilidades blandas', sample: '', type: 'lista', scope: 'asignatura' },
  { key: 'curricular_transversales', label: 'Transversales', sample: '', type: 'lista', scope: 'carrera' },
  { key: 'curricular_descripcion', label: 'Descripción', sample: '', type: 'texto', scope: 'carrera' },
];
const wrappers: Array<ReturnType<typeof mount>> = [];
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

describe('selección curricular en la plantilla', () => {
  it('crea una pregunta múltiple con un origen explícito y conserva ese vínculo en el documento', async () => {
    const wrapper = mount(TemplateTableNewFieldDialog, { attachTo: document.body, props: { variables } });
    wrappers.push(wrapper);
    wrapper.vm.open();
    await flushPromises();
    const input = document.querySelector<HTMLInputElement>('#table-field-label')!;
    input.value = 'Habilidades que trabajaré';
    input.dispatchEvent(new Event('input'));
    wrapper.findComponent(Select).vm.$emit('update:modelValue', 'seleccion_multiple');
    await flushPromises();
    const submit = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Insertar pregunta'))!;
    submit.click();
    await flushPromises();
    expect(wrapper.emitted('create')).toBeUndefined();
    expect(document.body.textContent).toContain('Selecciona la lista curricular');
    const lists = wrapper.findComponent(CurricularOptionsSourceSelect);
    expect(lists.text()).not.toContain('Descripción');
    expect(lists.text()).toContain('Habilidades blandas · Asignatura');
    expect(lists.text()).toContain('Transversales · Carrera');
    document.querySelector<HTMLButtonElement>('#table-field-source-curricular_habilidades')!.click();
    await flushPromises();
    document.querySelector<HTMLButtonElement>('#table-field-source-curricular_transversales')!.click();
    await flushPromises();
    submit.click();
    await flushPromises();
    expect(wrapper.emitted('create')?.[0]).toEqual([{ label: 'Habilidades que trabajaré', type: 'seleccion_multiple', options: [], options_sources: ['curricular_habilidades', 'curricular_transversales'] }]);
    expect(fieldNode({ key: 'habilidades', label: 'Habilidades', type: 'seleccion_multiple', options_source: 'curricular_habilidades', options: [{ value: 'Anterior', label: 'Anterior' }] }).attrs).toMatchObject({ kind: 'seleccion_multiple', options_source: 'curricular_habilidades', options: null });
    expect(fieldNode({ key: 'habilidades', label: 'Habilidades', type: 'seleccion_multiple', options_sources: ['curricular_habilidades', 'curricular_transversales'] }).attrs).toMatchObject({ options_source: null, options_sources: ['curricular_habilidades', 'curricular_transversales'], options: null });
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
