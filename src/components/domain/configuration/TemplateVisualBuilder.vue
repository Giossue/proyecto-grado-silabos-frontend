<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { ImageUp, ListTree, Pencil, Plus, Ruler, Save, Settings2, Trash2 } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { TemplateField, TemplatePayload, TemplatePreset, TemplateSectionPayload } from '@/api/template';
import { importTemplateJson, uploadTemplateLogo } from '@/api/template';
import { paginateSheet } from '@/components/domain/configuration/templatePagination';
import TemplateJsonDialog from '@/components/domain/configuration/TemplateJsonDialog.vue';
import TemplateInsertPoint from '@/components/domain/configuration/TemplateInsertPoint.vue';
import TemplateFieldContent from '@/components/domain/configuration/TemplateFieldContent.vue';
import TemplateFormatTools from '@/components/domain/configuration/TemplateFormatTools.vue';
import TemplateInlineText from '@/components/domain/configuration/TemplateInlineText.vue';
import TemplateSelectionTools, { type TemplateSelection } from '@/components/domain/configuration/TemplateSelectionTools.vue';
import TemplateSheetField from '@/components/domain/configuration/TemplateSheetField.vue';
import { apiMessage, uniqueKey } from '@/components/domain/configuration/templateStructure';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { layoutOf, layoutStyle, paperOf, sheetPixels, type DocumentLayout } from '@/lib/documentLayout';
import { templateRuntime } from '@/lib/blocks/runtime';
import { plural, type ValueSchema } from '@/lib/blocks/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCountdown } from '@/composables/useCountdown';
import { toast } from '@/lib/toast';
import { templateEditorState } from '@/state/templateEditor';
import { cn } from '@/lib/utils';
import { emptyDocument } from '@/types/configuration';


const props = defineProps<{ template: NonNullable<TemplatePayload['template']>; processLock?: string | null; logos?: TemplatePayload['logos']; variables?: TemplatePayload['variables']; presets?: TemplatePayload['presets'] }>();
const emit = defineEmits<{ changed: []; dirty: [value: boolean]; editing: [value: boolean] }>();

const locked = computed(() => Boolean(props.processLock));
const preview = ref(true);
const leaveOpen = ref(false);
watch(preview, (value) => {
    templateEditorState.setOpen(!value);
    emit('editing', !value);
}, { immediate: true });
const editWarningOpen = ref(false);
const editCountdown = useCountdown(editWarningOpen);
const selectedField = ref<string | null>(null);
const selectedSection = ref<string | null>(null);
const activeEditor = shallowRef<Editor | null>(null);
const naming = ref<string | null>(null);
const selectField = (id: string, editor: Editor | null): void => { selectedField.value = id; selectedSection.value = null; activeEditor.value = editor; };
const focusId = ref<string | null>(null);
const selectSection = (id: string): void => { selectedSection.value = id; selectedField.value = null; activeEditor.value = null; };
const root = ref<HTMLElement | null>(null);
const available = ref(0);
let resizeObserver: ResizeObserver | null = null;

