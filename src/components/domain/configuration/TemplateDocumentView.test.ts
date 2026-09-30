import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';

const document = {
  type: 'doc',
  content: [{
    type: 'paragraph',
    content: [
      { type: 'variable', attrs: { id: 'firma_docente', label: 'firma_docente' } },
      { type: 'variable', attrs: { id: 'firma_bibliotecario', label: 'firma_bibliotecario' } },
      { type: 'variable', attrs: { id: 'nombre_carrera', label: 'nombre_carrera' } },
    ],
  }],
};

describe('TemplateDocumentView', () => {
  it('pinta las firmas como un espacio con línea y su etiqueta, no como dato pendiente', () => {
    const wrapper = mount(TemplateDocumentView, {
      props: {
        document,
        fields: [],
        variables: { firma_docente: '\n\n\n\nFirma del docente', nombre_carrera: '' },
      },
    });

    const signatures = wrapper.findAll('.document-signature');
    expect(signatures).toHaveLength(2);
    expect(signatures[0]!.find('.document-signature-space').exists()).toBe(true);
    expect(signatures[0]!.get('.document-signature-label').text()).toBe('Firma del docente');
    expect(signatures[1]!.get('.document-signature-label').text()).toBe('Firma de biblioteca');
    expect(wrapper.findAll('.document-variable')).toHaveLength(1);
    expect(wrapper.text().match(/Pendiente de Coordinación/g)).toHaveLength(1);
    wrapper.unmount();
  });
});
