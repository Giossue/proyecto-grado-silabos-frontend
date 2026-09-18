import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import ManagedUserSheet from '@/components/domain/identity/ManagedUserSheet.vue';

describe('ManagedUserSheet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('no solicita ni muestra una contraseña al crear la cuenta', async () => {
    const wrapper = mount(ManagedUserSheet, {
      attachTo: document.body,
      props: {
        open: true,
        teacherCareer: { id: 'career-1', name: 'Software' },
      },
    });
    await flushPromises();

    expect(document.querySelector('#managed-user-password')).toBeNull();

    wrapper.unmount();
  });
});