const documentStyle = computed(() => templateRuntime().definition?.document ?? null);
const scaleFor = (landscape: boolean): number => {
    const pixels = sheetPixels(documentStyle.value);
    const width = landscape ? pixels.landscape : pixels.portrait;

    return available.value > 0 ? Math.min(1, available.value / width) : 1;
};
const sheetElements = new Map<number, HTMLElement>();
const contentObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => paginateSoon()) : null;
const setSheet = (index: number, element: unknown): void => {
    if (element instanceof HTMLElement) {
        sheetElements.set(index, element);
        const content = element.querySelector(':scope > [data-sheet-content]');
        if (content) contentObserver?.observe(content);
    } else sheetElements.delete(index);
};
let paginationFrame = 0;
let paginationTimer: ReturnType<typeof setTimeout> | undefined;
const paginateSoon = (): void => {
    clearTimeout(paginationTimer);
    paginationTimer = setTimeout(() => paginate(), 250);
};
const paginate = (): void => {
    cancelAnimationFrame(paginationFrame);
    paginationFrame = requestAnimationFrame(() => {
        sheetElements.forEach((element, index) => paginateSheet(element, sheets.value[index]?.landscape ?? false, documentStyle.value));
    });
};
const clearSelectionOutside = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-field], [data-section-heading], [data-insert-point], [data-template-ribbon], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot="popover-content"]')) return;
    selectedField.value = null;
    selectedSection.value = null;
    activeEditor.value = null;
};
onMounted(() => {
    document.addEventListener('pointerdown', clearSelectionOutside);
    document.addEventListener('keydown', saveWithKeyboard);
    if (root.value && typeof ResizeObserver !== 'undefined') {
        available.value = root.value.clientWidth;
        resizeObserver = new ResizeObserver(() => { available.value = root.value?.clientWidth ?? 0; });
        resizeObserver.observe(root.value);
    }
    void nextTick(paginate);
    void document.fonts?.ready.then(paginate);
});
onBeforeUnmount(() => {
    templateEditorState.setOpen(false);
    document.removeEventListener('pointerdown', clearSelectionOutside);
    document.removeEventListener('keydown', saveWithKeyboard);
    resizeObserver?.disconnect();
    contentObserver?.disconnect();
    cancelAnimationFrame(paginationFrame);
    clearTimeout(paginationTimer);
});
const busy = ref(false);
const error = ref<string | null>(null);
const draft = ref<TemplateSectionPayload[]>([]);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let temporary = 0;
const temporaryId = (): string => `nuevo-${temporary += 1}`;

const awaitingReload = ref(false);
const jsonOpen = ref(false);
const reloadAfterJson = (): void => {
    toast.success('Plantilla actualizada desde el JSON');
    emit('changed');
};
const source = computed<TemplateSectionPayload[]>(() => preview.value && !awaitingReload.value ? props.template.sections : draft.value);
const dirty = ref(false);
const titleDraft = ref('');
const layoutDraft = ref<DocumentLayout>(layoutOf(props.template.layout));
const shownLayout = computed(() => preview.value && !awaitingReload.value ? layoutOf(props.template.layout) : layoutDraft.value);
const layoutControls = computed(() => {
    const options = props.template.layoutOptions;
    if (!options) return [];
    return [
        { key: 'margin_cm', label: 'Márgenes', options: options.margins },
        { key: 'title_font_size', label: 'Tamaño del título', options: options.title_sizes },
        { key: 'section_font_size', label: 'Tamaño de las secciones', options: options.section_sizes },
        { key: 'body_font_size', label: 'Tamaño del contenido', options: options.body_sizes },
    ] as const;
});
const setLayout = (key: keyof DocumentLayout, value: unknown): void => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    layoutDraft.value = { ...layoutDraft.value, [key]: number };
    touched();
};
type ListLimits = { block: string; path: string; label: string; min: number; max: number; initial: number };
const LIMITS = [{ key: 'min', label: 'Mínimo' }, { key: 'max', label: 'Máximo' }, { key: 'initial', label: 'Al empezar' }] as const;
const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const templateLists = (): ListLimits[] => {
    const found: ListLimits[] = [];
    const walk = (block: string, schema: ValueSchema, path: string[], parent: string | null): void => {
        if (schema.type === 'array') {
            const name = plural(schema.title ?? path[path.length - 1] ?? 'elemento');
            found.push({ block, path: path.join('.'), label: capitalize(parent ? `${name} por ${parent}` : name), min: schema.minItems, max: schema.maxItems, initial: schema.initial });
            walk(block, schema.items, [...path, '*'], schema.title ?? null);
        } else if (schema.type === 'object') {
            for (const [key, child] of Object.entries(schema.properties)) walk(block, child, [...path, key], parent);
        }
    };
    for (const [kind, block] of Object.entries(templateRuntime().definition?.blocks ?? {})) {
        for (const [key, schema] of Object.entries(block.value)) walk(kind, schema, [key], null);
    }
    return found;
};
const listsDraft = ref<ListLimits[]>(templateLists());
const setListLimit = (list: ListLimits, key: (typeof LIMITS)[number]['key'], value: string | number): void => {
    list[key] = Math.max(0, Math.min(100, Math.trunc(Number(value) || 0)));
    touched();
};
const changedLists = (): Array<Omit<ListLimits, 'label'>> => {
    const current = templateLists();
    return listsDraft.value
        .filter((list) => !current.some((saved) => saved.block === list.block && saved.path === list.path && saved.min === list.min && saved.max === list.max && saved.initial === list.initial))
        .map(({ block, path, min, max, initial }) => ({ block, path, min, max, initial }));
};
const logoOverride = ref<string | null>(null);
const uploadingLogo = ref(false);
const shownTitle = computed(() => preview.value && !awaitingReload.value ? props.template.titleBlock.text : titleDraft.value);
const setDocumentTitle = (value: string): void => {
    titleDraft.value = value;
    touched();
};
const changeLogo = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || uploadingLogo.value) return;
    uploadingLogo.value = true;
    error.value = null;
    try {
        logoOverride.value = (await uploadTemplateLogo(props.template.id, file)).logo;
        toast.success('Logo actualizado');
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo cambiar el logo');
    } finally {
        uploadingLogo.value = false;
    }
};
const changed = computed(() => !preview.value && dirty.value);
const saveWithKeyboard = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's' || preview.value) return;
    event.preventDefault();
    if (changed.value) void save();
};
const touched = (): void => {
    dirty.value = true;
    paginateSoon();
};
const startEditing = (): void => {
    editWarningOpen.value = false;
    if (!awaitingReload.value) {
        draft.value = clone(props.template.sections);
        titleDraft.value = props.template.titleBlock.text;
        layoutDraft.value = layoutOf(props.template.layout);
        listsDraft.value = templateLists();
        dirty.value = false;
    }
    error.value = null;
    preview.value = false;
};
const cancelEditing = (): void => {
    preview.value = true;
    draft.value = [];
    error.value = null;
    selectedField.value = null;
    selectedSection.value = null;
    activeEditor.value = null;
};
const leave = (): void => {
    if (changed.value) leaveOpen.value = true;
    else cancelEditing();
};
const discardAndLeave = (): void => {
    leaveOpen.value = false;
    cancelEditing();
};
defineExpose({ leave });
const save = async (): Promise<void> => {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        await importTemplateJson(props.template.id, {
            version: 1,
            title: titleDraft.value.trim() || props.template.titleBlock.text,
            layout: layoutDraft.value,
            lists: changedLists(),
            sections: draft.value.map((section) => ({
                key: section.key,
                title: section.title.trim(),
                orientation: section.orientation,
                fields: section.fields.map((field) => ({ key: field.key, label: field.label.trim(), quien_llena: field.quien_llena, content: field.content })),
            })),
        });
        toast.success('Plantilla guardada');
        awaitingReload.value = true;
        preview.value = true;
        selectedField.value = null;
        selectedSection.value = null;
        activeEditor.value = null;
        emit('changed');
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar la plantilla');
    } finally {
        busy.value = false;
    }
};

