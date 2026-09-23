<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { CalendarDays, X } from '@lucide/vue';
import type { DateValue } from 'reka-ui';
import { createYearRange } from 'reka-ui/date';
import { computed, ref, useTemplateRef } from 'vue';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
  id: string;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  ariaInvalid?: boolean;
  disabled?: boolean;
  minValue?: string;
  placeholder?: string;
}>(), {
  name: undefined,
  defaultValue: undefined,
  required: false,
  ariaInvalid: false,
  disabled: false,
  minValue: undefined,
  placeholder: 'Elegir fecha',
});

const model = defineModel<string | undefined>({ default: undefined });
if (model.value === undefined) model.value = props.defaultValue ?? '';

const root = useTemplateRef<HTMLElement>('root');
const open = ref(false);
const formatter = new DateFormatter('es-EC', { dateStyle: 'medium' });
const parse = (value: string | undefined): DateValue | undefined => {
  if (!value) return undefined;
  try {
    return parseDate(value);
  } catch {
    return undefined;
  }
};
const minimum = computed<DateValue | undefined>(() => parse(props.minValue));
const yearRange = computed(() => createYearRange({
  start: minimum.value ?? today(getLocalTimeZone()).cycle('year', -5),
  end: today(getLocalTimeZone()).cycle('year', 10),
}));
const selected = computed<DateValue | undefined>({
  get: () => parse(model.value),
  set: (value) => {
    model.value = value?.toString() ?? '';
    open.value = false;
    root.value?.dispatchEvent(new Event('change', { bubbles: true }));
  },
});
const label = computed(() => selected.value === undefined
  ? props.placeholder
  : formatter.format(selected.value.toDate(getLocalTimeZone())));
const clear = (): void => { selected.value = undefined; };
</script>

<template>
  <div ref="root" data-slot="date-picker">
    <input type="hidden" :name="name" :value="model">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button :id="id" type="button" variant="outline" :disabled="disabled" :aria-invalid="ariaInvalid" :aria-required="required" :class="cn('w-full justify-start font-normal', selected === undefined && 'text-muted-foreground')">
          <CalendarDays data-icon="inline-start" aria-hidden="true" />{{ label }}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar v-model="selected" layout="month-and-year" :year-range="yearRange" :min-value="minimum" locale="es-EC" initial-focus class="p-3" />
        <div v-if="!required && selected !== undefined" class="border-t p-2">
          <Button type="button" variant="ghost" size="sm" class="w-full justify-center" @click="clear"><X data-icon="inline-start" aria-hidden="true" />Quitar fecha</Button>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>
