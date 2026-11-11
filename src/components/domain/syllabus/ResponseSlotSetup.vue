<script setup lang="ts">
import { CircleDot, Hash, ListChecks, Type } from '@lucide/vue';
import { computed, ref, type Component } from 'vue';
import ResponseOptionsEditor from '@/components/domain/syllabus/ResponseOptionsEditor.vue';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FREE_TEXT_KIND, FREE_TEXT_LABEL, RESPONSE_KINDS, responseHasOptions, responseKindOptions, type ResponseOption } from '@/lib/responseKinds';

const props = withDefaults(defineProps<{ kind: string; options?: ResponseOption[]; label: string; disabled?: boolean }>(), { options: () => [], disabled: false });
const emit = defineEmits<{ kind: [kind: string]; options: [options: ResponseOption[]] }>();

const ICONS: Record<string, Component> = { [FREE_TEXT_KIND]: Type, numero: Hash, una: CircleDot, varias: ListChecks };
const kinds = [{ kind: FREE_TEXT_KIND, label: FREE_TEXT_LABEL }, ...responseKindOptions];
const open = ref(false);
const free = computed(() => props.kind === FREE_TEXT_KIND);
const name = computed(() => free.value ? FREE_TEXT_LABEL : RESPONSE_KINDS[props.kind]?.label ?? FREE_TEXT_LABEL);
const summary = computed(() => {
  if (!responseHasOptions(props.kind)) return name.value;
  const count = props.options.length;
  return `${name.value} · ${count === 0 ? 'sin opciones' : count === 1 ? '1 opción' : `${count} opciones`}`;
});
</script>

<template>
  <Popover v-model:open="open">
    <!-- Un solo disparador que cambia de aspecto: así el menú sigue abierto al elegir el tipo y se escriben las opciones ahí mismo -->
    <PopoverTrigger
      type="button"
      data-response-slot
      :aria-label="`${label}: ${name}`"
      :disabled="disabled"
      :class="free
        ? 'flex min-h-9 w-full items-center rounded-md border border-dashed border-border px-3 text-left text-sm text-muted-foreground/70 transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none'
        : buttonVariants({ variant: 'outline', size: 'sm', class: 'w-fit' })"
    >
      <template v-if="free">Lo escribe el docente</template>
      <template v-else><component :is="ICONS[kind] ?? Type" data-icon="inline-start" aria-hidden="true" />{{ summary }}</template>
    </PopoverTrigger>
    <PopoverContent align="start" class="flex w-80 flex-col gap-3">
      <p class="text-sm font-medium">¿Cómo responde el docente?</p>
      <div role="radiogroup" :aria-label="`Tipo de respuesta de ${label}`" class="grid grid-cols-2 gap-1.5">
        <Button
          v-for="item in kinds"
          :key="item.kind"
          type="button"
          role="radio"
          size="sm"
          :variant="item.kind === kind ? 'secondary' : 'ghost'"
          :aria-checked="item.kind === kind"
          class="justify-start"
          @click="emit('kind', item.kind)"
        >
          <component :is="ICONS[item.kind] ?? Type" data-icon="inline-start" aria-hidden="true" />{{ item.label }}
        </Button>
      </div>
      <ResponseOptionsEditor v-if="responseHasOptions(kind)" :model-value="options" :label="`Opciones de ${label}`" @update:model-value="emit('options', $event)" />
    </PopoverContent>
  </Popover>
</template>
