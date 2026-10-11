<script setup lang="ts">
import { ArrowDown, ArrowUp, ImageUp, Pencil, Plus, Save, RectangleHorizontal, RectangleVertical, Trash2 } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { TemplateField, TemplatePayload, TemplateSectionPayload } from '@/api/template';
import { importTemplateJson, uploadTemplateLogo } from '@/api/template';
import { paginateSheet } from '@/components/domain/configuration/templatePagination';
import TemplateInsertPoint from '@/components/domain/configuration/TemplateInsertPoint.vue';
import TemplateFieldContent from '@/components/domain/configuration/TemplateFieldContent.vue';
import TemplateSheetField from '@/components/domain/configuration/TemplateSheetField.vue';
import { apiMessage, uniqueKey } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { emptyDocument } from '@/types/configuration';


const props = defineProps<{ template: NonNullable<TemplatePayload['template']>; processLock?: string | null; logos?: TemplatePayload['logos']; variables?: TemplatePayload['variables']; presets?: TemplatePayload['presets'] }>();
const emit = defineEmits<{ changed: []; dirty: [value: boolean] }>();

const locked = computed(() => Boolean(props.processLock));
const preview = ref(true);
const selectedField = ref<string | null>(null);
const selectedSection = ref<string | null>(null);
const selectField = (id: string): void => { selectedField.value = id; selectedSection.value = null; };
const focusId = ref<string | null>(null);
const selectSection = (id: string): void => { selectedSection.value = id; selectedField.value = null; };
const root = ref<HTMLElement | null>(null);
const available = ref(0);
let resizeObserver: ResizeObserver | null = null;

