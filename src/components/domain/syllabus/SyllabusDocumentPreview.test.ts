import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { DocumentPresentation, SyllabusDetail } from '@/api/syllabi';
import type { TemplateAppearance } from '@/api/template';
import SyllabusDocumentPreview from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';

const paragraph = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const appearance = { margin_cm: 2.5, title_font_size: 16, section_font_size: 12, body_font_size: 10 } as unknown as TemplateAppearance;
const presentation: DocumentPresentation = { appearance, title: 'PROGRAMA DE ASIGNATURA (SÍLABO)', logos: { institution: '/ueb.png', faculty: '/facultad.png' } };
const sections = [
  { id: 's1', key: 'descripcion', title: '2. Descripción', description: null, orientation: 'portrait', fields: [
    { id: 'f1', key: 'descripcion', label: 'Descripción', quien_llena: 'docente', value: paragraph('Texto del docente'), required: true, teacher_editable: true },
    { id: 'f2', key: 'vacio', label: 'Pendiente', quien_llena: 'docente', value: null, required: true, teacher_editable: true },
  ] },
  { id: 's2', key: 'unidades', title: '6. Planificación', description: null, orientation: 'landscape', fields: [
    { id: 'f3', key: 'perfil', label: '', quien_llena: 'coordinacion', value: null, document: paragraph('Dato de la carrera'), required: false, teacher_editable: false },
  ] },
] as unknown as SyllabusDetail['sections'];

describe('SyllabusDocumentPreview', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('muestra el documento en hojas con el título, las secciones y lo escrito, con el diseño de la plantilla', async () => {
    const wrapper = mount(SyllabusDocumentPreview, { props: { presentation, sections }, attachTo: document.body });
    await flushPromises();

    const sheets = wrapper.findAll('[data-sheet]');
    expect(sheets).toHaveLength(2);
    expect(sheets[1]!.classes()).toContain('template-sheet--landscape');
    expect(sheets[0]!.attributes('style')).toContain('--document-margin: 2.5cm');
    expect(sheets[0]!.attributes('style')).toContain('--document-body-size: 10pt');
    expect(wrapper.text()).toContain('PROGRAMA DE ASIGNATURA (SÍLABO)');
    expect(wrapper.text()).toContain('2. Descripción');
    expect(wrapper.text()).toContain('Texto del docente');
    expect(wrapper.text()).toContain('Sin completar');
    expect(wrapper.text()).toContain('Dato de la carrera');
    expect(wrapper.findAll('img')).toHaveLength(2);

    wrapper.unmount();
  });
});
