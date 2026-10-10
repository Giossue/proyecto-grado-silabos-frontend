<script setup lang="ts">
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { TemplateField, TemplatePayload, TemplateSectionPayload } from '@/api/template';
import { createField, createSection, deleteField, deleteSection, renameSection, reorderFields, reorderSections } from '@/api/template-structure';
import { paginateSheet } from '@/components/domain/configuration/templatePagination';
import TemplateInsertPoint from '@/components/domain/configuration/TemplateInsertPoint.vue';
import TemplateFieldContent from '@/components/domain/configuration/TemplateFieldContent.vue';
import TemplateSheetField from '@/components/domain/configuration/TemplateSheetField.vue';
import { apiMessage, uniqueKey } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { emptyDocument } from '@/types/configuration';


const props = defineProps<{ template: NonNullable<TemplatePayload['template']>; processLock?: string | null; logos?: TemplatePayload['logos']; variables?: TemplatePayload['variables'] }>();
const emit = defineEmits<{ changed: [] }>();

const locked = computed(() => Boolean(props.processLock));
const preview = ref(false);
const previewLabel = computed(() => preview.value ? 'Salir de la vista previa de toda la plantilla' : 'Vista previa de toda la plantilla');
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
const setSheet = (index: number, element: unknown): void => {
    if (element instanceof HTMLElement) sheetElements.set(index, element);
    else sheetElements.delete(index);
};
let paginationFrame = 0;
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
    resizeObserver?.disconnect();
    cancelAnimationFrame(paginationFrame);
});
const busy = ref(false);
const error = ref<string | null>(null);

const isLandscape = (section: TemplateSectionPayload): boolean => section.orientation === 'landscape';
const sections = computed(() => props.template.sections.map((section, index) => ({ section, fields: section.fields, landscape: isLandscape(section), index })));

const sheets = computed(() => {
    const groups: Array<{ landscape: boolean; items: typeof sections.value }> = [];
    for (const item of sections.value) {
        const last = groups[groups.length - 1];
        if (last && last.landscape === item.landscape) last.items.push(item);
        else groups.push({ landscape: item.landscape, items: [item] });
    }
    return groups.length > 0 ? groups : [{ landscape: false, items: [] as typeof sections.value }];
});
watch([() => props.template, preview], () => { void nextTick(paginate); }, { deep: true });
const usedSectionKeys = computed(() => props.template.sections.map((section) => section.key));
const usedFieldKeys = computed(() => sections.value.flatMap((entry) => entry.fields.map((field) => field.key)));

const removal = ref<{ kind: 'section' | 'field'; id: string; name: string; count: number } | null>(null);

const run = async (action: () => Promise<unknown>, fallback: string): Promise<void> => {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        await action();
        emit('changed');
    } catch (reason) {
        error.value = apiMessage(reason, fallback);
    } finally {
        busy.value = false;
    }
};

const moved = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + direction, 0, item!);
    return next;
};
const moveSection = (index: number, direction: -1 | 1): Promise<void> =>
    run(() => reorderSections(props.template.id, moved(props.template.sections, index, direction).map((section) => section.id)), 'No se pudo cambiar el orden.');
const moveField = (sectionId: string, fields: TemplateField[], index: number, direction: -1 | 1): Promise<void> =>
    run(() => reorderFields(props.template.id, sectionId, moved(fields, index, direction).map((field) => field.id)), 'No se pudo cambiar el orden.');

const inserted = (order: string[], id: string, index: number): string[] => {
    const next = order.filter((item) => item !== id);
    next.splice(Math.min(Math.max(index, 0), next.length), 0, id);
    return next;
};
const addSection = (index?: number): Promise<void> => run(async () => {
    const created = await createSection(props.template.id, { key: uniqueKey('nueva seccion', 'seccion', usedSectionKeys.value), title: 'Nueva sección', orientation: 'portrait' });
    if (index !== undefined && index < props.template.sections.length) {
        await reorderSections(props.template.id, inserted(props.template.sections.map((section) => section.id), created.section_id, index));
    }
    focusId.value = created.section_id;
}, 'No se pudo agregar la sección.');
const addField = (sectionId: string, index?: number): Promise<void> => run(async () => {
    const current = sections.value.find((entry) => entry.section.id === sectionId)?.fields ?? [];
    const created = await createField(props.template.id, sectionId, { key: uniqueKey('', 'campo', usedFieldKeys.value), label: '', quien_llena: 'docente', content: emptyDocument() });
    const id = created.field?.id;
    if (id && index !== undefined && index < current.length) {
        await reorderFields(props.template.id, sectionId, inserted(current.map((field) => field.id), id, index));
    }
    focusId.value = id ?? null;
}, 'No se pudo agregar el campo.');
const insertAfterLastField = (key: string, sectionId: string, sectionIndex: number): void => {
    if (key === 'section') void addSection(sectionIndex + 1);
    else void addField(sectionId);
};

