import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extendProcessDeadline } from '@/api/processes';
import DatePicker from '@/components/DatePicker.vue';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';

vi.mock('@/api/processes', () => ({
  extendProcessDeadline: vi.fn(),
}));

describe('DeadlineExtensionSheet', () => {
  beforeEach(() => {
    vi.mocked(extendProcessDeadline).mockReset().mockResolvedValue({ message: 'Plazo prorrogado.' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('extends only the delivery deadline without asking for a stage', async () => {
    const wrapper = mount(DeadlineExtensionSheet, {
      attachTo: document.body,
      props: { processId: 'process-1', open: true },
    });
    await flushPromises();

    expect(document.body.textContent).toContain('Nueva fecha límite de entrega');
    expect(document.body.textContent).not.toContain('Etapa');

    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    const reason = document.body.querySelector<HTMLTextAreaElement>('#extension-reason');
    expect(reason).not.toBeNull();
    reason!.value = 'Ampliación institucional por relevo de docentes.';
    reason!.dispatchEvent(new Event('input'));
    await flushPromises();

    document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(extendProcessDeadline).toHaveBeenCalledWith('process-1', {
      due_at: '2027-02-15',
      reason: 'Ampliación institucional por relevo de docentes.',
    });
    expect(wrapper.emitted('saved')).toEqual([['Plazo prorrogado.']]);
    wrapper.unmount();
  });
});
