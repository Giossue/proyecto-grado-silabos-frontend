import { flushPromises, mount } from '@vue/test-utils';
import { getLocalTimeZone, today } from '@internationalized/date';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DatePicker from '@/components/DatePicker.vue';
import CatalogEditDialog from '@/components/domain/academic/CatalogEditDialog.vue';
import CatalogRecordDialog from '@/components/domain/academic/CatalogRecordDialog.vue';
import { createAcademicRecord } from '@/api/academic';

vi.mock('@/api/libraryCatalog', () => ({ getCatalogLibraries: vi.fn().mockResolvedValue([]) }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/academic')>()), createAcademicRecord: vi.fn() }));

// Simula la animación de salida: el modal cerrado sigue en pantalla hasta que termina.
const keepClosingDialogs = (): void => {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = real(element, pseudo);
    return element.getAttribute('data-state') === 'closed' ? new Proxy(style, { get: (target, key) => (key === 'animationName' ? 'exit' : Reflect.get(target, key)) }) : style;
  });
};

const options = {
  faculties: [],
  careers: [],
  periods: [],
  modalityOptions: [{ value: 'Presencial', label: 'Presencial' }],  shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }],  campusOptions: [],
  currentCurricula: [],
  activeSubjects: [],
  scheduledSubjects: [],
  parallels: [],
  teacherUsers: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('academic catalog code fields', () => {
  it('omits faculty code and requires career code on creation', async () => {
    const faculty = mount(CatalogRecordDialog, {
      attachTo: document.body,
      props: { entity: 'facultad', options, open: true },
    });
    await flushPromises();

    expect(document.body.querySelector('#catalog-code')).toBeNull();
    expect(document.body.textContent).not.toContain('Código de facultad');
    faculty.unmount();

    const career = mount(CatalogRecordDialog, {
      attachTo: document.body,
      props: { entity: 'carrera', options, open: true },
    });
    await flushPromises();

    const careerCode = document.body.querySelector<HTMLInputElement>('#catalog-code');
    expect(careerCode?.getAttribute('aria-required')).toBe('true');
    expect(careerCode?.required).toBe(false);
    expect(document.body.textContent).toContain('Código de carrera');
    expect(document.body.textContent).not.toContain('Código de malla curricular');
    career.unmount();
  });

  it('orders faculty name, campus, and logo fields', async () => {
    const faculty = mount(CatalogRecordDialog, {
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
    expect(document.body.querySelector<HTMLInputElement>('#faculty-logo')?.required).toBe(true);
    expect(document.body.textContent).toContain('Se ajusta a 600 × 180 px');
    expect(document.body.textContent).toContain('fondo transparente');
    expect(document.body.textContent).not.toContain('fondo sólido');
    expect(document.body.textContent).not.toContain('Opcional para Administración');
    expect(nameLabel!.compareDocumentPosition(campusLabel!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(campusLabel!.compareDocumentPosition(logoLabel!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    faculty.unmount();
  });

  it('does not ask for a period code or teaching weeks', async () => {
    const period = mount(CatalogRecordDialog, {
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

  it('limits a new period to today and keeps its end after its start', async () => {
    const period = mount(CatalogRecordDialog, {
      attachTo: document.body,
      props: { entity: 'periodo', options, open: true },
    });
    await flushPromises();

    const datePickers = period.findAllComponents(DatePicker);
    const localToday = today(getLocalTimeZone()).toString();
    expect(datePickers).toHaveLength(2);
    expect(datePickers[0].props('minValue')).toBe(localToday);
    expect(datePickers[1].props('minValue')).toBe(localToday);

    datePickers[1].vm.$emit('update:modelValue', '2029-12-18');
    datePickers[0].vm.$emit('update:modelValue', '2030-01-10');
    await nextTick();

    expect(datePickers[1].props('minValue')).toBe('2030-01-10');
    expect(datePickers[1].props('modelValue')).toBe('');
    period.unmount();
  });

  it('omits faculty code on edit', async () => {
    const wrapper = mount(CatalogEditDialog, {
      attachTo: document.body,
      props: {
        entity: 'facultad',
        recordId: 'faculty-1',
        recordName: 'Facultad de prueba',
        faculties: [],
        modalityOptions: [{ value: 'Presencial', label: 'Presencial' }],        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }],        campusOptions: [],
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector('#edit-code-faculty-1')).toBeNull();
    expect(document.body.textContent).not.toContain('Código de facultad');
    wrapper.unmount();
  });

  it('requires a faculty logo only when no current logo is configured', async () => {
    const withoutLogo = mount(CatalogEditDialog, {
      attachTo: document.body,
      props: {
        entity: 'facultad',
        recordId: 'faculty-without-logo',
        recordName: 'Facultad sin logo',
        faculties: [],
        modalityOptions: [{ value: 'Presencial', label: 'Presencial' }],        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }],        campusOptions: [],
        logoUrl: null,
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).toBeNull();
    expect(document.body.querySelector<HTMLInputElement>('#edit-faculty-logo-faculty-without-logo')?.required).toBe(true);
    withoutLogo.unmount();

    const withLogo = mount(CatalogEditDialog, {
      attachTo: document.body,
      props: {
        entity: 'facultad',
        recordId: 'faculty-with-logo',
        recordName: 'Facultad con logo',
        faculties: [],
        modalityOptions: [{ value: 'Presencial', label: 'Presencial' }],        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }],        campusOptions: [],
        logoUrl: '/logos/facultad/faculty-with-logo?v=1',
        open: true,
      },
    });
    await flushPromises();

    expect(document.body.querySelector<HTMLImageElement>('img[alt="Logo actual de la facultad"]')?.src)
      .toContain('/logos/facultad/faculty-with-logo?v=1');
    expect(document.body.querySelector('#edit-faculty-logo-faculty-with-logo')).toBeNull();
    withLogo.unmount();
  });

  it('does not ask for a period code on edit', async () => {
    const wrapper = mount(CatalogEditDialog, {
      attachTo: document.body,
      props: {
        entity: 'periodo',
        recordId: 'period-1',
        recordName: 'Agosto-Diciembre 2026',
        startsOn: '2026-08-17',
        endsOn: '2026-12-18',
        faculties: [],
        modalityOptions: [{ value: 'Presencial', label: 'Presencial' }],        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }],        campusOptions: [],
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

describe('salida del formulario de creación', () => {
  it('al crear, el formulario se cierra con lo escrito y se limpia al volver a abrirlo', async () => {
    keepClosingDialogs();
    vi.mocked(createAcademicRecord).mockResolvedValue({ message: 'Carrera creada.' } as never);
    const wrapper = mount(CatalogRecordDialog, {
      attachTo: document.body,
      props: { entity: 'carrera' as const, options, open: true, 'onUpdate:open': (value: boolean) => wrapper.setProps({ open: value }) },
    });
    await flushPromises();
    const name = (): HTMLInputElement => document.body.querySelector<HTMLInputElement>('#catalog-name')!;
    name().value = 'Software';
    name().dispatchEvent(new Event('input'));
    await flushPromises();
    name().closest('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(createAcademicRecord).toHaveBeenCalledWith('carrera', expect.any(FormData));
    expect(wrapper.emitted('saved')).toEqual([['Carrera creada.']]);
    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('closed');
    expect(name().value).toBe('Software');

    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(name().value).toBe('');
    wrapper.unmount();
  });
});