const titleDraft = ref<Record<string, string>>({});
const titleOf = (section: TemplateSectionPayload): string => titleDraft.value[section.id] ?? section.title;
const commitTitle = (section: TemplateSectionPayload): void => {
    const value = (titleDraft.value[section.id] ?? section.title).trim();
    delete titleDraft.value[section.id];
    if (value === '' || value === section.title) return;
    void run(() => renameSection(props.template.id, section.id, value, section.orientation), 'No se pudo renombrar la sección.');
};
const setOrientation = (section: TemplateSectionPayload, orientation: 'portrait' | 'landscape'): Promise<void> =>
    orientation === section.orientation ? Promise.resolve() : run(() => renameSection(props.template.id, section.id, titleOf(section).trim() || section.title, orientation), 'No se pudo cambiar la orientación.');
const blurTarget = (event: Event): void => { if (event.target instanceof HTMLElement) event.target.blur(); };
const setTitleRef = (component: unknown, sectionId: string): void => {
    const element = (component as { $el?: unknown } | null)?.$el;
    if (focusId.value !== sectionId || !(element instanceof HTMLInputElement)) return;
    focusId.value = null;
    void nextTick(() => { element.focus(); element.select(); });
};

const confirmRemoval = (): Promise<void> => {
    const target = removal.value;
    if (!target) return Promise.resolve();
    return run(async () => {
        if (target.kind === 'section') await deleteSection(props.template.id, target.id);
        else await deleteField(props.template.id, target.id);
        toast.success(target.kind === 'section' ? 'Sección eliminada.' : 'Campo eliminado.');
        removal.value = null;
    }, 'No se pudo eliminar.');
};

const fieldName = (field: TemplateField): string => field.label.trim() || 'Campo sin nombre';
const failed = (message: string): void => { error.value = message; };
</script>