const isLandscape = (section: TemplateSectionPayload): boolean => section.orientation === 'landscape';
const sections = computed(() => source.value.map((section, index) => ({ section, fields: section.fields, landscape: isLandscape(section), index })));

const sheets = computed(() => {
    const groups: Array<{ landscape: boolean; items: typeof sections.value }> = [];
    for (const item of sections.value) {
        const last = groups[groups.length - 1];
        if (last && last.landscape === item.landscape) last.items.push(item);
        else groups.push({ landscape: item.landscape, items: [item] });
    }
    return groups.length > 0 ? groups : [{ landscape: false, items: [] as typeof sections.value }];
});
const toolbarWidth = computed(() => {
    const paper = paperOf(documentStyle.value);
    return `${sheets.value[0]?.landscape ? paper.height : paper.width}mm`;
});
watch(changed, (value) => emit('dirty', value));
watch(() => props.template, () => {
    if (!awaitingReload.value) return;
    awaitingReload.value = false;
    draft.value = [];
});
watch([() => props.template, preview], () => { void nextTick(paginate); }, { deep: true });
const usedSectionKeys = computed(() => source.value.map((section) => section.key));
const usedFieldKeys = computed(() => sections.value.flatMap((entry) => entry.fields.map((field) => field.key)));

const removal = ref<{ kind: 'section' | 'field'; id: string; name: string; count: number } | null>(null);

