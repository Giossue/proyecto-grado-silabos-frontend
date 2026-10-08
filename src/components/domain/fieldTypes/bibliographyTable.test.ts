import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TextFieldEditor from '@/components/domain/fieldTypes/TextFieldEditor.vue';
import { BIBLIOGRAPHY_COLUMNS } from '@/components/domain/fieldTypes/bibliographyTable';

const editorStub = { props: ['modelValue', 'bulletsOnly'], template: '<div />' };

describe('bibliografía como tabla', () => {
  it('un campo de bibliografía vacío arranca con la tabla y sus columnas, y admite tablas', () => {
    const wrapper = mount(TextFieldEditor, {
      props: { field: { id: 'b', key: 'bibliografia', label: '', type: 'ficha', config: { optional: true }, value: null }, modelValue: null },
      global: { stubs: { FreeTextEditor: editorStub } },
    });
    const editor = wrapper.findComponent(editorStub);
    const text = JSON.stringify(editor.props('modelValue'));

    expect(editor.props('bulletsOnly')).toBe(false);
    for (const column of BIBLIOGRAPHY_COLUMNS) expect(text).toContain(column);
  });

  it('otros campos opcionales siguen siendo de viñetas', () => {
    const wrapper = mount(TextFieldEditor, {
      props: { field: { id: 'o', key: 'discapacidad_tipo', label: '', type: 'texto', config: { optional: true }, value: null }, modelValue: null },
      global: { stubs: { FreeTextEditor: editorStub } },
    });

    expect(wrapper.findComponent(editorStub).props('bulletsOnly')).toBe(true);
  });
});
