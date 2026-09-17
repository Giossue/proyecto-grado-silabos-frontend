import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';

const variants = [
  'table',
  'table-body',
  'table-detail',
  'audit',
  'detail',
  'form',
  'document',
  'dashboard',
  'academic',
  'catalog',
  'academic-structure',
  'notifications',
  'workspace',
  'syllabus',
  'review',
  'documents',
  'source',
  'template',
  'report',
  'convocation',
  'comparison',
] as const;

describe('LoadingSkeleton', () => {
  it.each(variants)('renderiza una superficie accesible para %s', (variant) => {
    const wrapper = mount(LoadingSkeleton, {
      props: {
        variant,
        rows: 2,
        columns: 3,
        mode: 'schedule',
      },
    });

    const status = wrapper.get('[role="status"]');

    expect(status.attributes('aria-live')).toBe('polite');
    expect(status.attributes('aria-busy')).toBe('true');
    expect(status.text()).toContain('Cargando contenido');
    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.findAll('input')).toHaveLength(0);
  });

  it('respeta el modo de curriculum sin introducir controles enfocables', () => {
    const wrapper = mount(LoadingSkeleton, {
      props: { variant: 'academic-structure', mode: 'curriculum' },
    });

    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.findAll('button')).toHaveLength(0);
  });
});