const SHEET_PX = { portrait: 794, landscape: 1123 };
const scaleFor = (landscape: boolean): number => {
    const width = landscape ? SHEET_PX.landscape : SHEET_PX.portrait;

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
        sheetElements.forEach((element, index) => paginateSheet(element, sheets.value[index]?.landscape ?? false));
    });
};
const clearSelectionOutside = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-field], [data-section-heading], [data-insert-point], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-slot="popover-content"]')) return;
    selectedField.value = null;
    selectedSection.value = null;
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
const source = computed<TemplateSectionPayload[]>(() => preview.value && !awaitingReload.value ? props.template.sections : draft.value);
const dirty = ref(false);
const titleDraft = ref('');
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
    if (!awaitingReload.value) {
        draft.value = clone(props.template.sections);
        titleDraft.value = props.template.titleBlock.text;
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
};
const save = async (): Promise<void> => {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        await importTemplateJson(props.template.id, {
            version: 1,
            title: titleDraft.value.trim() || props.template.titleBlock.text,
            sections: draft.value.map((section) => ({
                key: section.key,
                title: section.title.trim(),
                orientation: section.orientation,
                fields: section.fields.map((field) => ({ key: field.key, label: field.label.trim(), help: field.help?.trim() ? field.help.trim() : null, quien_llena: field.quien_llena, content: field.content })),
            })),
        });
        toast.success('Plantilla guardada');
        awaitingReload.value = true;
        preview.value = true;
        selectedField.value = null;
        selectedSection.value = null;
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
    const created: TemplateSectionPayload = { id: temporaryId(), key: uniqueKey('nueva seccion', 'seccion', usedSectionKeys.value), title: 'Nueva sección', description: null, orientation: 'portrait', fields: [] };
    draft.value.splice(index ?? draft.value.length, 0, created);
    focusId.value = created.id;
    touched();
};
const addField = (sectionId: string, index?: number): void => {
    const section = draft.value.find((item) => item.id === sectionId);
    if (!section) return;
    const created: TemplateField = { id: temporaryId(), key: uniqueKey('', 'campo', usedFieldKeys.value), label: '', help: null, quien_llena: 'docente', content: emptyDocument() };
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
const setTitle = (section: TemplateSectionPayload, title: string): void => {
    section.title = title;
    touched();
};
const blurTarget = (event: Event): void => { if (event.target instanceof HTMLElement) event.target.blur(); };
const setTitleRef = (component: unknown, sectionId: string): void => {
    const element = (component as { $el?: unknown } | null)?.$el;
    if (focusId.value !== sectionId || !(element instanceof HTMLInputElement)) return;
    focusId.value = null;
    void nextTick(() => { element.focus(); element.select(); });
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

    <div class="pointer-events-none sticky top-[calc(var(--app-header-height)+0.5rem)] z-20 mx-auto flex w-full max-w-3xl justify-end">
      <div class="pointer-events-auto flex items-center gap-2 rounded-lg border bg-background/95 p-1.5 shadow-sm">
        <Button v-if="preview" type="button" :disabled="locked" @click="startEditing"><Pencil data-icon="inline-start" aria-hidden="true" />Editar</Button>
        <template v-else>
          <span v-if="changed" class="px-1 text-sm text-muted-foreground" aria-live="polite">Sin guardar</span>
          <Button type="button" variant="outline" :disabled="busy" @click="cancelEditing">Cancelar</Button>
          <Button type="button" :disabled="busy || !changed" @click="save"><Spinner v-if="busy" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar</Button>
        </template>
      </div>
    </div>

    <div v-for="(sheet, sheetIndex) in sheets" :key="sheetIndex" class="min-w-0 overflow-x-auto py-4" tabindex="0" role="region" :aria-label="`Hoja ${sheetIndex + 1} de la plantilla con desplazamiento horizontal`">
    <article :ref="(element) => setSheet(sheetIndex, element)" data-sheet :data-preview="preview" :style="{ zoom: scaleFor(sheet.landscape) }" :class="cn('template-sheet relative', sheet.landscape && 'template-sheet--landscape')">
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
          <Input v-if="!preview && !locked" :model-value="titleDraft" maxlength="180" aria-label="Título del documento" class="template-sheet-title h-auto border-transparent bg-transparent px-0 py-0 shadow-none hover:border-input focus-visible:border-input" style="font-size: 14pt; font-weight: 700; color: var(--document-official-blue); text-align: center" @update:model-value="setDocumentTitle(String($event))" />
          <h2 v-else class="template-sheet-title">{{ shownTitle }}</h2>
        </div>
      </header>

      <template v-for="({ section, fields, index: sectionIndex }) in sheet.items" :key="section.id">
      <section :data-section="section.id" :data-orientation="sheet.landscape ? 'landscape' : 'portrait'" class="relative flex min-w-0 scroll-mt-36 flex-col gap-3">
        <TemplateInsertPoint v-if="!preview && !locked && (sectionIndex === 0 || (sections[sectionIndex - 1]?.fields.length ?? 0) === 0)" :disabled="locked || busy" :actions="[{ key: 'section', label: 'Nueva sección' }]" position="top" gap="section" @insert="addSection(sectionIndex)" />
        <h3 v-if="preview" class="font-bold">{{ section.title }}</h3>
        <div v-else data-section-heading :class="cn('group relative flex items-center gap-2 rounded-sm px-1 py-1 outline-offset-2', selectedSection === section.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40')" @focusin="selectSection(section.id)">
          <Input
            :ref="(element) => setTitleRef(element, section.id)"
            :model-value="section.title"
            maxlength="180"
            :disabled="locked"
            :aria-label="`Sección ${section.title}`"
            class="h-auto min-w-0 flex-1 border-transparent bg-transparent px-0 py-0 font-bold shadow-none focus-visible:border-transparent focus-visible:ring-0"
            @update:model-value="setTitle(section, String($event))"
            @keydown.enter.prevent="blurTarget($event)"
          />
          <div :class="cn('flex shrink-0 items-center gap-0.5 focus-within:opacity-100 group-hover:opacity-100', selectedSection === section.id ? 'opacity-100' : 'opacity-0')">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button type="button" variant="ghost" size="sm" :disabled="locked || busy" :aria-label="`Orientación de la sección ${section.title}`" :aria-pressed="section.orientation === 'landscape'" @click="setOrientation(section, section.orientation === 'landscape' ? 'portrait' : 'landscape')"><RectangleHorizontal v-if="section.orientation === 'landscape'" data-icon="inline-start" aria-hidden="true" /><RectangleVertical v-else data-icon="inline-start" aria-hidden="true" />{{ section.orientation === 'landscape' ? 'Horizontal' : 'Vertical' }}</Button>
              </TooltipTrigger>
              <TooltipContent>{{ section.orientation === 'landscape' ? 'Hoja horizontal: pasar a vertical' : 'Hoja vertical: pasar a horizontal' }}</TooltipContent>
            </Tooltip>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === 0" :aria-label="`Subir la sección ${section.title}`" @click="moveSection(sectionIndex, -1)"><ArrowUp aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === sections.length - 1" :aria-label="`Bajar la sección ${section.title}`" @click="moveSection(sectionIndex, 1)"><ArrowDown aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar la sección ${section.title}`" @click="removal = { kind: 'section', id: section.id, name: section.title, count: fields.length }"><Trash2 aria-hidden="true" /></Button>
          </div>
        </div>

        <ol class="flex flex-col gap-3">
          <template v-for="(field, fieldIndex) in fields" :key="field.id">
          <li :data-field="field.id" :data-field-responsible="field.quien_llena" :class="cn('relative min-w-0 rounded-sm px-2 py-1', !preview && ['group outline-offset-2', selectedField === field.id ? 'outline outline-2 outline-primary' : 'outline outline-1 outline-transparent hover:outline-border'])">
            <TemplateInsertPoint v-if="!preview && !locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="top" gap="field" @insert="addField(section.id, fieldIndex)" />
            <TemplateInsertPoint v-if="!preview && !locked && fieldIndex === fields.length - 1" :disabled="busy" :actions="[{ key: 'section', label: 'Nueva sección' }, { key: 'field', label: 'Agregar campo' }]" position="bottom" gap="field" @insert="insertAfterLastField($event, section.id, sectionIndex)" />
            <TemplateFieldContent v-if="preview" :field="field" :variables="variables" preview />
            <TemplateSheetField
              v-else
              :field="field"
              :presets="presets"
              :locked="locked"
              :selected="selectedField === field.id"
              :focus-on-create="focusId === field.id"
              :can-move-up="fieldIndex > 0"
              :can-move-down="fieldIndex < fields.length - 1"
              :busy="busy"
              @select="selectField(field.id)"
              @update:field="setField(section.id, field.id, $event)"
              @move="moveField(section.id, fieldIndex, $event)"
              @remove="removal = { kind: 'field', id: field.id, name: fieldName(field), count: 0 }"
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
