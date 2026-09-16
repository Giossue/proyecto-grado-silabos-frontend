<script setup lang="ts">
import { FilterX } from '@lucide/vue';
import { onBeforeUnmount, ref } from 'vue';
import MobileFilterSheet from '@/components/domain/MobileFilterSheet.vue';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';

const props = withDefaults(defineProps<{ delay?: number }>(), { delay: 400 });
const emit = defineEmits<{ clear: [] }>();
let timer: ReturnType<typeof setTimeout> | null = null;
const active = ref(false);

const cancel = (): void => {
  if (timer !== null) clearTimeout(timer);
  timer = null;
};

const formFor = (target: EventTarget | null): HTMLFormElement | null =>
  (target as HTMLElement | null)?.closest('form') ?? null;

const recount = (target: EventTarget | null): void => {
  const form = formFor(target);
  if (!form) return;
  active.value = Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'))
    .some((field) => !['', 'all'].includes(field.value));
};

const submit = (target: EventTarget | null): void => {
  cancel();
  formFor(target)?.requestSubmit();
};

const onInput = (event: Event): void => {
  recount(event.target);
  cancel();
  const target = event.target;
  timer = setTimeout(() => submit(target), props.delay);
};

const onChange = (event: Event): void => {
  const target = event.target as HTMLElement | null;
  recount(target);
  if (target instanceof HTMLInputElement && !['checkbox', 'radio'].includes(target.type)) return;
  submit(target);
};

const clear = (): void => {
  cancel();
  active.value = false;
  emit('clear');
};

onBeforeUnmount(cancel);
</script>

<template>
  <FieldGroup class="gap-3 lg:flex-row lg:flex-wrap lg:items-end" @input="onInput" @change="onChange">
    <div class="min-w-0 lg:min-w-64 lg:flex-1"><slot name="search" /></div>
    <MobileFilterSheet class="grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-none lg:items-end [&_[data-slot=field]]:min-w-0 lg:[&_[data-slot=field]]:w-48 lg:[&_[data-slot=field]]:shrink-0 [&_[data-slot=select-trigger]]:w-full">
      <slot name="filters" />
      <Button v-if="active" type="button" variant="ghost" class="max-sm:w-full" @click="clear"><FilterX />Quitar filtros</Button>
    </MobileFilterSheet>
    <button type="submit" class="sr-only" tabindex="-1">Buscar</button>
  </FieldGroup>
</template>
