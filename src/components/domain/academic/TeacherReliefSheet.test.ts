import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { relieveCareerTeacher } from '@/api/career-academics';
import TeacherReliefSheet from '@/components/domain/academic/TeacherReliefSheet.vue';
import { Select } from '@/components/ui/select';

vi.mock('@/api/career-academics', () => ({
  relieveCareerTeacher: vi.fn(),
}));

const options = {
  parallels: [],
  teacherUsers: [
    { id: 'teacher-out', name: 'Docente saliente', email: 'sale@example.test' },
    { id: 'teacher-in', name: 'Docente entrante', email: 'entra@example.test' },
  ],
};

const mountSheet = () => mount(TeacherReliefSheet, {
  attachTo: document.body,
  props: {
    open: true,
    outgoingTeacher: { id: 'teacher-out', name: 'Docente saliente', parallelCount: 3 },
    assignment: { id: 'assignment-1', label: 'Inteligencia Artificial · paralelo A' },
    options,
  },
});

const submit = async () => {
  document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  await flushPromises();
};

describe('TeacherReliefSheet', () => {
  beforeEach(() => {
    vi.mocked(relieveCareerTeacher).mockReset().mockResolvedValue({ message: 'Relevo aplicado.' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('releva por defecto solo el paralelo de la fila', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    const selects = wrapper.findAllComponents(Select);
    expect(selects).toHaveLength(2);
    selects[1].vm.$emit('update:modelValue', 'teacher-in');
    await flushPromises();

    await submit();

    expect(relieveCareerTeacher).toHaveBeenCalledWith(expect.objectContaining({
      outgoing_user_id: 'teacher-out',
      incoming_user_id: 'teacher-in',
      teacher_assignment_id: 'assignment-1',
    }));
    expect(wrapper.emitted('saved')).toEqual([['Relevo aplicado.']]);
    wrapper.unmount();
  });

  it('permite relevar todos los paralelos del docente', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    const selects = wrapper.findAllComponents(Select);
    selects[0].vm.$emit('update:modelValue', 'all');
    selects[1].vm.$emit('update:modelValue', 'teacher-in');
    await flushPromises();

    await submit();

    const payload = vi.mocked(relieveCareerTeacher).mock.calls[0][0];
    expect(payload.incoming_user_id).toBe('teacher-in');
    expect(payload).not.toHaveProperty('teacher_assignment_id');
    wrapper.unmount();
  });
});
