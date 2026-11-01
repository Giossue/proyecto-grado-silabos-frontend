<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronDown, RectangleHorizontal, RectangleVertical, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import type { TemplateField, TemplatePreset, TemplateSectionPayload } from '@/api/template';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FIELD_RESPONSIBLES, responsibleLabel, type FieldResponsible } from '@/types/configuration';

export type TemplateSelection =
    | { kind: 'field'; field: TemplateField; canMoveUp: boolean; canMoveDown: boolean }
    | { kind: 'section'; section: TemplateSectionPayload; canMoveUp: boolean; canMoveDown: boolean };

const props = defineProps<{ selection: TemplateSelection | null; presets?: TemplatePreset[]; locked: boolean; busy: boolean }>();
const emit = defineEmits<{ responsible: [value: FieldResponsible]; preset: [preset: TemplatePreset]; name: []; move: [direction: -1 | 1]; remove: []; orientation: [] }>();

const fieldName = computed(() => props.selection?.kind === 'field' ? props.selection.field.label.trim() || 'Campo sin nombre' : '');
</script>

<template>
  <div class="flex min-w-44 flex-1 items-center gap-0.5 overflow-hidden" role="group" :aria-label="selection?.kind === 'section' ? 'Sección seleccionada' : 'Campo seleccionado'">
    <template v-if="selection?.kind === 'field'">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="sm" :disabled="locked" :aria-label="`Quién llena el campo ${fieldName}`" data-field-responsible>{{ responsibleLabel(selection.field.quien_llena) }}<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Quién llena</DropdownMenuLabel>
          <DropdownMenuRadioGroup :model-value="selection.field.quien_llena" @update:model-value="emit('responsible', $event as FieldResponsible)">
            <DropdownMenuRadioItem v-for="item in FIELD_RESPONSIBLES" :key="item.value" :value="item.value">{{ item.label }}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <template v-if="presets?.length">
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Plantilla</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem v-for="preset in presets" :key="preset.key" @select="emit('preset', preset)">{{ preset.label }}</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </template>
          <template v-if="!selection.field.label.trim()">
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="emit('name')">Ponerle nombre</DropdownMenuItem>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !selection.canMoveUp" :aria-label="`Subir el campo ${fieldName}`" @click="emit('move', -1)"><ArrowUp aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !selection.canMoveDown" :aria-label="`Bajar el campo ${fieldName}`" @click="emit('move', 1)"><ArrowDown aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar el campo ${fieldName}`" @click="emit('remove')"><Trash2 aria-hidden="true" /></Button>
    </template>
    <template v-else-if="selection?.kind === 'section'">
      <Button type="button" variant="ghost" size="sm" :disabled="locked || busy" :aria-label="`Orientación de la sección ${selection.section.title}`" :aria-pressed="selection.section.orientation === 'landscape'" @click="emit('orientation')"><RectangleHorizontal v-if="selection.section.orientation === 'landscape'" data-icon="inline-start" aria-hidden="true" /><RectangleVertical v-else data-icon="inline-start" aria-hidden="true" />{{ selection.section.orientation === 'landscape' ? 'Horizontal' : 'Vertical' }}</Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !selection.canMoveUp" :aria-label="`Subir la sección ${selection.section.title}`" @click="emit('move', -1)"><ArrowUp aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || !selection.canMoveDown" :aria-label="`Bajar la sección ${selection.section.title}`" @click="emit('move', 1)"><ArrowDown aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar la sección ${selection.section.title}`" @click="emit('remove')"><Trash2 aria-hidden="true" /></Button>
    </template>
    <span v-else class="whitespace-nowrap px-2 text-sm text-muted-foreground">Seleccione un campo</span>
  </div>
</template>
