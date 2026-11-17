<script setup lang="ts">
import { ListFilter } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import TemplateConditionPicker from '@/components/domain/configuration/TemplateConditionPicker.vue';
import { Button } from '@/components/ui/button';
import { FieldError, FieldGroup } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { choiceOf, conditionSourceKey, type ConditionChoice, type ConditionSource, type ResponseCondition } from '@/lib/responseConditions';

const props = withDefaults(defineProps<{ condition?: ResponseCondition | null; sources: ConditionSource[]; allowed?: boolean; disabled?: boolean }>(), {
    condition: null,
    allowed: false,
    disabled: false,
});
const emit = defineEmits<{ apply: [source: ConditionSource | null, options: string[]] }>();

const open = ref(false);
const choice = ref<ConditionChoice>({ source: '', options: [] });
const label = 'Mostrar solo si…';
const tooltip = computed(() => props.allowed ? label : `${label}: elija un campo`);
const error = computed(() => choice.value.source && choice.value.options.length === 0 ? 'Elija al menos una opción' : '');
watch(open, (value) => { if (value) choice.value = choiceOf(props.condition, props.sources); });
const apply = (): void => {
    if (error.value) return;
    const source = props.sources.find((item) => conditionSourceKey(item) === choice.value.source) ?? null;
    emit('apply', source, source ? choice.value.options : []);
    open.value = false;
};
const remove = (): void => {
    emit('apply', null, []);
    open.value = false;
};
</script>

<template>
  <MenuTooltip :label="tooltip"><Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" :variant="condition ? 'secondary' : 'ghost'" size="icon-sm" :aria-label="label" :disabled="!allowed || disabled" data-field-condition-tool @mousedown.prevent><ListFilter aria-hidden="true" /></Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="max-h-(--overlay-max-height) w-80 overflow-y-auto">
      <form novalidate @submit.prevent="apply">
        <FieldGroup>
          <TemplateConditionPicker v-model="choice" :sources="sources" />
          <FieldError v-if="error" data-field-condition-error>{{ error }}</FieldError>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" size="sm" class="w-fit" :disabled="Boolean(error)" data-field-condition-apply>Aplicar</Button>
            <Button v-if="condition" type="button" variant="outline" size="sm" class="w-fit" data-field-condition-remove @click="remove">Quitar condición</Button>
          </div>
        </FieldGroup>
      </form>
    </PopoverContent>
  </Popover></MenuTooltip>
</template>
