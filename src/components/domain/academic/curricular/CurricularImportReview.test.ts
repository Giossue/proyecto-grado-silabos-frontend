import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { CurricularImportDetail } from '@/api/curricular-imports';
import CurricularImportReview from './CurricularImportReview.vue';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';

const { applyCurricularImport } = vi.hoisted(() => ({ applyCurricularImport: vi.fn() }));
vi.mock('@/api/curricular-imports', () => ({ applyCurricularImport }));
const proposal = (): CurricularImportDetail => ({
  id: 'import-1', career_id: 'career-1', status: 'lista', fingerprint: 'a'.repeat(64), error: null, editable: true, lock_reason: null,
  documents: [{ source_id: 'source-1', name: 'Proyecto de carrera.pdf', kind: 'pdf', hash: 'hash', execution_id: null }],
  proposal: {
    definitions: [{ key: 'resultados', label: 'Resultados de aprendizaje', type: 'lista' }],
    values: [
      { id: 'known', concept_key: 'resultados', subject_id: 'subject-1', subject_name: 'Calidad', value: ['Evalúa la calidad.'], evidence: [{ source_id: 'source-1', locator: 'Página 22', quote: 'Evalúa la calidad del software.' }], issue: null },
      { id: 'unmatched', concept_key: 'resultados', subject_id: null, subject_name: 'Calidad SW', value: ['Selecciona métricas.'], evidence: [{ source_id: 'source-1', locator: 'Página 23', quote: 'Selecciona métricas.' }], issue: 'Materia por identificar', issue_code: 'subject_unmatched' },
      { id: 'invalid', concept_key: 'resultados', subject_id: 'subject-1', subject_name: 'Calidad', value: ['Dato sin evidencia fiable.'], evidence: [], issue: 'La evidencia no corresponde a la fuente.', issue_code: 'invalid_evidence' },
    ], issues: ['El documento también menciona otra carrera.'],
  },
});
const wrappers: Array<ReturnType<typeof mount>> = [];
const mountReview = (detail = proposal()) => {
  const wrapper = mount(CurricularImportReview, { attachTo: document.body, props: { detail, subjects: [{ id: 'subject-1', code: 'SW-801', name: 'Calidad de Software' }, { id: 'subject-2', code: 'SW-701', name: 'Pruebas' }] } });
  wrappers.push(wrapper);
  return wrapper;
};
type Wrapper = ReturnType<typeof mountReview>;
const button = (wrapper: Wrapper, label: string) => wrapper.findAll('button').find((item) => item.text() === label)!;
const continueToData = async (wrapper: Wrapper, subject?: string) => {
  if (subject) {
    wrapper.findComponent(Select).vm.$emit('update:modelValue', subject);
    await flushPromises();
  }
  await button(wrapper, 'Continuar').trigger('click');
  await flushPromises();
};
beforeEach(() => { applyCurricularImport.mockReset().mockResolvedValue({ ...proposal(), status: 'aplicada', message: 'Datos aplicados.' }); });
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

