<script setup lang="ts">
import { TextCursorInput } from '@lucide/vue';
import { computed, ref, useId, watch } from 'vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FIELD_LIMIT_MAX, FIELD_LIMIT_MIN, formatCharacters } from '@/lib/fieldLimits';

const props = withDefaults(defineProps<{ limit?: number | null; selected?: boolean; editable?: boolean; disabled?: boolean }>(), {
    limit: null,
    selected: false,
    editable: false,
    disabled: false,
});
const emit = defineEmits<{ apply: [limit: number | null] }>();

const id = useId();
const open = ref(false);
const draft = ref('');
const tried = ref(false);
const label = 'Límite de caracteres';
const tooltip = computed(() => !props.selected ? `${label}: elija un campo` : props.editable ? label : `${label}: solo en campos editables`);
const value = computed((): number | null => /^\d+$/.test(draft.value.trim()) ? Number(draft.value.trim()) : null);
const error = computed(() => value.value === null || value.value < FIELD_LIMIT_MIN || value.value > FIELD_LIMIT_MAX
    ? `Escriba un número entre ${FIELD_LIMIT_MIN} y ${formatCharacters(FIELD_LIMIT_MAX)}`
    : '');
watch(open, (now) => {
    if (!now) return;
    draft.value = props.limit ? String(props.limit) : '';
    tried.value = false;
});
const apply = (): void => {
    tried.value = true;
    if (error.value) return;
    emit('apply', value.value);
    open.value = false;
};
const remove = (): void => {
    emit('apply', null);
    open.value = false;
};
</script>

<template>
  <MenuTooltip :label="tooltip"><Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" :variant="limit ? 'secondary' : 'ghost'" size="icon-sm" :aria-label="label" :disabled="!selected || !editable || disabled" data-field-limit-tool @mousedown.prevent><TextCursorInput aria-hidden="true" /></Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-72">
      <form novalidate @submit.prevent="apply">
        <FieldGroup>
          <Field :data-invalid="tried && Boolean(error)">
            <FieldLabel :for="`${id}-limit`">{{ label }}</FieldLabel>
            <Input :id="`${id}-limit`" v-model="draft" inputmode="numeric" autocomplete="off" placeholder="500" data-field-limit-input />
            <FieldDescription>Cuenta lo que escribe el docente en el campo: su texto y sus respuestas de texto.</FieldDescription>
            <FieldError v-if="tried && error" data-field-limit-error>{{ error }}</FieldError>
          </Field>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" size="sm" class="w-fit" data-field-limit-apply>Aplicar</Button>
            <Button v-if="limit" type="button" variant="outline" size="sm" class="w-fit" data-field-limit-remove @click="remove">Quitar límite</Button>
          </div>
        </FieldGroup>
      </form>
    </PopoverContent>
  </Popover></MenuTooltip>
</template>
