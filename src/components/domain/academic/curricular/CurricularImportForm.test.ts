import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CurricularImportForm from './CurricularImportForm.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';

describe('límites del lote curricular', () => {
  it('no agrega documentos que superan 30 MB combinados y conserva el lote válido anterior', async () => {
    const wrapper = mount(CurricularImportForm, { props: { index: { imports: [], subjects: [], sources: [], current_values: [], capabilities: { pdf: true, xlsx: true, extraction: true }, lock_reason: null }, processing: false, errors: {} } });
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
});
