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

    expect(wrapper.text()).toContain('Arrastra tu PNG aquí');
    expect(wrapper.get('input').attributes('accept')).toBe('image/png,.png');
    expect(wrapper.get('input').attributes('required')).toBeDefined();
    expect(wrapper.get('input').attributes('aria-required')).toBe('true');

    const file = new File(['png'], 'facultad.png', { type: 'image/png' });
    await selectFile(wrapper, file);

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([file]);
    expect(wrapper.emitted('validation-error')?.[0]).toEqual([null]);
  });

  it('rejects a non-PNG file in the PNG variant', async () => {
    const wrapper = mount(FileDropzone, {
      props: { modelValue: null, inputId: 'faculty-logo', kind: 'png' },
    });

    await selectFile(wrapper, new File(['pdf'], 'facultad.pdf', { type: 'application/pdf' }));

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    expect(wrapper.emitted('validation-error')?.[0]).toEqual(['Seleccione un archivo PNG.']);
  });
});