<template>
  <TooltipProvider>
  <div ref="root" class="flex min-w-0 flex-col gap-4" aria-label="Constructor visual de la plantilla del sílabo" role="region">
    <Alert v-if="error" variant="destructive" role="alert" class="mx-auto max-w-3xl"><AlertDescription>{{ error }}</AlertDescription></Alert>

    <div v-for="(sheet, sheetIndex) in sheets" :key="sheetIndex" class="min-w-0 overflow-x-auto py-4" tabindex="0" role="region" :aria-label="`Hoja ${sheetIndex + 1} de la plantilla con desplazamiento horizontal`">
    <article :ref="(element) => setSheet(sheetIndex, element)" data-sheet :data-preview="preview" :style="{ zoom: scaleFor(sheet.landscape) }" :class="cn('template-sheet relative', sheet.landscape && 'template-sheet--landscape')">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button type="button" variant="ghost" size="icon" class="absolute top-2 right-2" :aria-label="previewLabel" :aria-pressed="preview" @click="preview = !preview"><EyeOff v-if="preview" aria-hidden="true" /><Eye v-else aria-hidden="true" /></Button>
        </TooltipTrigger>
        <TooltipContent>{{ previewLabel }}</TooltipContent>
      </Tooltip>
      <header v-if="sheetIndex === 0" class="flex flex-col gap-3">
        <div v-if="logos" class="flex items-center justify-between gap-4">
          <img :src="logos.institution" alt="Logo de la universidad" class="max-h-12 object-contain" @load="paginate">
          <img :src="logos.faculty" alt="Logo de la facultad" class="max-h-12 object-contain" @load="paginate">
        </div>
        <div class="flex items-center justify-center px-2 py-1">
          <h2 class="template-sheet-title">{{ template.titleBlock.text }}</h2>
        </div>
      </header>

      <div v-if="sections.length === 0 && sheetIndex === 0 && !preview" class="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border p-8 text-center">
        <p class="text-base font-medium">Esta hoja está en blanco</p>
        <p class="max-w-sm text-sm text-muted-foreground">La plantilla no tiene secciones. Agregue la primera sección o restablezca la plantilla oficial.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <Button type="button" :disabled="locked || busy" @click="addSection()"><Plus data-icon="inline-start" aria-hidden="true" />Nueva sección</Button>
        </div>
      </div>

      <template v-for="({ section, fields, index: sectionIndex }) in sheet.items" :key="section.id">
      <section :data-section="section.id" :data-orientation="sheet.landscape ? 'landscape' : 'portrait'" class="relative flex min-w-0 flex-col gap-3">
        <TemplateInsertPoint v-if="!preview && !locked && (sectionIndex === 0 || (sections[sectionIndex - 1]?.fields.length ?? 0) === 0)" :disabled="locked || busy" :actions="[{ key: 'section', label: 'Nueva sección' }]" position="top" gap="section" @insert="addSection(sectionIndex)" />
        <h3 v-if="preview" class="font-bold">{{ section.title }}</h3>
        <div v-else data-section-heading :class="cn('group relative rounded-sm px-1 pb-1 outline-offset-2', selectedSection === section.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40')" @focusin="selectSection(section.id)">
          <Input
            :ref="(element) => setTitleRef(element, section.id)"
            :model-value="titleOf(section)"
            maxlength="180"
            :disabled="locked"
            :aria-label="`Sección ${section.title}`"
            class="h-auto min-w-0 border-transparent bg-transparent px-0 py-0 font-bold shadow-none hover:border-input focus-visible:border-input"
            @update:model-value="titleDraft[section.id] = String($event)"
            @blur="commitTitle(section)"
            @keydown.enter.prevent="blurTarget($event)"
          />
          <div :class="cn('absolute -top-4 right-0 z-10 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm focus-within:opacity-100 group-hover:opacity-100', selectedSection === section.id ? 'opacity-100' : 'opacity-0')">
            <Select :model-value="section.orientation" :disabled="locked || busy" @update:model-value="setOrientation(section, $event as 'portrait' | 'landscape')">
              <SelectTrigger class="h-7 w-28 border-0 text-xs shadow-none" :aria-label="`Orientación de la sección ${section.title}`"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="portrait">Vertical</SelectItem><SelectItem value="landscape">Horizontal</SelectItem></SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === 0" :aria-label="`Subir la sección ${section.title}`" @click="moveSection(sectionIndex, -1)"><ArrowUp aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === sections.length - 1" :aria-label="`Bajar la sección ${section.title}`" @click="moveSection(sectionIndex, 1)"><ArrowDown aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar la sección ${section.title}`" @click="removal = { kind: 'section', id: section.id, name: section.title, count: fields.length }"><Trash2 aria-hidden="true" /></Button>
          </div>
        </div>

        <ol class="flex flex-col gap-3">
          <template v-for="(field, fieldIndex) in fields" :key="field.id">
          <li :data-field="field.id" :data-field-responsible="field.quien_llena" :class="cn('relative min-w-0 rounded-sm px-2 py-1', !preview && ['group outline-offset-2', selectedField === field.id ? 'outline outline-2 outline-primary' : 'outline outline-1 outline-dashed outline-muted-foreground hover:outline-primary/60'])">
            <TemplateInsertPoint v-if="!preview && !locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="top" gap="field" @insert="addField(section.id, fieldIndex)" />
            <TemplateInsertPoint v-if="!preview && !locked && fieldIndex === fields.length - 1" :disabled="busy" :actions="[{ key: 'section', label: 'Nueva sección' }, { key: 'field', label: 'Agregar campo' }]" position="bottom" gap="field" @insert="insertAfterLastField($event, section.id, sectionIndex)" />
            <TemplateFieldContent v-if="preview" :field="field" :variables="variables" preview />
            <TemplateSheetField
              v-else
              :template-id="template.id"
              :field="field"
              :variables="variables"
              :locked="locked"
              :selected="selectedField === field.id"
              :focus-on-create="focusId === field.id"
              :can-move-up="fieldIndex > 0"
              :can-move-down="fieldIndex < fields.length - 1"
              :busy="busy"
              @select="selectField(field.id)"
              @move="moveField(section.id, fields, fieldIndex, $event)"
              @remove="removal = { kind: 'field', id: field.id, name: fieldName(field), count: 0 }"
              @failed="failed"
            />
          </li>
          </template>
        </ol>
        <p v-if="fields.length === 0 && !preview" class="relative py-1 text-sm text-muted-foreground">Sección sin campos.<TemplateInsertPoint v-if="!locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="inline" gap="field" @insert="addField(section.id)" /></p>
      </section>
      </template>

    </article>
    </div>

    <Dialog :open="removal !== null" @update:open="(value: boolean) => { if (!value) removal = null }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ removal?.kind === 'section' ? 'Eliminar sección' : 'Eliminar campo' }}</DialogTitle>
          <DialogDescription>
            {{ removal?.kind === 'section' ? `Se quitará «${removal?.name}» con sus ${removal?.count} campos de la plantilla.` : `Se quitará «${removal?.name}» de la plantilla.` }}
            Los sílabos ya entregados conservan su propia copia.
          </DialogDescription>
        </DialogHeader>
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="busy" @click="removal = null">Cancelar</Button>
          <Button type="button" variant="destructive" :disabled="busy" @click="confirmRemoval"><Spinner v-if="busy" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  </TooltipProvider>
</template>
