import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReviewHistorySheet from '@/components/domain/syllabus/ReviewHistorySheet.vue';

vi.mock('@/lib/routes', () => ({ reviewAreaPaths: () => ({ review: (id: string) => `/r/${id}`, comparison: (before: string, after: string) => `/c/${before}/${after}` }) }));

enableAutoUnmount(afterEach);

const item = (id: string, number: number) => ({ id, number, submitted_at: '2026-10-30T10:00:00Z', submitted_by: 'Docente Demo', coordination_reviewed_at: null, coordination_reviewed_by: null, approved_at: null, approved_by: null });

describe('ReviewHistorySheet', () => {
  it('lista las revisiones de la última a la primera y solo compara las que tienen una anterior', async () => {
    mount(ReviewHistorySheet, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
      props: { open: true, currentId: 'r3', history: [item('r1', 1), item('r2', 2), item('r3', 3)] as never },
    });
    await flushPromises();

    const rows = [...document.body.querySelectorAll('ol > li')].map((row) => row.textContent ?? '');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('Revisión 3 (actual)');
    expect(rows[0]).toContain('Comparar con la revisión 2');
    expect(rows[1]).toContain('Revisión 2');
    expect(rows[1]).toContain('Comparar con la revisión 1');
    expect(rows[2]).toContain('Revisión 1');
    expect(rows[2]).toContain('Primera revisión: no hay una anterior con qué comparar.');
    expect(rows[2]).not.toContain('Comparar con');
    expect(document.body.querySelector<HTMLAnchorElement>('a[href="/c/r2/r3"]')).not.toBeNull();
  });
});
