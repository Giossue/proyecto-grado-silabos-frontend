<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronDown, CircleHelp, Trash2 } from '@lucide/vue';
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { updateField } from '@/api/template-structure';
import type { TemplateField } from '@/api/template';
import { apiMessage } from '@/components/domain/configuration/templateStructure';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import { cn } from '@/lib/utils';
import { FIELD_RESPONSIBLES, responsibleLabel, type FieldResponsible } from '@/types/configuration';

const props = defineProps<{
    templateId: string;
    field: TemplateField;
    variables?: TemplateVariable[];
    locked: boolean;
    selected: boolean;
    focusOnCreate?: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    busy?: boolean;
}>();
const emit = defineEmits<{ select: []; move: [direction: -1 | 1]; remove: []; failed: [message: string] }>();

const draft = reactive({
    label: props.field.label,
    help: props.field.help ?? '',
    quien_llena: props.field.quien_llena as FieldResponsible,
    content: JSON.parse(JSON.stringify(props.field.content)) as DocumentNode,
});
const status = ref<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
const editor = ref<{ editor: { commands: { focus: (position?: string) => void } } | null } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;
let dirtyAgain = false;

const persist = async (): Promise<void> => {
    if (saving) {
        dirtyAgain = true;
        return;
    }
    clearTimeout(timer);
    timer = undefined;
    status.value = 'saving';
    saving = (async () => {
        try {
            await updateField(props.templateId, props.field.id, {
                label: draft.label.trim(),
                help: draft.help.trim() === '' ? null : draft.help.trim(),
                quien_llena: draft.quien_llena,
                content: draft.content,
            });
            status.value = dirtyAgain ? 'dirty' : 'saved';
        } catch (reason) {
            status.value = 'dirty';
            emit('failed', apiMessage(reason, 'No se pudo guardar el campo.'));
        } finally {
            saving = null;
            if (dirtyAgain) {
                dirtyAgain = false;
                void persist();
            }
        }
    })();
    await saving;
};
const schedule = (delay: number): void => {
    status.value = 'dirty';
    clearTimeout(timer);
    timer = setTimeout(() => void persist(), delay);
};
watch(() => draft.content, () => schedule(800), { deep: true });
watch(() => draft.label, () => schedule(800));
watch(() => draft.help, () => schedule(800));
watch(() => draft.quien_llena, () => schedule(0));
watch(() => props.field, (next) => {
    if (status.value !== 'idle' && status.value !== 'saved') return;
    draft.label = next.label;
    draft.help = next.help ?? '';
    draft.quien_llena = next.quien_llena;
    if (JSON.stringify(next.content) !== JSON.stringify(draft.content)) draft.content = JSON.parse(JSON.stringify(next.content)) as DocumentNode;
});
onMounted(() => {
    if (props.focusOnCreate) void nextTick(() => editor.value?.editor?.commands.focus('end'));
});
onBeforeUnmount(() => {
    if (timer) void persist();
});

const name = (): string => draft.label.trim() || 'Campo sin nombre';
const statusText = (): string => status.value === 'saving' ? 'Guardando…' : status.value === 'dirty' ? 'Sin guardar' : '';
</script>

<template>
  <div :data-field-editor="field.id" class="flex min-w-0 flex-col gap-1" @focusin="emit('select')" @pointerdown="emit('select')">
    <div class="flex min-w-0 items-center gap-2">
      <Input
        v-model="draft.label"
        maxlength="180"
        placeholder="Nombre del campo (opcional)"
        :aria-label="`Nombre del campo ${name()}`"
        :disabled="locked"
        class="h-7 min-w-0 flex-1 border-transparent bg-transparent px-0 font-bold shadow-none hover:border-transparent focus-visible:border-input focus-visible:px-2"
      />
      <span class="text-xs text-muted-foreground" aria-live="polite">{{ statusText() }}</span>
    </div>
    <FreeTextEditor :id="`field-content-${field.id}`" ref="editor" v-model="draft.content" :label="`Contenido de ${name()}`" :variables="variables" :disabled="locked" :toolbar="selected && !locked" bare />
    <div :class="cn('absolute -top-7 right-0 z-10 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm focus-within:opacity-100 group-hover:opacity-100', selected ? 'opacity-100' : 'opacity-0')">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="sm" :disabled="locked" :aria-label="`Quién llena el campo ${name()}`" data-field-responsible>{{ responsibleLabel(draft.quien_llena) }}<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup :model-value="draft.quien_llena" @update:model-value="draft.quien_llena = $event as FieldResponsible">
            <DropdownMenuRadioItem v-for="item in FIELD_RESPONSIBLES" :key="item.value" :value="item.value">{{ item.label }}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
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
            <Input v-model="draft.help" maxlength="2000" :aria-label="`Texto de ayuda de ${name()}`" />
          </label>
        </PopoverContent>
      </Popover>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !canMoveUp" :aria-label="`Subir el campo ${name()}`" @click="emit('move', -1)"><ArrowUp aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !canMoveDown" :aria-label="`Bajar el campo ${name()}`" @click="emit('move', 1)"><ArrowDown aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar el campo ${name()}`" @click="emit('remove')"><Trash2 aria-hidden="true" /></Button>
    </div>
  </div>
</template>
