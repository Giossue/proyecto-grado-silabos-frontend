import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FileDropzone from '@/components/domain/FileDropzone.vue';

const selectFile = async (wrapper: ReturnType<typeof mount>, file: File): Promise<void> => {
  const input = wrapper.get('input[type="file"]');
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file] });
  await input.trigger('change');
};

describe('FileDropzone', () => {
  it('renders the PNG variant and accepts PNG files', async () => {
    const wrapper = mount(FileDropzone, {
      props: { modelValue: null, inputId: 'faculty-logo', kind: 'png', required: true },
    });

    expect(wrapper.text()).toContain('Arrastre su PNG aquí');
    expect(wrapper.get('input').attributes('accept')).toBe('image/png,.png');
    expect(wrapper.get('input').attributes('required')).toBeDefined();
    expect(wrapper.get('input').attributes('aria-required')).toBe('true');

    const file = new File(['png'], 'facultad.png', { type: 'image/png' });
    await selectFile(wrapper, file);

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([file]);
    expect(wrapper.emitted('validation-error')?.[0]).toEqual([null]);
  });

  it('acepta archivos de firma .p12 y .pfx y rechaza otros', async () => {
    const wrapper = mount(FileDropzone, {
      props: { modelValue: null, inputId: 'signature-certificate', kind: 'certificate' },
    });

    expect(wrapper.text()).toContain('Arrastre su archivo de firma aquí');
    expect(wrapper.get('input').attributes('accept')).toBe('.p12,.pfx,application/x-pkcs12');

    const file = new File(['p12'], 'firma.p12');
    await selectFile(wrapper, file);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([file]);

    await selectFile(wrapper, new File(['pdf'], 'firma.pdf', { type: 'application/pdf' }));
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([null]);
    expect(wrapper.emitted('validation-error')?.at(-1)).toEqual(['Seleccione un archivo de firma (.p12 o .pfx)']);
  });

  it('oculta el recuadro cuando ya hay un archivo y lo muestra otra vez al quitarlo', async () => {
    const file = new File(['p12'], 'firma.p12');
    const wrapper = mount(FileDropzone, {
      props: { modelValue: file, inputId: 'signature-certificate', kind: 'certificate' },
    });

    expect(wrapper.find('[data-file-dropzone]').exists()).toBe(false);
    expect(wrapper.text()).toContain('firma.p12');

    await wrapper.get('[data-file-remove]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    await wrapper.setProps({ modelValue: null });
    expect(wrapper.find('[data-file-dropzone]').exists()).toBe(true);
  });

  it('rejects a non-PNG file in the PNG variant', async () => {
    const wrapper = mount(FileDropzone, {
      props: { modelValue: null, inputId: 'faculty-logo', kind: 'png' },
    });

    await selectFile(wrapper, new File(['pdf'], 'facultad.pdf', { type: 'application/pdf' }));

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    expect(wrapper.emitted('validation-error')?.[0]).toEqual(['Seleccione un archivo PNG']);
  });

  it('acepta varios PDF juntos sin sustituir el modelo de un archivo de otros formularios', async () => {
    const wrapper = mount(FileDropzone, { props: { modelValue: null, inputId: 'pdf-files', kind: 'pdf', multiple: true } });
    const files = [new File(['pdf'], 'proyecto.pdf', { type: 'application/pdf' }), new File(['pdf'], 'anexo.pdf', { type: 'application/pdf' })];
    const input = wrapper.get('input[type="file"]');
    Object.defineProperty(input.element, 'files', { configurable: true, value: files });
    await input.trigger('change');
    expect(wrapper.emitted('files-selected')?.[0]).toEqual([files]);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(input.attributes('multiple')).toBeDefined();
  });
});