const moved = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + direction, 0, item!);
    return next;
};
const moveSection = (index: number, direction: -1 | 1): void => {
    draft.value = moved(draft.value, index, direction);
    touched();
};
const moveField = (sectionId: string, index: number, direction: -1 | 1): void => {
    const section = draft.value.find((item) => item.id === sectionId);
    if (section) section.fields = moved(section.fields, index, direction);
    touched();
};

const addSection = (index?: number): void => {
    const created: TemplateSectionPayload = { id: temporaryId(), key: uniqueKey('nueva seccion', 'seccion', usedSectionKeys.value), title: 'Nueva sección', orientation: 'portrait', fields: [] };
    draft.value.splice(index ?? draft.value.length, 0, created);
    focusId.value = created.id;
    touched();
};
const addField = (sectionId: string, index?: number): void => {
    const section = draft.value.find((item) => item.id === sectionId);
    if (!section) return;
    const created: TemplateField = { id: temporaryId(), key: uniqueKey('', 'campo', usedFieldKeys.value), label: '', quien_llena: 'docente', content: emptyDocument() };
    section.fields.splice(index ?? section.fields.length, 0, created);
    focusId.value = created.id;
    touched();
};
const insertAfterLastField = (key: string, sectionId: string, sectionIndex: number): void => {
    if (key === 'section') addSection(sectionIndex + 1);
    else addField(sectionId);
};
const setField = (sectionId: string, fieldId: string, value: TemplateField): void => {
    const section = draft.value.find((item) => item.id === sectionId);
    const position = section?.fields.findIndex((item) => item.id === fieldId) ?? -1;
    if (!section || position < 0) return;
    const duplicated = value.key !== section.fields[position]!.key && sections.value.some((entry) => entry.fields.some((field) => field.id !== fieldId && field.key === value.key));
    if (duplicated) {
        error.value = 'Esa plantilla ya está en el sílabo';
        return;
    }
    section.fields[position] = value;
    touched();
};
const setOrientation = (section: TemplateSectionPayload, orientation: 'portrait' | 'landscape'): void => {
    section.orientation = orientation;
    touched();
};
const selected = computed(() => {
    for (const [sectionIndex, section] of draft.value.entries()) {
        if (selectedSection.value === section.id) return { section, sectionIndex, fieldIndex: -1 };
        const fieldIndex = section.fields.findIndex((field) => field.id === selectedField.value);
        if (fieldIndex >= 0) return { section, sectionIndex, fieldIndex };
    }
    return null;
});
const selection = computed<TemplateSelection | null>(() => {
    const target = selected.value;
    if (!target) return null;
    if (target.fieldIndex < 0) return { kind: 'section', section: target.section, canMoveUp: target.sectionIndex > 0, canMoveDown: target.sectionIndex < draft.value.length - 1 };
    return { kind: 'field', field: target.section.fields[target.fieldIndex]!, canMoveUp: target.fieldIndex > 0, canMoveDown: target.fieldIndex < target.section.fields.length - 1 };
});
const ribbonEditor = computed(() => selection.value?.kind === 'field' && activeEditor.value && !activeEditor.value.isDestroyed ? activeEditor.value : null);
const patchSelectedField = (changes: Partial<TemplateField>): void => {
    const target = selected.value;
    const field = target && target.fieldIndex >= 0 ? target.section.fields[target.fieldIndex] : undefined;
    if (target && field) setField(target.section.id, field.id, { ...field, ...changes });
};
const applyPreset = (preset: TemplatePreset): void => patchSelectedField({ quien_llena: preset.quien_llena, content: JSON.parse(JSON.stringify(preset.content)) as TemplateField['content'] });
const moveSelected = (direction: -1 | 1): void => {
    const target = selected.value;
    if (!target) return;
    if (target.fieldIndex < 0) moveSection(target.sectionIndex, direction);
    else moveField(target.section.id, target.fieldIndex, direction);
};
const removeSelected = (): void => {
    const target = selected.value;
    if (!target) return;
    const field = target.section.fields[target.fieldIndex];
    removal.value = field
        ? { kind: 'field', id: field.id, name: fieldName(field), count: 0 }
        : { kind: 'section', id: target.section.id, name: target.section.title, count: target.section.fields.length };
};
const toggleOrientation = (): void => {
    const section = selected.value?.section;
    if (section && selected.value!.fieldIndex < 0) setOrientation(section, section.orientation === 'landscape' ? 'portrait' : 'landscape');
};
const nameSelected = (): void => { naming.value = selectedField.value; };
const setTitle = (section: TemplateSectionPayload, title: string): void => {
    section.title = title;
    touched();
};
const setTitleRef = (component: unknown, sectionId: string): void => {
    const input = component as { focus?: () => void } | null;
    if (focusId.value !== sectionId || !input?.focus) return;
    focusId.value = null;
    void nextTick(() => input.focus?.());
};

