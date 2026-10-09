import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';

const cell = (text: string, attrs: Record<string, unknown> = {}) => ({
  type: 'tableCell',
  attrs: { colspan: 1, rowspan: 1, ...attrs },
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('tablas del documento', () => {
  it('reparte las columnas según los anchos guardados en la primera fila', () => {
    const document = {
      type: 'doc',
      content: [{ type: 'table', content: [
        { type: 'tableRow', content: [cell('Encabezado', { colspan: 3, colwidth: [20, 30, 50] })] },
        { type: 'tableRow', content: [cell('A'), cell('B'), cell('C')] },
      ] }],
    };
    const wrapper = mount(FreeTextContent, { props: { value: document } });
    const columns = wrapper.findAll('col');

    expect(columns.map((column) => column.attributes('style'))).toEqual(['width: 20%;', 'width: 30%;', 'width: 50%;']);
    expect(wrapper.get('table').attributes('style')).toContain('table-layout: fixed');
  });

  it('deja las tablas sin anchos como estaban', () => {
    const document = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [cell('A'), cell('B')] }] }] };
    const wrapper = mount(FreeTextContent, { props: { value: document } });

    expect(wrapper.find('colgroup').exists()).toBe(false);
  });
});
