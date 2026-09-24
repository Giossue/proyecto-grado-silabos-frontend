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

  it('usa todas las fuentes activas sin pedir selección y abre con el proceso institucional', async () => {
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
    expect(document.body.querySelector('[role="dialog"] [role="checkbox"]')).toBeNull();
    expect(document.body.textContent).toContain('todas las fuentes académicas activas de la carrera');
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await flushPromises();

    expect(createConvocation).toHaveBeenCalledWith('process-1');
    expect(wrapper.emitted('opened')).toEqual([['Convocatoria iniciada', 'convocation-1']]);
    expect(wrapper.emitted('update:open')).toContainEqual([false]);
    wrapper.unmount();
  });

  it('no habilita la apertura si la carrera no tiene fuentes activas', async () => {
    const wrapper = mount(ConvocationOpeningDialog, {
      attachTo: document.body,
      props: { open: true, processId: 'process-1', period: '2026-2027', availableSources: [] },
    });
    await flushPromises();

    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent?.includes('Abrir convocatoria'));
    expect(submit?.disabled).toBe(true);
    expect(document.body.textContent).toContain('Falta registrar al menos una fuente académica activa');
    wrapper.unmount();
  });
});
