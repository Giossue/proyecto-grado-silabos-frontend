import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
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

  it('abre con el proceso institucional y los datos confirmados sin requerir fuentes', async () => {
    const wrapper = mount(ConvocationOpeningDialog, {
      attachTo: document.body,
      props: {
        open: true,
        processId: 'process-1',
        period: '2026-2027',
      },
    });
    await flushPromises();

    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent?.includes('Abrir convocatoria'));
    expect(document.body.querySelector('[role="dialog"] [role="checkbox"]')).toBeNull();
    expect(document.body.textContent).not.toContain('fuentes académicas');
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await flushPromises();

    expect(createConvocation).toHaveBeenCalledWith('process-1');
    expect(wrapper.emitted('opened')).toEqual([['Convocatoria iniciada', 'convocation-1']]);
    expect(wrapper.emitted('update:open')).toContainEqual([false]);
    wrapper.unmount();
  });

  it('muestra el impedimento informado por el servidor y permite intentarlo otra vez', async () => {
    vi.mocked(createConvocation).mockRejectedValueOnce(new ApiError('La plantilla institucional está incompleta', 422));
    const wrapper = mount(ConvocationOpeningDialog, {
      attachTo: document.body,
      props: { open: true, processId: 'process-1', period: '2026-2027' },
    });
    await flushPromises();

    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent?.includes('Abrir convocatoria'));
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await flushPromises();
    expect(document.body.textContent).toContain('La plantilla institucional está incompleta');
    expect(wrapper.emitted('opened')).toBeUndefined();
    expect(submit?.disabled).toBe(false);
    wrapper.unmount();
  });
});
