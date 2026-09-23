import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConvocation } from '@/api/convocations';
import ConvocationOpeningDialog from '@/components/domain/syllabus/ConvocationOpeningDialog.vue';

vi.mock('@/api/convocations', () => ({ createConvocation: vi.fn() }));

describe('ConvocationOpeningDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.mocked(createConvocation).mockReset();
    vi.mocked(createConvocation).mockResolvedValue({
      message: 'Convocatoria iniciada',
      convocation_id: 'convocation-1',
    });
  });

  it('requiere una fuente y abre la convocatoria con el proceso institucional', async () => {
    const wrapper = mount(ConvocationOpeningDialog, {
      attachTo: document.body,
      props: {
        open: true,
        processId: 'process-1',
        period: '2026-2027',
        availableSources: [{ id: 'source-1', name: 'Reglamento académico' }],
      },
    });
    await flushPromises();

    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent?.includes('Abrir convocatoria'));
    expect(submit?.disabled).toBe(true);

    document.body.querySelector<HTMLElement>('[role="dialog"] [role="checkbox"]')?.click();
    await flushPromises();
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await flushPromises();

    expect(createConvocation).toHaveBeenCalledWith('process-1', ['source-1']);
    expect(wrapper.emitted('opened')).toEqual([['Convocatoria iniciada', 'convocation-1']]);
    expect(wrapper.emitted('update:open')).toContainEqual([false]);
    wrapper.unmount();
  });
});
