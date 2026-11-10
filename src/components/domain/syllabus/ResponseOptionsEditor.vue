<script setup lang="ts">
import { Plus, X } from '@lucide/vue';
import { nextTick, ref, watch } from 'vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RESPONSE_MAX_OPTIONS, RESPONSE_OPTION_LENGTH, nextOptionKey, type ResponseOption } from '@/lib/responseKinds';

const props = withDefaults(defineProps<{ modelValue: ResponseOption[]; label?: string; disabled?: boolean }>(), { label: 'Opciones', disabled: false });
const emit = defineEmits<{ 'update:modelValue': [value: ResponseOption[]] }>();

const clean = (rows: ResponseOption[]): ResponseOption[] => {
    const seen = new Set<string>();
    return rows.map((row) => ({ const: row.const, title: row.title.replace(/\s+/g, ' ').trim() })).filter((row) => {
        const key = row.title.toLowerCase();
        if (row.title === '' || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
const blank = (rows: ResponseOption[]): ResponseOption => ({ const: nextOptionKey(rows), title: '' });
const rows = ref<ResponseOption[]>(props.modelValue.length ? props.modelValue.map((row) => ({ ...row })) : [blank([])]);
const list = ref<HTMLElement | null>(null);
watch(() => props.modelValue, (value) => {
    if (JSON.stringify(value) !== JSON.stringify(clean(rows.value))) rows.value = value.length ? value.map((row) => ({ ...row })) : [blank([])];
}, { deep: true });
const publish = (): void => emit('update:modelValue', clean(rows.value));
const write = (index: number, title: string): void => {
    rows.value[index] = { ...rows.value[index]!, title };
    publish();
};
const add = async (): Promise<void> => {
    if (props.disabled || rows.value.length >= RESPONSE_MAX_OPTIONS) return;
    rows.value.push(blank(rows.value));
    await nextTick();
    list.value?.querySelector<HTMLInputElement>('li:last-child input')?.focus();
};
const remove = (index: number): void => {
    rows.value.splice(index, 1);
    if (rows.value.length === 0) rows.value.push(blank([]));
    publish();
};
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2" role="group" :aria-label="label">
    <ul ref="list" class="flex flex-col gap-1.5">
      <li v-for="(row, index) in rows" :key="row.const" class="flex items-center gap-1">
        <Input :model-value="row.title" :aria-label="`Opción ${index + 1}`" :placeholder="`Opción ${index + 1}`" :maxlength="RESPONSE_OPTION_LENGTH" :disabled="disabled" autocomplete="off" class="h-8" @update:model-value="write(index, String($event))" @keydown.enter.prevent="add" />
        <IconTooltip :label="`Quitar opción ${index + 1}`"><Button type="button" variant="ghost" size="icon-sm" :aria-label="`Quitar opción ${index + 1}`" :disabled="disabled" @click="remove(index)"><X aria-hidden="true" /></Button></IconTooltip>
      </li>
    </ul>
    <Button type="button" variant="outline" size="sm" class="w-fit" data-response-add-option :disabled="disabled || rows.length >= RESPONSE_MAX_OPTIONS" @click="add"><Plus data-icon="inline-start" aria-hidden="true" />Agregar opción</Button>
  </div>
</template>
