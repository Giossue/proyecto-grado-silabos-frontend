<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue';
import { computed, ref, useId } from 'vue';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const props = defineProps<{
  teachers: Array<{ id: string; name: string }>;
  label: string;
  allowNone?: boolean;
}>();
const model = defineModel<string>({ required: true });
const open = ref(false);
const listId = useId();
const selectedName = computed(() => model.value === 'none'
  ? 'Sin docente'
  : (props.teachers.find((teacher) => teacher.id === model.value)?.name ?? 'Elija el docente'));
const select = (value: string): void => {
  model.value = value;
  open.value = false;
};
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" role="combobox" :aria-label="label" :aria-expanded="open" :aria-controls="listId" class="min-w-40 max-w-60 justify-between">
        <span class="truncate">{{ selectedName }}</span>
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80 min-w-(--reka-popover-trigger-width) p-0">
      <Command :model-value="model">
        <CommandInput placeholder="Buscar por nombre" aria-label="Buscar docente por nombre" />
        <CommandList :id="listId" :aria-label="label">
          <CommandEmpty role="status">No se encontraron docentes.</CommandEmpty>
          <CommandGroup>
            <CommandItem v-if="allowNone" value="none" @select="select('none')">
              Sin docente
              <Check v-if="model === 'none'" class="ml-auto" aria-hidden="true" />
            </CommandItem>
            <CommandItem v-for="teacher in teachers" :key="teacher.id" :value="teacher.id" @select="select(teacher.id)">
              {{ teacher.name }}
              <Check v-if="model === teacher.id" class="ml-auto" aria-hidden="true" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
