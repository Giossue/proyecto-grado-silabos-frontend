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
  it('una facultad no se elimina: se desactiva con confirmación, desde la hoja de edición', async () => {
    const wrapper = await open({ entity: 'facultad', recordName: 'Ingeniería' });

    expect(document.body.querySelector('button[aria-label="Eliminar"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label^="Acciones para"]')).toBeNull();
    (document.body.querySelector('button[aria-label="Desactivar facultad"]') as HTMLButtonElement).click();
    await flushPromises();
    ([...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Desactivar') as HTMLButtonElement).click();
    await flushPromises();

    expect(setAcademicRecordStatus).toHaveBeenCalledWith('facultad', 'r1', false);
    expect(wrapper.emitted('changed')?.[0]).toEqual(['Registro desactivado sin borrar su historial.']);
  });

  it('una carrera activa muestra desactivar, sin coordinador, eliminar ni menú', async () => {
    await open({ entity: 'carrera' });

    expect(document.body.querySelector('button[aria-label="Acciones para Software"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label$="coordinador"]')).toBeNull();
    expect(document.body.querySelector('button[aria-label="Desactivar carrera"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-label="Eliminar"]')).toBeNull();
  });

  it('con una convocatoria bloqueando no se abre la hoja ni hay acciones', async () => {
    await open({ entity: 'facultad', lockReason: 'Convocatoria activa' });

    expect(document.body.querySelector('button[aria-label="Desactivar facultad"]')).toBeNull();
  });

  it('un período sigue teniendo Eliminar', async () => {
    await open({ entity: 'periodo', recordName: '2026-2027' });

    expect(document.body.querySelector('button[aria-label="Eliminar"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-label^="Desactivar"]')).toBeNull();
  });

  it('una carrera se desactiva con confirmación y una inactiva ofrece Reactivar', async () => {
    const wrapper = await open({ entity: 'carrera' });

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
  });
});
