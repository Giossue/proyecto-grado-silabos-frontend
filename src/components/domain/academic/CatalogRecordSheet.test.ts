import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import CatalogEditSheet from '@/components/domain/academic/CatalogEditSheet.vue';
import CatalogRecordSheet from '@/components/domain/academic/CatalogRecordSheet.vue';

const options = {
  faculties: [],
  careers: [],
  periods: [],
  campusOptions: [],
  currentCurricula: [],
  activeSubjects: [],
  scheduledSubjects: [],
  parallels: [],
  coordinatorUsers: [],
  teacherUsers: [],
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('academic catalog code fields', () => {
  it('omits faculty code and requires career code on creation', async () => {
    const faculty = mount(CatalogRecordSheet, {
      attachTo: document.body,
      props: { entity: 'facultad', options, open: true },
    });
    await flushPromises();

    expect(document.body.querySelector('#catalog-code')).toBeNull();
    expect(document.body.textContent).not.toContain('Código de facultad');
    faculty.unmount();

    const career = mount(CatalogRecordSheet, {
      attachTo: document.body,
      props: { entity: 'carrera', options, open: true },
    });
    await flushPromises();

    const careerCode = document.body.querySelector<HTMLInputElement>('#catalog-code');
    expect(careerCode?.required).toBe(true);
    expect(document.body.textContent).toContain('Código de carrera');
    expect(document.body.textContent).not.toContain('Código de malla curricular');
    career.unmount();
  });

  it('omits faculty code on edit', async () => {
    const wrapper = mount(CatalogEditSheet, {
      attachTo: document.body,
      props: {
        entity: 'facultad',
        recordId: 'faculty-1',
        recordName: 'Facultad de prueba',
        faculties: [],
        campusOptions: [],
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector('#edit-code-faculty-1')).toBeNull();
    expect(document.body.textContent).not.toContain('Código de facultad');
    wrapper.unmount();
  });
});
