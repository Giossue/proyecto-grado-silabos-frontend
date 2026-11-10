<script setup lang="ts">
import { Check, ListChecks, X } from '@lucide/vue';
import { computed, ref, useId } from 'vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { guardNumber, numberText } from '@/lib/blocks/types';
import { RESPONSE_KINDS, responseMany, responseSchema, type ResponseAttrs } from '@/lib/responseKinds';

const props = withDefaults(defineProps<{ attrs: ResponseAttrs; label: string; disabled?: boolean; askFor?: string }>(), { disabled: false, askFor: 'al coordinador' });
const emit = defineEmits<{ 'update:value': [value: unknown] }>();

const open = ref(false);
const listId = useId();
const schema = computed(() => responseSchema(props.attrs.kind, props.attrs.options));
const number = computed(() => schema.value?.type === 'number' ? schema.value : null);
const many = computed(() => responseMany(props.attrs.kind));
const isKey = (value: unknown): value is string => typeof value === 'string' && value !== '';
const chosen = computed<string[]>(() => Array.isArray(props.attrs.value) ? props.attrs.value.filter(isKey) : isKey(props.attrs.value) ? [props.attrs.value] : []);
const title = (key: string): string => props.attrs.options.find((option) => option.const === key)?.title ?? key;
const choose = (value: unknown): void => {
    if (props.disabled) return;
    if (many.value) {
        const picked = Array.isArray(value) ? value.filter(isKey) : [];
        emit('update:value', [...chosen.value.filter((key) => picked.includes(key)), ...picked.filter((key) => !chosen.value.includes(key))]);
        return;
    }
    emit('update:value', isKey(value) ? value : null);
    open.value = false;
};
const remove = (key: string): void => {
    if (!props.disabled) emit('update:value', many.value ? chosen.value.filter((item) => item !== key) : null);
};
</script>

<template>
  <Input
    v-if="number"
    class="w-36"
    inputmode="decimal"
    autocomplete="off"
    placeholder="Número"
    :aria-label="label"
    :model-value="typeof attrs.value === 'string' || typeof attrs.value === 'number' ? String(attrs.value) : ''"
    :disabled="disabled"
    @beforeinput="guardNumber($event as InputEvent, number)"
    @update:model-value="emit('update:value', numberText(String($event), number!))"
  />
  <div v-else class="flex min-w-0 flex-col gap-1.5" role="group" :aria-label="label">
    <ul v-if="chosen.length" class="flex flex-wrap gap-1.5" :aria-label="`Elegido en ${label}`">
      <li v-for="key in chosen" :key="key">
        <Badge variant="secondary" class="gap-1 py-0.5 pr-0.5 text-sm font-normal" data-response-chosen>
          {{ title(key) }}
          <IconTooltip :label="`Quitar «${title(key)}»`"><Button type="button" variant="ghost" size="icon-sm" class="size-5" :aria-label="`Quitar «${title(key)}»`" :disabled="disabled" @click="remove(key)"><X aria-hidden="true" /></Button></IconTooltip>
        </Badge>
      </li>
    </ul>
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button type="button" variant="outline" size="sm" class="w-fit" :aria-label="`Elegir en ${label}`" :aria-controls="listId" :aria-expanded="open" :disabled="disabled || attrs.options.length === 0"><ListChecks data-icon="inline-start" aria-hidden="true" />{{ chosen.length ? 'Cambiar' : RESPONSE_KINDS[attrs.kind]?.label ?? 'Elegir' }}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" class="w-72 p-0">
        <Command :multiple="many" :model-value="many ? chosen : chosen[0]" @update:model-value="choose">
          <CommandList :id="listId" :aria-label="`Opciones de ${label}`">
            <CommandGroup>
              <CommandItem v-for="option in attrs.options" :key="option.const" :value="option.const">
                <span class="flex-1">{{ option.title }}</span>
                <Check v-if="chosen.includes(option.const)" class="ml-auto" aria-hidden="true" />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <p v-if="attrs.options.length === 0" class="text-sm text-muted-foreground">No hay opciones para elegir: pídalas {{ askFor }}</p>
  </div>
</template>
