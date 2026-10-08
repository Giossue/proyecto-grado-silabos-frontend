import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CatalogActions from '@/components/domain/academic/CatalogActions.vue';

vi.mock('@/api/academic', () => ({ deleteAcademicRecord: vi.fn().mockResolvedValue({ message: 'Eliminado.' }), updateAcademicRecord: vi.fn() }));

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

  it('una carrera activa tiene coordinador y eliminar: menú en la hoja de edición', async () => {
    await open({ entity: 'carrera', coordinator: null, coordinatorUsers: [] });

    expect(document.body.querySelector('button[aria-label="Acciones para Software"]')).not.toBeNull();
  });

  it('con una convocatoria bloqueando no se abre la hoja ni hay acciones', async () => {
    await open({ entity: 'facultad', lockReason: 'Convocatoria activa' });

    expect(document.body.querySelector('button[aria-label="Eliminar"]')).toBeNull();
  });
});
