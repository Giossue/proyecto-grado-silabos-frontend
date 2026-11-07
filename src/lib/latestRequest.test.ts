import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import { latestRequest } from '@/lib/latestRequest';

describe('latestRequest', () => {
  it('solo la última petición iniciada sigue vigente', () => {
    const requests = latestRequest();
    const first = requests.begin();
    const second = requests.begin();

    expect(requests.isCurrent(first)).toBe(false);
    expect(requests.isCurrent(second)).toBe(true);
  });

  it('al salir de la pantalla ninguna petición sigue vigente', () => {
    let requests!: ReturnType<typeof latestRequest>;
    const wrapper = mount(defineComponent({ setup: () => { requests = latestRequest(); return () => null; } }));
    const ticket = requests.begin();

    wrapper.unmount();

    expect(requests.isCurrent(ticket)).toBe(false);
  });
});
