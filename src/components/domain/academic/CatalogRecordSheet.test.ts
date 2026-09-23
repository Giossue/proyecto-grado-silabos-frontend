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

  it('orders faculty name, campus, and logo fields', async () => {
    const faculty = mount(CatalogRecordSheet, {
      attachTo: document.body,
      props: { entity: 'facultad', options, open: true },
    });
    await flushPromises();

    const nameLabel = document.body.querySelector('label[for="catalog-name"]');
    const campusLabel = document.body.querySelector('label[for="catalog-campus"]');
    const logoLabel = document.body.querySelector('label[for="faculty-logo"]');
    expect(nameLabel).not.toBeNull();
    expect(campusLabel).not.toBeNull();
    expect(logoLabel).not.toBeNull();
    expect(nameLabel!.compareDocumentPosition(campusLabel!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(campusLabel!.compareDocumentPosition(logoLabel!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    faculty.unmount();
  });

  it('does not ask for a period code or teaching weeks', async () => {
    const period = mount(CatalogRecordSheet, {
      attachTo: document.body,
      props: { entity: 'periodo', options, open: true },
    });
    await flushPromises();

    expect(document.body.querySelector('#catalog-code')).toBeNull();
    expect(document.body.querySelector('input#catalog-teaching-weeks')).toBeNull();
    expect(document.body.textContent).not.toContain('Código del período');
    expect(document.body.textContent).not.toContain('Semanas lectivas calculadas');
    period.unmount();
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

  it('shows a current faculty logo only when one is configured', async () => {
    const withoutLogo = mount(CatalogEditSheet, {
      attachTo: document.body,
      props: {
        entity: 'facultad',
        recordId: 'faculty-without-logo',
        recordName: 'Facultad sin logo',
        faculties: [],
        campusOptions: [],
        logoUrl: null,
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).toBeNull();
    withoutLogo.unmount();

    const withLogo = mount(CatalogEditSheet, {
      attachTo: document.body,
      props: {
        entity: 'facultad',
        recordId: 'faculty-with-logo',
        recordName: 'Facultad con logo',
        faculties: [],
        campusOptions: [],
        logoUrl: '/logos/facultad/faculty-with-logo?v=1',
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector<HTMLImageElement>('img[alt="Logo actual de la facultad"]')?.src)
      .toContain('/logos/facultad/faculty-with-logo?v=1');
    withLogo.unmount();
  });

  it('does not ask for a period code on edit', async () => {
    const wrapper = mount(CatalogEditSheet, {
      attachTo: document.body,
      props: {
        entity: 'periodo',
        recordId: 'period-1',
        recordName: 'Agosto-Diciembre 2026',
        startsOn: '2026-08-17',
        endsOn: '2026-12-18',
        faculties: [],
        campusOptions: [],
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector('#edit-code-period-1')).toBeNull();
    expect(document.body.querySelector('input#edit-teaching-weeks-period-1')).toBeNull();
    expect(document.body.textContent).not.toContain('Semanas lectivas calculadas');
    wrapper.unmount();
  });
});
