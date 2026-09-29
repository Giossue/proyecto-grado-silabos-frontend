import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CurricularImportForm from './CurricularImportForm.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';

describe('límites del lote curricular', () => {
  it('muestra la indicación opcional cuando el servidor devuelve un error en ella', async () => {
    const wrapper = mount(CurricularImportForm, { props: { index: { imports: [], subjects: [], sources: [], current_values: [], concepts: [{ key: 'bibliografia_basica', label: 'Bibliografía básica', type: 'lista', scope: 'asignatura' }], capabilities: { pdf: true, xlsx: true, extraction: true }, lock_reason: null }, processing: false, errors: { instruction: ['Acorta la indicación.'] } } });
    await flushPromises();
    expect(wrapper.find('#curricular-import-instruction').exists()).toBe(true);
    expect(wrapper.text()).toContain('Acorta la indicación.');
    wrapper.unmount();
  });

  it('no agrega documentos que superan 30 MB combinados y conserva el lote válido anterior', async () => {
    const wrapper = mount(CurricularImportForm, { props: { index: { imports: [], subjects: [], sources: [], current_values: [], concepts: [{ key: 'bibliografia_basica', label: 'Bibliografía básica', type: 'lista', scope: 'asignatura' }], capabilities: { pdf: true, xlsx: true, extraction: true }, lock_reason: null }, processing: false, errors: {} } });
    const files = ['uno.pdf', 'dos.pdf'].map((name) => { const file = new File(['demo'], name, { type: 'application/pdf' }); Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 }); return file; });
    wrapper.findComponent(FileDropzone).vm.$emit('files-selected', [files[0]]);
    await flushPromises();
    wrapper.findComponent(FileDropzone).vm.$emit('files-selected', [files[1]]);
    await flushPromises();
    expect(wrapper.text()).toContain('Los archivos de una importación pueden sumar hasta 30 MB.');
    expect(wrapper.text()).toContain('uno.pdf');
    expect(wrapper.text()).not.toContain('dos.pdf');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ files: [files[0]], source_ids: [], instruction: '' }]);
    wrapper.unmount();
  });

  it('muestra los datos que pide la plantilla y bloquea la importación si no hay ninguno', async () => {
    const index = { imports: [], subjects: [], sources: [], current_values: [], concepts: [{ key: 'bibliografia_basica', label: 'Bibliografía básica', type: 'lista' as const, scope: 'asignatura' as const }], capabilities: { pdf: true, xlsx: true, extraction: true }, lock_reason: null };
    const wrapper = mount(CurricularImportForm, { props: { index, processing: false, errors: {} } });
    expect(wrapper.text()).toContain('Se buscarán 1 dato de la plantilla');
    await wrapper.setProps({ index: { ...index, concepts: [] } });
    expect(wrapper.text()).toContain('Administración aún no definió en la plantilla qué datos salen de los documentos de la carrera.');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });
});
