import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DialogHeader from './DialogHeader.vue';

describe('DialogHeader', () => {
  it('centra el título, pero las listas de la descripción van a la izquierda', () => {
    const classes = mount(DialogHeader, { slots: { default: '<ul><li>Uno</li></ul>' } }).classes();

    expect(classes).toContain('text-center');
    expect(classes).toContain('[&_ul]:text-left');
    expect(classes).toContain('[&_ol]:text-left');
  });
});
