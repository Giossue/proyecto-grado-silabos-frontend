import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PaginationControls from '@/components/PaginationControls.vue';

describe('PaginationControls', () => {
  it('emits bounded previous and next pages', async () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 2, lastPage: 4, total: 61 },
    });

    const buttons = wrapper.findAll('button');
    await buttons[0]?.trigger('click');
    await buttons[1]?.trigger('click');

    expect(wrapper.text()).toContain('Página 2 de 4 · 61 resultados');
    expect(wrapper.emitted('change')).toEqual([[1], [3]]);
  });

  it('does not render for a single page', () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 1, lastPage: 1, total: 8 },
    });

    expect(wrapper.find('nav').exists()).toBe(false);
  });
});
