import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CatalogActions from '@/components/domain/academic/CatalogActions.vue';

import { setAcademicRecordStatus } from '@/api/academic';

vi.mock('@/api/academic', () => ({ deleteAcademicRecord: vi.fn().mockResolvedValue({ message: 'Eliminado.' }), setAcademicRecordStatus: vi.fn().mockResolvedValue({ message: 'Registro desactivado sin borrar su historial.' }), updateAcademicRecord: vi.fn() }));

enableAutoUnmount(afterEach);

const base = { entity: 'facultad' as const, recordId: 'r1', recordName: 'Software', modalityOptions: [], campusOptions: [], faculties: [], active: true };

const open = async (props: Record<string, unknown>) => {
  const wrapper = mount(CatalogActions, { attachTo: document.body, props: { ...base, ...props } as never });
  (wrapper.vm as unknown as { edit: () => void }).edit();
  await flushPromises();

  return wrapper;
};

describe('CatalogActions', () => {
  it('una facultad solo tiene Eliminar: icono directo en la hoja de edición', async () => {
    await open({ entity: 'facultad', recordName: 'Ingeniería' });

    expect(document.body.querySelector('button[aria-label="Eliminar"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-label^="Acciones para"]')).toBeNull();
  });

  it('una carrera activa muestra coordinador y eliminar como botones a la vista, sin menú', async () => {
    await open({ entity: 'carrera', coordinator: null, coordinatorUsers: [], deleteBlockedReason: 'No se puede eliminar: tiene 3 materias.' });

    expect(document.body.querySelector('button[aria-label="Acciones para Software"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label="Asignar coordinador"]')).not.toBeNull();
    expect((document.body.querySelector('button[aria-label="Eliminar"]') as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('No se puede eliminar: tiene 3 materias.');
  });

  it('con una convocatoria bloqueando no se abre la hoja ni hay acciones', async () => {
    await open({ entity: 'facultad', lockReason: 'Convocatoria activa' });

    expect(document.body.querySelector('button[aria-label="Eliminar"]')).toBeNull();
  });

  it('una facultad con carreras asociadas tiene Eliminar deshabilitado y dice por qué', async () => {
    await open({ entity: 'facultad', recordName: 'Ingeniería', deleteBlockedReason: 'No se puede eliminar: tiene 2 carreras asociadas.' });

    const remove = document.body.querySelector('button[aria-label="Eliminar"]') as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
    expect(document.body.textContent).toContain('No se puede eliminar: tiene 2 carreras asociadas.');
  });

  it('una carrera se desactiva con confirmación y una inactiva ofrece Reactivar', async () => {
    const wrapper = await open({ entity: 'carrera', coordinator: null, coordinatorUsers: [] });

    (document.body.querySelector('button[aria-label="Desactivar carrera"]') as HTMLButtonElement).click();
    await flushPromises();
    const confirm = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Desactivar') as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(setAcademicRecordStatus).toHaveBeenCalledWith('carrera', 'r1', false);
    expect(wrapper.emitted('changed')?.[0]).toEqual(['Registro desactivado sin borrar su historial.']);
    wrapper.unmount();

    await open({ entity: 'carrera', active: false });
    expect(document.body.querySelector('button[aria-label="Reactivar carrera"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-label="Asignar coordinador"]')).toBeNull();
  });
});
