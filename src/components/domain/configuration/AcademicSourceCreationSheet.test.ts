import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSource, getSource, ingestSourcePdf, type SourceDetail } from '@/api/sources';
import AcademicSourceCreationSheet from '@/components/domain/configuration/AcademicSourceCreationSheet.vue';

vi.mock('@/api/sources', () => ({
  createSource: vi.fn(),
  getSource: vi.fn(),
  ingestSourcePdf: vi.fn(),
}));

const detail = (status: 'en_ejecucion' | 'completada', progress: number): SourceDetail => ({
  processLock: null,
  source: {
    id: 'source-1',
    name: 'Reglamento',
    description: null,
    document: { schemaVersion: 1, type: 'doc', content: [] },
    document_schema_version: 1,
    has_original_pdf: true,
    ingestion: {
      status,
      execution_id: 'execution-1',
      model: 'paddleocr-vl-1.6',
      requested_at: '2026-09-20T12:00:00Z',
      completed_at: status === 'completada' ? '2026-09-20T12:01:00Z' : null,
      progress,
      error_code: null,
      error_message: null,
    },
  },
});

describe('AcademicSourceCreationSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(createSource).mockReset().mockResolvedValue({ message: 'Fuente creada.', source_id: 'source-1' });
    vi.mocked(ingestSourcePdf).mockReset().mockResolvedValue({ message: 'PDF recibido.', execution_id: 'execution-1', status: 'pendiente' });
    vi.mocked(getSource).mockReset()
      .mockResolvedValueOnce(detail('en_ejecucion', 45))
      .mockResolvedValueOnce(detail('completada', 100));
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('bloquea el flujo, muestra el progreso real y termina antes de abrir la fuente', async () => {
    const wrapper = mount(AcademicSourceCreationSheet, {
      attachTo: document.body,
      props: { open: true },
    });
    await flushPromises();

    const name = document.body.querySelector<HTMLInputElement>('#source-name');
    const pdf = document.body.querySelector<HTMLInputElement>('#source-pdf');
    expect(name).not.toBeNull();
    expect(pdf).not.toBeNull();
    name!.value = 'Reglamento';
    name!.dispatchEvent(new Event('input'));
    Object.defineProperty(pdf, 'files', {
      configurable: true,
      value: [new File(['pdf'], 'reglamento.pdf', { type: 'application/pdf' })],
    });
    pdf!.dispatchEvent(new Event('change'));
    await flushPromises();

    document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(document.body.textContent).toContain('OpenParser está organizando');
    expect(document.body.textContent).toContain('45 %');
    expect(wrapper.emitted('created')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1200);
    await flushPromises();

    expect(wrapper.emitted('created')).toEqual([['source-1']]);
    wrapper.unmount();
  });
});
