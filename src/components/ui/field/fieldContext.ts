import type { ComputedRef, InjectionKey } from 'vue';
import { computed, inject, useAttrs } from 'vue';

export type FieldContext = { errorId: string; invalid: ComputedRef<boolean> };

export const fieldContextKey: InjectionKey<FieldContext> = Symbol('field');

export function useFieldControl(): ComputedRef<{ 'aria-invalid'?: boolean; 'aria-describedby'?: string }> {
  const field = inject(fieldContextKey, null);
  const attrs = useAttrs();

  return computed(() => {
    if (!field?.invalid.value) return {};
    const own = attrs['aria-describedby'];
    return {
      'aria-invalid': true,
      'aria-describedby': [typeof own === 'string' ? own : '', field.errorId].filter(Boolean).join(' '),
    };
  });
}