const confirmRemoval = (): void => {
    const target = removal.value;
    if (!target) return;
    if (target.kind === 'section') draft.value = draft.value.filter((section) => section.id !== target.id);
    else for (const section of draft.value) section.fields = section.fields.filter((field) => field.id !== target.id);
    removal.value = null;
    touched();
};

const fieldName = (field: TemplateField): string => field.label.trim() || 'Campo sin nombre';
</script>

<template>
  <TooltipProvider>
  <div ref="root" class="flex min-w-0 flex-col gap-4" aria-label="Constructor visual de la plantilla del sílabo" role="region">
    <Alert v-if="error" variant="destructive" role="alert" class="mx-auto max-w-3xl"><AlertDescription>{{ error }}</AlertDescription></Alert>


    <div :class="cn('pointer-events-none sticky z-20 mx-auto flex w-full justify-end', preview ? 'top-[calc(var(--app-header-height)+0.5rem)]' : 'top-16')" :style="{ maxWidth: toolbarWidth }">
      <div v-if="preview" class="pointer-events-auto flex items-center gap-2 rounded-md ring-1 ring-surface-ring bg-card p-1.5 shadow-menu">
        <Button type="button" :disabled="locked" @click="editWarningOpen = true"><Pencil data-icon="inline-start" aria-hidden="true" />Editar</Button>
      </div>
      <div v-else data-template-ribbon role="toolbar" aria-label="Cinta de edición de la plantilla" class="pointer-events-auto flex w-full min-w-0 flex-wrap items-center gap-1 rounded-md ring-1 ring-surface-ring bg-card p-1.5 shadow-menu">
        <TemplateFormatTools :editor="ribbonEditor" :disabled="locked || busy" />
        <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        <TemplateSelectionTools
          :selection="selection"
          :presets="presets"
          :locked="locked"
          :busy="busy"
          @responsible="patchSelectedField({ quien_llena: $event })"
          @preset="applyPreset"
          @name="nameSelected"
          @move="moveSelected"
          @remove="removeSelected"
          @orientation="toggleOrientation"
        />
        <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        <div class="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger as-child>
                <DropdownMenuTrigger as-child>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Opciones avanzadas" :disabled="busy || locked"><Settings2 aria-hidden="true" /></Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Opciones avanzadas</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem :disabled="locked" @select="jsonOpen = true">Editar JSON</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover v-if="layoutControls.length">
            <Tooltip>
              <TooltipTrigger as-child>
                <PopoverTrigger as-child>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Diseño" :disabled="busy || locked"><Ruler aria-hidden="true" /></Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Diseño</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" class="w-72">
              <FieldGroup class="gap-4">
                <p class="text-sm text-muted-foreground">Márgenes y tamaños del documento. La letra, los colores y la alineación son los institucionales.</p>
                <Field v-for="control in layoutControls" :key="control.key">
                  <FieldLabel :for="`template-layout-${control.key}`">{{ control.label }}</FieldLabel>
                  <Select :model-value="String(layoutDraft[control.key])" @update:model-value="setLayout(control.key, $event)">
                    <SelectTrigger :id="`template-layout-${control.key}`"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem v-for="option in control.options" :key="option.value" :value="String(option.value)">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </PopoverContent>
          </Popover>
          <Popover v-if="listsDraft.length">
            <Tooltip>
              <TooltipTrigger as-child>
                <PopoverTrigger as-child>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Listas" :disabled="busy || locked"><ListTree aria-hidden="true" /></Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Listas</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" class="w-80">
              <FieldGroup class="gap-4">
                <p class="text-sm text-muted-foreground">Cuántos elementos puede tener el docente.</p>
                <FieldSet v-for="list in listsDraft" :key="`${list.block}-${list.path}`" class="gap-2">
                  <FieldLegend variant="label">{{ list.label }}</FieldLegend>
                  <div class="grid grid-cols-3 gap-2">
                    <Field v-for="limit in LIMITS" :key="limit.key" class="gap-1">
                      <FieldLabel :for="`template-list-${list.block}-${list.path}-${limit.key}`" class="text-xs font-normal">{{ limit.label }}</FieldLabel>
                      <Input :id="`template-list-${list.block}-${list.path}-${limit.key}`" type="number" min="0" max="100" step="1" :model-value="list[limit.key]" @update:model-value="setListLimit(list, limit.key, $event)" />
                    </Field>
                  </div>
                </FieldSet>
              </FieldGroup>
            </PopoverContent>
          </Popover>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <span class="sr-only" aria-live="polite"><template v-if="changed">Sin guardar</template></span>
          <Button type="button" class="relative" :disabled="busy || !changed" @click="save"><Spinner v-if="busy" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar<span v-if="changed" data-unsaved class="absolute -right-1 -top-1 size-2.5 rounded-full bg-warning ring-2 ring-background" aria-hidden="true" /></Button>
        </div>
      </div>
    </div>

    <div v-for="(sheet, sheetIndex) in sheets" :key="sheetIndex" class="min-w-0 overflow-x-auto" tabindex="0" role="region" :aria-label="`Hoja ${sheetIndex + 1} de la plantilla con desplazamiento horizontal`">
    <article :ref="(element) => setSheet(sheetIndex, element)" data-sheet :data-preview="preview" :style="{ zoom: scaleFor(sheet.landscape), ...layoutStyle(shownLayout, documentStyle) }" :class="cn('template-sheet relative', sheet.landscape && 'template-sheet--landscape')">
      <div data-sheet-content class="flex flex-col gap-6">
      <header v-if="sheetIndex === 0" class="flex flex-col gap-3">
        <div v-if="logos" class="flex items-center justify-between gap-4">
          <label :class="cn('group relative block', !preview && !locked && 'cursor-pointer')">
            <img :src="logoOverride ?? logos.institution" alt="Logo de la universidad" class="max-h-12 object-contain" @load="paginate">
            <template v-if="!preview && !locked">
              <span class="absolute inset-0 flex items-center justify-center gap-1 rounded-sm bg-background/80 text-sm font-medium opacity-0 outline outline-1 outline-border group-focus-within:opacity-100 group-hover:opacity-100"><Spinner v-if="uploadingLogo" /><ImageUp v-else class="size-4" aria-hidden="true" />Cambiar logo</span>
              <input type="file" accept="image/png" class="sr-only" aria-label="Cambiar el logo de la universidad" :disabled="uploadingLogo" @change="changeLogo">
            </template>
          </label>
          <img :src="logos.faculty" alt="Logo de la facultad" class="max-h-12 object-contain" @load="paginate">
        </div>
        <div class="flex items-center justify-center px-2 py-1">
          <div v-if="!preview && !locked" class="template-sheet-title w-full"><TemplateInlineText :model-value="titleDraft" :maxlength="180" label="Título del documento" class="rounded-sm text-center hover:outline hover:outline-1 hover:outline-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" @update:model-value="setDocumentTitle" /></div>
          <h2 v-else class="template-sheet-title">{{ shownTitle }}</h2>
        </div>
      </header>

      <template v-for="({ section, fields, index: sectionIndex }) in sheet.items" :key="section.id">
      <section :data-section="section.id" :data-orientation="sheet.landscape ? 'landscape' : 'portrait'" class="relative flex min-w-0 scroll-mt-36 flex-col gap-3">
        <TemplateInsertPoint v-if="!preview && !locked && (sectionIndex === 0 || (sections[sectionIndex - 1]?.fields.length ?? 0) === 0)" :disabled="locked || busy" :actions="[{ key: 'section', label: 'Nueva sección' }]" position="top" gap="section" @insert="addSection(sectionIndex)" />
        <h3 v-if="preview" class="font-bold" data-section-title>{{ section.title }}</h3>
        <div v-else data-section-heading data-section-title :class="cn('rounded-sm font-bold outline-offset-2', selectedSection === section.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40')" @focusin="selectSection(section.id)">
          <TemplateInlineText
            :ref="(element) => setTitleRef(element, section.id)"
            :model-value="section.title"
            :maxlength="180"
            :disabled="locked"
            :label="`Sección ${section.title}`"
            @update:model-value="setTitle(section, $event)"
          />
        </div>

        <ol class="flex flex-col gap-3">
          <template v-for="(field, fieldIndex) in fields" :key="field.id">
          <li :data-field="field.id" :data-field-responsible="field.quien_llena" :class="cn('relative min-w-0 rounded-sm px-2 py-1', !preview && ['group outline-offset-2', selectedField === field.id ? 'outline outline-2 outline-primary' : 'outline outline-1 outline-transparent hover:outline-primary/40'])">
            <TemplateInsertPoint v-if="!preview && !locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="top" gap="field" @insert="addField(section.id, fieldIndex)" />
            <TemplateInsertPoint v-if="!preview && !locked && fieldIndex === fields.length - 1" :disabled="busy" :actions="[{ key: 'section', label: 'Nueva sección' }, { key: 'field', label: 'Agregar campo' }]" position="bottom" gap="field" @insert="insertAfterLastField($event, section.id, sectionIndex)" />
            <TemplateFieldContent v-if="preview" :field="field" :variables="variables" preview />
            <TemplateSheetField
              v-else
              :field="field"
              :locked="locked"
              :focus-on-create="focusId === field.id"
              :naming="naming === field.id"
              @select="selectField(field.id, $event)"
              @named="naming = null"
              @update:field="setField(section.id, field.id, $event)"
            />
          </li>
          </template>
        </ol>
        <p v-if="fields.length === 0 && !preview" class="relative py-1 text-sm text-muted-foreground">Sección sin campos.<TemplateInsertPoint v-if="!locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="inline" gap="field" @insert="addField(section.id)" /></p>
      </section>
      </template>
      <div v-if="sheetIndex === 0 && !preview && sections.length === 0" class="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <p>La plantilla no tiene secciones</p>
        <Button type="button" variant="outline" :disabled="locked || busy" @click="addSection()"><Plus data-icon="inline-start" aria-hidden="true" />Nueva sección</Button>
      </div>
      </div>

    </article>
    </div>

    <UnsavedChangesDialog :open="leaveOpen" title="Hay cambios sin guardar" description="Los cambios de la plantilla no se guardaron. Si vuelve, los perderá" discard-label="Volver y descartar cambios" @continue="leaveOpen = false" @discard="discardAndLeave" @update:open="leaveOpen = $event" />

    <TemplateJsonDialog v-model:open="jsonOpen" :template-id="template.id" :locked="locked" @imported="reloadAfterJson" />

    <Dialog v-model:open="editWarningOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar la plantilla</DialogTitle>
          <DialogDescription>Si guarda cambios:</DialogDescription>
          <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Al reanudar una convocatoria en pausa, sus sílabos se rehacen desde cero</li>
            <li>En el próximo período, los docentes no conservan lo que escribieron</li>
          </ul>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="editWarningOpen = false">Cancelar</Button>
          <Button type="button" :disabled="editCountdown > 0" @click="startEditing"><Pencil data-icon="inline-start" aria-hidden="true" />{{ editCountdown > 0 ? `Continuar (${editCountdown})` : 'Continuar' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="removal !== null" @update:open="(value: boolean) => { if (!value) removal = null }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ removal?.kind === 'section' ? 'Eliminar sección' : 'Eliminar campo' }}</DialogTitle>
          <DialogDescription>
            {{ removal?.kind === 'section' ? `Se quitará «${removal?.name}» con sus ${removal?.count} campos de la plantilla.` : `Se quitará «${removal?.name}» de la plantilla.` }}
            Se aplica al guardar la plantilla.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="removal = null">Cancelar</Button>
          <Button type="button" variant="destructive" @click="confirmRemoval"><Trash2 data-icon="inline-start" aria-hidden="true" />Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  </TooltipProvider>
</template>
