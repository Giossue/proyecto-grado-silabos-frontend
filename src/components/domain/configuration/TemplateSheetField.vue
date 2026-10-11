<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronDown, CircleHelp, Trash2 } from '@lucide/vue';
import { computed, nextTick, onMounted, ref } from 'vue';
import type { TemplateField, TemplatePreset } from '@/api/template';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentNode } from '@/lib/templateDocument';
import { cn } from '@/lib/utils';
import { FIELD_RESPONSIBLES, responsibleLabel, type FieldResponsible } from '@/types/configuration';

const props = defineProps<{
    presets?: TemplatePreset[];
    block?: boolean;
    locked: boolean;
    selected: boolean;
    focusOnCreate?: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    busy?: boolean;
}>();
const field = defineModel<TemplateField>('field', { required: true });
const emit = defineEmits<{ select: []; move: [direction: -1 | 1]; remove: [] }>();

const patch = (changes: Partial<TemplateField>): void => { field.value = { ...field.value, ...changes }; };
const label = computed({ get: () => field.value.label, set: (value: string) => patch({ label: value }) });
const help = computed({ get: () => field.value.help ?? '', set: (value: string) => patch({ help: value === '' ? null : value }) });
const content = computed({ get: () => field.value.content, set: (value: DocumentNode) => patch({ content: value }) });
const editor = ref<{ editor: { commands: { focus: (position?: string) => void } } | null } | null>(null);

onMounted(() => {
    if (props.focusOnCreate) void nextTick(() => editor.value?.editor?.commands.focus('end'));
});

const applyPreset = (preset: TemplatePreset): void => {
    patch({ key: preset.field_key, label: preset.label, quien_llena: preset.quien_llena, content: JSON.parse(JSON.stringify(preset.content)) as DocumentNode });
};
const name = (): string => field.value.label.trim() || 'Campo sin nombre';
</script>

<template>
  <div :data-field-editor="field.id" class="flex min-w-0 flex-col gap-1" @focusin="emit('select')" @pointerdown="emit('select')">
    <div data-field-label class="flex min-w-0 items-center gap-2">
      <Input
        v-model="label"
        maxlength="180"
        placeholder="Nombre del campo (opcional)"
        :aria-label="`Nombre del campo ${name()}`"
        :disabled="locked || block"
        class="h-7 min-w-0 flex-1 border-transparent bg-transparent px-0 font-bold shadow-none hover:border-transparent focus-visible:border-input focus-visible:px-2"
      />
    </div>
    <div data-field-body><FreeTextEditor :id="`field-content-${field.id}`" ref="editor" v-model="content" :label="`Contenido de ${name()}`" :blocks="field.quien_llena === 'institucional' ? 'fill' : 'configure'" :disabled="locked || block" :toolbar="selected && !locked && !block" bare /></div>
    <div :class="cn('absolute -top-7 right-0 z-10 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm focus-within:opacity-100 group-hover:opacity-100', selected ? 'opacity-100' : 'opacity-0')">
      <DropdownMenu v-if="!block">
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="sm" :disabled="locked" :aria-label="`Quién llena el campo ${name()}`" data-field-responsible>{{ responsibleLabel(field.quien_llena) }}<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup :model-value="field.quien_llena" @update:model-value="patch({ quien_llena: $event as FieldResponsible })">
            <DropdownMenuRadioItem v-for="item in FIELD_RESPONSIBLES" :key="item.value" :value="item.value">{{ item.label }}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <template v-if="presets?.length">
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Plantilla</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem v-for="preset in presets" :key="preset.key" @select="applyPreset(preset)">{{ preset.label }}</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover v-if="!block">
        <Tooltip>
          <TooltipTrigger as-child>
            <PopoverTrigger as-child>
              <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Ayuda del campo ${name()}`"><CircleHelp aria-hidden="true" /></Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Ayuda para quien lo llena</TooltipContent>
        </Tooltip>
        <PopoverContent class="w-80">
          <label class="flex flex-col gap-2 text-sm">
            <span class="font-medium">Ayuda para quien lo llena (opcional)</span>
            <Input v-model="help" maxlength="2000" :aria-label="`Texto de ayuda de ${name()}`" />
          </label>
        </PopoverContent>
      </Popover>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !canMoveUp" :aria-label="`Subir el campo ${name()}`" @click="emit('move', -1)"><ArrowUp aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !canMoveDown" :aria-label="`Bajar el campo ${name()}`" @click="emit('move', 1)"><ArrowDown aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar el campo ${name()}`" @click="emit('remove')"><Trash2 aria-hidden="true" /></Button>
    </div>
  </div>
</template>
