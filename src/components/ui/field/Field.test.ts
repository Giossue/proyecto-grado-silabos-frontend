import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const mountField = (invalid: boolean) => mount({
  components: { Field, FieldError, Input, Textarea },
  props: ['invalid'],
  template: '<Field :data-invalid="invalid"><Input id="a" aria-describedby="hint" /><Textarea id="b" /><FieldError :errors="invalid ? [\'Falta este dato\'] : []" /></Field>',
}, { props: { invalid } });

describe('Field', () => {
  it('enlaza el error con el control y lo marca inválido', () => {
    const wrapper = mountField(true);
    const errorId = wrapper.get('[data-slot="field-error"]').attributes('id');

    expect(errorId).toBeTruthy();
    expect(wrapper.get('#a').attributes('aria-invalid')).toBe('true');
    expect(wrapper.get('#a').attributes('aria-describedby')).toBe(`hint ${errorId}`);
    expect(wrapper.get('#b').attributes('aria-describedby')).toBe(errorId);
  });

  it('no marca el control cuando no hay error', () => {
    const wrapper = mountField(false);

    expect(wrapper.get('#a').attributes('aria-invalid')).toBeUndefined();
    expect(wrapper.get('#a').attributes('aria-describedby')).toBe('hint');
  });
});
