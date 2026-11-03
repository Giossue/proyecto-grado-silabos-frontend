import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCurriculumSubject } from '@/api/career-academics';
import CurriculumSubjectNode from '@/components/domain/academic/curriculum/CurriculumSubjectNode.vue';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';
import type { CurriculumBuilderSubject } from '@/types/academic';

vi.mock('@/api/career-academics', () => ({ deleteCurriculumSubject: vi.fn() }));
vi.mock('@vue-flow/core', () => ({ Handle: { template: '<div><slot /></div>' }, Position: { Top: 'top', Bottom: 'bottom' } }));

enableAutoUnmount(afterEach);

const subject = { id: 's1', code: 'SW-1', name: 'Cálculo', cycle: 1, position: 0, modality_label: null, generates_syllabus: true, display_fields: [] } as unknown as CurriculumBuilderSubject;
const passthrough = { template: '<div><slot /></div>' };

describe('CurriculumSubjectNode', () => {
  beforeEach(() => { document.body.innerHTML = ''; vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('al eliminar la materia, avisa a la malla solo cuando el modal terminó de cerrarse', async () => {
    vi.mocked(deleteCurriculumSubject).mockResolvedValue({ message: 'Materia eliminada.' } as never);
    const onSaved = vi.fn();
    mount(CurriculumSubjectNode, {
      attachTo: document.body,
      props: {
        data: {
          career: { id: 'career', name: 'Software', modality: null },
          curriculum: { id: 'c1', cycle_count: 1, editable: true, lock_reason: null },
          fixedFields: [],
          subject,
          unitStyle: { backgroundColor: '', color: '' },
          editable: true,
          onEdit: vi.fn(),
          canMoveLeft: false,
          canMoveRight: false,
          onMoveLeft: vi.fn(),
          onMoveRight: vi.fn(),
          onRelate: vi.fn(),
          onSaved,
        } as never,
      },
      global: {
        stubs: {
          TableActionsMenu: passthrough,
          DropdownMenuItem: { emits: ['select'], template: '<button type="button" @click="$emit(\'select\')"><slot /></button>' },
          Tooltip: passthrough,
          TooltipTrigger: passthrough,
          TooltipContent: passthrough,
        },
      },
    });
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Eliminar')!.click();
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.includes('Eliminar materia'))!.click();
    await flushPromises();

    expect(deleteCurriculumSubject).toHaveBeenCalledWith('c1', 's1');
    expect(onSaved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
    expect(onSaved).toHaveBeenCalledWith('Materia eliminada.');
  });
});