describe('CurricularImportReview', () => {
  it('primero pide relacionar las materias y luego muestra datos, citas y la selección inicial', async () => {
    const wrapper = mountReview();
    expect(wrapper.text()).toContain('¿A qué materia corresponde cada nombre?');
    expect(wrapper.text()).toContain('Calidad SW');
    expect(wrapper.find('#proposal-known').exists()).toBe(false);
    await continueToData(wrapper);
    expect(wrapper.text()).toContain('SW-801 · Calidad de Software');
    expect(wrapper.text()).toContain('Resultados de aprendizaje');
    expect(wrapper.text()).toContain('Proyecto de carrera.pdf · Página 22');
    await button(wrapper, 'Proyecto de carrera.pdf · Página 22').trigger('click');
    expect(wrapper.get('blockquote').text()).toBe('Evalúa la calidad del software.');
    expect(wrapper.get('#proposal-known').attributes('data-state')).toBe('checked');
    expect(wrapper.get('#proposal-unmatched').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#proposal-invalid').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'Guardar datos seleccionados').attributes('disabled')).toBeDefined();
    expect(applyCurricularImport).not.toHaveBeenCalled();
  });

  it('permite relacionar la materia ambigua y aplica solo las filas confirmadas con control de concurrencia', async () => {
    const wrapper = mountReview();
    await continueToData(wrapper, 'subject-2');
    expect(wrapper.get('#proposal-unmatched').attributes('data-state')).toBe('checked');
    await wrapper.get('#curricular-import-confirmed').trigger('click');
    await flushPromises();
    expect(button(wrapper, 'Guardar datos seleccionados').attributes('disabled')).toBeUndefined();
    await button(wrapper, 'Volver a las materias').trigger('click');
    await continueToData(wrapper, 'subject-1');
    expect(button(wrapper, 'Guardar datos seleccionados').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Hay más de una propuesta para el mismo dato y asignatura.');
    await button(wrapper, 'Volver a las materias').trigger('click');
    await continueToData(wrapper, 'subject-2');
    await wrapper.get('#curricular-import-confirmed').trigger('click');
    await button(wrapper, 'Guardar datos seleccionados').trigger('click');
    await flushPromises();
    expect(applyCurricularImport).toHaveBeenCalledWith('import-1', { expected_fingerprint: 'a'.repeat(64), confirmed: true, items: [{ id: 'known' }, { id: 'unmatched', subject_id: 'subject-2' }] });
    expect(wrapper.emitted('applied')).toHaveLength(1);
  });

  it('exige revisar explícitamente una discrepancia y relacionar la materia antes de aceptar ese dato', async () => {
    const detail = proposal();
    detail.proposal!.values = [{ ...detail.proposal!.values[1]!, issue_code: 'source_conflict', issue: 'Esta fuente discrepa de otro documento.' }];
    const wrapper = mountReview(detail);
    await continueToData(wrapper, 'subject-2');
    expect(wrapper.get('#proposal-unmatched').attributes('disabled')).toBeDefined();
    await wrapper.get('#proposal-conflict-unmatched').trigger('click');
    expect(wrapper.get('#proposal-unmatched').attributes('disabled')).toBeUndefined();
    expect(wrapper.text()).toContain('El valor de la materia elegida se reemplazará si ya existe.');
    await wrapper.get('#proposal-unmatched').trigger('click');
    await wrapper.get('#curricular-import-confirmed').trigger('click');
    await button(wrapper, 'Guardar datos seleccionados').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Esta fuente discrepa de otro documento.');
    expect(applyCurricularImport).toHaveBeenCalledWith('import-1', { expected_fingerprint: 'a'.repeat(64), confirmed: true, items: [{ id: 'unmatched', subject_id: 'subject-2', accept_conflict: true }] });
  });

  it('relaciona una sola vez cada nombre del documento y filtra lo que requiere revisión', async () => {
    const detail = proposal();
    detail.proposal!.definitions.push({ key: 'bibliografia', label: 'Bibliografía básica', type: 'lista' });
    detail.proposal!.values.push({ ...detail.proposal!.values[1]!, id: 'unmatched-2', concept_key: 'bibliografia', value: ['Libro de métricas.'], evidence: [{ source_id: 'source-1', locator: 'Bibliografia!A5:C5', quote: 'Libro de métricas.' }] });
    const wrapper = mountReview(detail);
    expect(wrapper.findAllComponents(Select)).toHaveLength(1);
    await continueToData(wrapper);
    expect(wrapper.text()).toContain('4 datos encontrados · 1 listos · 3 requieren revisión');
    await wrapper.get('#curricular-only-pending').trigger('click');
    expect(wrapper.find('#proposal-known').exists()).toBe(false);
    await button(wrapper, 'Volver a las materias').trigger('click');
    await continueToData(wrapper, 'subject-2');
    await wrapper.get('#curricular-only-pending').trigger('click');
    expect(wrapper.get('#proposal-unmatched').attributes('data-state')).toBe('checked');
    expect(wrapper.get('#proposal-unmatched-2').attributes('data-state')).toBe('checked');
    expect(wrapper.text()).toContain('4 datos encontrados · 3 listos · 1 requieren revisión');
  });

  it('conserva la propuesta ante un conflicto y bloquea un segundo intento obsoleto', async () => {
    applyCurricularImport.mockRejectedValue(new ApiError('La propuesta cambió. Vuelva a consultarla.', 409));
    const wrapper = mountReview();
    await continueToData(wrapper);
    await wrapper.get('#curricular-import-confirmed').trigger('click');
    const save = button(wrapper, 'Guardar datos seleccionados');
    await save.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('La propuesta cambió');
    expect(wrapper.text()).toContain('Evalúa la calidad.');
    expect(save.attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('applied')).toBeUndefined();
  });

  it('no permite aplicar cuando el servidor bloquea la carrera o cuando la selección está vacía', async () => {
    const wrapper = mountReview();
    await continueToData(wrapper);
    await wrapper.get('#proposal-known').trigger('click');
    await wrapper.get('#curricular-import-confirmed').trigger('click');
    expect(button(wrapper, 'Guardar datos seleccionados').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ detail: { ...proposal(), editable: false, lock_reason: 'Convocatoria abierta.' } });
    expect(wrapper.text()).toContain('Convocatoria abierta.');
    expect(wrapper.findAllComponents(Checkbox).filter((checkbox) => checkbox.props('id') !== 'curricular-only-pending').every((checkbox) => checkbox.props('disabled'))).toBe(true);
    expect(applyCurricularImport).not.toHaveBeenCalled();
  });

  it('el historial distingue datos guardados de los omitidos y muestra la materia finalmente asignada', () => {
    const wrapper = mountReview({ ...proposal(), status: 'aplicada', editable: false, applied_items: [{ id: 'unmatched', subject_id: 'subject-2', accept_conflict: false }] });
    expect(wrapper.text()).toContain('SW-701 · Pruebas');
    expect(wrapper.text().match(/Sin aplicar/g)).toHaveLength(2);
    expect(wrapper.text().match(/Guardado/g)).toHaveLength(1);
    expect(wrapper.find('#curricular-import-confirmed').exists()).toBe(false);
    expect(applyCurricularImport).not.toHaveBeenCalled();
  });

  it('muestra el dato vigente y el propuesto cuando aplicar reemplazará contenido', async () => {
    const detail = proposal();
    Object.assign(detail.proposal!.values[0]!, { current_value: ['Resultado curricular anterior.'], change: 'replace' });
    const wrapper = mountReview(detail);
    await continueToData(wrapper);
    expect(wrapper.text()).toContain('Reemplaza el dato vigente');
    expect(wrapper.text()).toContain('Dato vigente');
    expect(wrapper.text()).toContain('Resultado curricular anterior.');
    expect(wrapper.text()).toContain('Propuesta del documento');
    expect(wrapper.text()).toContain('Evalúa la calidad.');
    expect(applyCurricularImport).not.toHaveBeenCalled();
  });
});
