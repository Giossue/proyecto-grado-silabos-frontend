<script setup lang="ts">
import { Check, ListChecks, X } from '@lucide/vue';
import { computed, ref, useId } from 'vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { characters, fitCharacters } from '@/lib/fieldLimits';
import { RESPONSE_KINDS, responseMany, responseRequired, responseSchema, responseSetting, type ResponseAttrs } from '@/lib/responseKinds';

const props = withDefaults(defineProps<{ attrs: ResponseAttrs; label: string; disabled?: boolean; askFor?: string; budget?: number | null }>(), { disabled: false, askFor: 'al coordinador', budget: null });
const emit = defineEmits<{ 'update:value': [value: unknown] }>();

const open = ref(false);
const listId = useId();
const schema = computed(() => responseSchema(props.attrs.kind, props.attrs.options, props.attrs));
const dropdown = computed(() => !responseMany(props.attrs.kind) && responseSetting(props.attrs, 'display') === 'desplegable');
const optional = computed(() => !responseRequired(props.attrs));
const limits = computed((): string => {
    if (!responseMany(props.attrs.kind)) return '';
    const min = props.attrs.minChoices;
    const max = props.attrs.maxChoices;
    const plural = (count: number): string => count === 1 ? '1 opción' : `${count} opciones`;
    if (min && max) return min === max ? `Elija ${plural(min)}` : `Elija de ${min} a ${max} opciones`;
    if (min) return `Elija al menos ${plural(min)}`;
    if (max) return `Elija como máximo ${plural(max)}`;
    return '';
});
const text = computed(() => schema.value?.type === 'string' && !('oneOf' in schema.value && schema.value.oneOf) ? schema.value : null);
const many = computed(() => responseMany(props.attrs.kind));
const written = computed((): string => typeof props.attrs.value === 'string' ? props.attrs.value : '');
const maxLength = computed((): number | undefined => {
    const own = text.value?.maxLength;
    if (props.budget === null) return own;
    const allowed = written.value.length + Math.max(0, props.budget);
    return own === undefined ? allowed : Math.min(own, allowed);
});
const write = (value: string): void => {
    if (props.budget === null) {
        emit('update:value', value);
        return;
    }
    const own = characters(written.value);
    emit('update:value', fitCharacters(value, Math.max(own, own + props.budget)));
};
const isKey = (value: unknown): value is string => typeof value === 'string' && value !== '';
const chosen = computed<string[]>(() => Array.isArray(props.attrs.value) ? props.attrs.value.filter(isKey) : isKey(props.attrs.value) ? [props.attrs.value] : []);
const title = (key: string): string => props.attrs.options.find((option) => option.const === key)?.title ?? key;
const choose = (value: unknown): void => {
    if (props.disabled) return;
    if (many.value) {
        const picked = Array.isArray(value) ? value.filter(isKey) : [];
        const next = [...chosen.value.filter((key) => picked.includes(key)), ...picked.filter((key) => !chosen.value.includes(key))];
        if (props.attrs.maxChoices && next.length > props.attrs.maxChoices && next.length > chosen.value.length) return;
        emit('update:value', next);
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
  <div :class="['flex min-w-0 flex-col gap-1', text ? 'w-full' : '']">
  <Textarea
    v-if="text"
    class="min-h-9 w-full"
    :placeholder="optional ? 'Escriba aquí (opcional)' : 'Escriba aquí'"
    :aria-label="label"
    :maxlength="maxLength"
    :model-value="written"
    :disabled="disabled"
    @update:model-value="write(String($event))"
  />
  <div v-else-if="dropdown" class="flex min-w-0 items-center gap-1" data-response-dropdown>
    <Select :model-value="chosen[0] ?? ''" :disabled="disabled || attrs.options.length === 0" @update:model-value="choose($event)">
      <SelectTrigger class="w-fit min-w-40" :aria-label="`Elegir en ${label}`"><SelectValue :placeholder="optional ? 'Elegir (opcional)' : 'Elegir'" /></SelectTrigger>
      <SelectContent><SelectGroup><SelectItem v-for="option in attrs.options" :key="option.const" :value="option.const">{{ option.title }}</SelectItem></SelectGroup></SelectContent>
    </Select>
    <IconTooltip v-if="chosen.length" label="Quitar la respuesta"><Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar la respuesta" :disabled="disabled" @click="remove(chosen[0]!)"><X aria-hidden="true" /></Button></IconTooltip>
  </div>
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
  <p v-if="attrs.help || limits || (optional && !text)" class="text-sm text-muted-foreground" data-response-help>{{ [attrs.help, limits, optional && !text ? 'Opcional' : ''].filter(Boolean).join(' · ') }}</p>
  </div>
</template>
