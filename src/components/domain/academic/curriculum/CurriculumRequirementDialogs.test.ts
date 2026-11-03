import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSubjectRequirement } from '@/api/career-academics';
import CurriculumRequirementDialogs from '@/components/domain/academic/curriculum/CurriculumRequirementDialogs.vue';
import type { CurriculumRequirement } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';

vi.mock('@/api/career-academics', () => ({ createSubjectRequirement: vi.fn(), deleteSubjectRequirement: vi.fn() }));

enableAutoUnmount(afterEach);

// Simula la animación de salida: el modal cerrado sigue en pantalla hasta que termina.
const keepClosingDialogs = (): void => {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = real(element, pseudo);
    return element.getAttribute('data-state') === 'closed' ? new Proxy(style, { get: (target, key) => (key === 'animationName' ? 'exit' : Reflect.get(target, key)) }) : style;
  });
};
const names: Record<string, string> = { a: 'Cálculo', b: 'Física' };

describe('CurriculumRequirementDialogs', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('al eliminar la relación, el modal conserva su tipo y sus materias mientras se cierra', async () => {
    keepClosingDialogs();
    vi.mocked(deleteSubjectRequirement).mockResolvedValue({ message: 'Relación eliminada.' } as never);
    const requirement = { id: 'r1', type: 'correquisito', requirement_id: 'a', subject_id: 'b' } as unknown as CurriculumRequirement;
    const wrapper = mount(CurriculumRequirementDialogs, {
      attachTo: document.body,
      props: {
        curriculumId: 'c1',
        editable: true,
        subjectName: (id: string | null | undefined) => (id ? names[id] ?? 'materia' : 'materia'),
        subjectCycle: () => 1,
        pendingConnection: null,
        selectedRequirement: requirement,
        'onUpdate:selectedRequirement': (value: unknown) => wrapper.setProps({ selectedRequirement: value as never }),
      },
    });
    await flushPromises();

    [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.includes('Eliminar relación'))!.click();
    await flushPromises();

    expect(deleteSubjectRequirement).toHaveBeenCalledWith('c1', 'r1');
    expect(wrapper.emitted('changed')).toEqual([['Relación eliminada.']]);
    const closing = document.body.querySelector('[role="dialog"][data-state="closed"]')!;
    expect(closing.textContent).toContain('Correquisito');
    expect(closing.textContent).toContain('«Cálculo» → «Física»');
  });
});
