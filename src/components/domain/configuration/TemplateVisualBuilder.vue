<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { Braces, CircleAlert, Eye, EyeOff, GripVertical, ImageUp, Pencil, Plus, Ruler, Save, Settings2, Trash2 } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { TemplateDraftCheck, TemplateDraftImpact, TemplateDraftPayload, TemplateField, TemplatePayload, TemplatePreset, TemplateSectionPayload, TemplateVersionDraft } from '@/api/template';
import { ApiError } from '@/api/client';
import { checkTemplateDraft, getTemplateDraftImpact, importTemplateJson, previewTemplateDraft, uploadTemplateLogo } from '@/api/template';
import { draftProblemsByTarget, locateDraftProblems, problemCount, type DraftProblem } from '@/components/domain/configuration/templateDraftProblems';
import TemplateImpactDialog from '@/components/domain/configuration/TemplateImpactDialog.vue';
import type { TemplateAssistantProposal } from '@/api/templateAssistant';
import { paginateSheet } from '@/components/domain/configuration/templatePagination';
import TemplateJsonDialog from '@/components/domain/configuration/TemplateJsonDialog.vue';
import TemplateInsertPoint from '@/components/domain/configuration/TemplateInsertPoint.vue';
import TemplateFieldContent from '@/components/domain/configuration/TemplateFieldContent.vue';
import TemplateFormatTools from '@/components/domain/configuration/TemplateFormatTools.vue';
import TemplateInlineText from '@/components/domain/configuration/TemplateInlineText.vue';
import TemplateResponseTool from '@/components/domain/configuration/TemplateResponseTool.vue';
import TemplateSelectionTools, { type TemplateSectionTarget, type TemplateSelection } from '@/components/domain/configuration/TemplateSelectionTools.vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { useStructureHistory } from '@/composables/useStructureHistory';
import TemplateSheetField from '@/components/domain/configuration/TemplateSheetField.vue';
import { apiMessage, uniqueKey } from '@/components/domain/configuration/templateStructure';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { layoutOf, layoutStyle, paperOf, sheetPixels, type DocumentLayout } from '@/lib/documentLayout';
import { templateRuntime } from '@/lib/blocks/runtime';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmPhrase from '@/components/domain/ConfirmPhrase.vue';
import { matchesPhrase } from '@/lib/confirmPhrase';
import { useShownWhileClosing } from '@/lib/dialogExit';
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
const EDIT_PHRASE = 'editar plantilla';
const editTyped = ref('');
// Se borra al abrir: al cerrar, el aviso se desvanece con lo que tenía.
watch(editWarningOpen, (open) => { if (open) editTyped.value = ''; });
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
    document.addEventListener('keydown', undoWithKeyboard);
    root.value?.addEventListener('dragover', dragOver);
    root.value?.addEventListener('drop', dropDragged);
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
    document.removeEventListener('keydown', undoWithKeyboard);
    root.value?.removeEventListener('dragover', dragOver);
    root.value?.removeEventListener('drop', dropDragged);
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
const previewing = ref(false);
const previewLoading = ref(false);
const draftPreview = ref<TemplateSectionPayload[]>([]);
const readOnly = computed(() => preview.value || previewing.value);
const source = computed<TemplateSectionPayload[]>(() => previewing.value ? draftPreview.value : preview.value && !awaitingReload.value ? props.template.sections : draft.value);
const editSession = ref('');
const revision = ref(0);
const assistantMarks = ref<{ sections: string[]; fields: string[] }>({ sections: [], fields: [] });
watch(draft, () => { revision.value += 1; }, { deep: true });
const proposedSection = (section: TemplateSectionPayload): boolean => !preview.value && assistantMarks.value.sections.includes(section.key);
const proposedField = (field: TemplateField): boolean => !preview.value && assistantMarks.value.fields.includes(field.key);
const dirty = ref(false);
const titleDraft = ref('');
const layoutDraft = ref<DocumentLayout>(layoutOf(props.template.layout));
type BuilderState = { sections: TemplateSectionPayload[]; title: string; layout: DocumentLayout; marks: { sections: string[]; fields: string[] } };
const captureState = (): BuilderState => ({ sections: draft.value, title: titleDraft.value, layout: layoutDraft.value, marks: assistantMarks.value });
const savedState = ref('');
const structure = useStructureHistory<BuilderState>({
    capture: captureState,
    restore: (state) => {
        draft.value = state.sections;
        titleDraft.value = state.title;
        layoutDraft.value = state.layout;
        assistantMarks.value = state.marks;
        dropMissingSelection();
        dirty.value = JSON.stringify(captureState()) !== savedState.value;
        paginateSoon();
    },
});
const { canUndo, canRedo } = structure;
const record = (group?: string): void => { if (!preview.value) structure.record(group); };
const restartHistory = (): void => {
    structure.reset();
    savedState.value = JSON.stringify(captureState());
};
const structureEditable = computed(() => !readOnly.value && !locked.value && !busy.value);
const undoStructure = (): void => { if (structureEditable.value) structure.undo(); };
const redoStructure = (): void => { if (structureEditable.value) structure.redo(); };
const undoWithKeyboard = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.defaultPrevented) return;
    const key = event.key.toLowerCase();
    if (key !== 'z' && key !== 'y') return;
    const target = event.target;
    if (target instanceof Element && target.closest('[contenteditable="true"], [role="dialog"], [role="alertdialog"]')) return;
    if (!structureEditable.value) return;
    event.preventDefault();
    if (key === 'y' || event.shiftKey) redoStructure();
    else undoStructure();
};
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
    record();
    layoutDraft.value = { ...layoutDraft.value, [key]: number };
    touched();
};
const designOpen = ref(false);
const logoOverride = ref<string | null>(null);
const uploadingLogo = ref(false);
const shownTitle = computed(() => preview.value && !awaitingReload.value ? props.template.titleBlock.text : titleDraft.value);
const setDocumentTitle = (value: string): void => {
    record('document-title');
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
        dirty.value = false;
    }
    error.value = null;
    editSession.value = crypto.randomUUID();
    assistantMarks.value = { sections: [], fields: [] };
    restartHistory();
    preview.value = false;
};
const cancelEditing = (): void => {
    preview.value = true;
    previewing.value = false;
    problems.value = [];
    assistantMarks.value = { sections: [], fields: [] };
    draft.value = [];
    structure.reset();
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
const draftSections = () => draft.value.map((section) => ({
    key: section.key,
    title: section.title.trim(),
    orientation: section.orientation,
    fields: section.fields.map((field) => ({ key: field.key, label: field.label.trim(), quien_llena: field.quien_llena, content: field.content })),
}));
const draftPayload = (): TemplateDraftPayload => ({
    version: 1,
    title: titleDraft.value.trim() || props.template.titleBlock.text,
    layout: layoutDraft.value,
    sections: draftSections(),
});
const draftVersion = computed(() => `${editSession.value}:${revision.value}`);
const snapshot = () => ({ sections: draftSections(), version: draftVersion.value });
const applyProposal = (proposal: TemplateAssistantProposal): void => {
    record();
    const sectionIds = new Map(draft.value.map((section) => [section.key, section.id]));
    const fieldIds = new Map(draft.value.flatMap((section) => section.fields.map((field) => [field.key, field.id] as const)));
    draft.value = proposal.sections.map((section) => ({
        id: sectionIds.get(section.key) ?? temporaryId(),
        key: section.key,
        title: section.title,
        orientation: section.orientation,
        fields: section.fields.map((field) => ({ id: fieldIds.get(field.key) ?? temporaryId(), key: field.key, label: field.label, quien_llena: field.quien_llena, content: field.content })),
    }));
    assistantMarks.value = {
        sections: [...new Set([...assistantMarks.value.sections, ...proposal.changed.sections])],
        fields: [...new Set([...assistantMarks.value.fields, ...proposal.changed.fields])],
    };
    selectedField.value = null;
    selectedSection.value = null;
    activeEditor.value = null;
    touched();
};
// «Editar» vive en las acciones de la página; abre el aviso previo a editar.
const askEdit = (): void => { if (!locked.value) editWarningOpen.value = true; };

const applyVersion = (version: TemplateVersionDraft): void => {
    applyProposal({ id: 'version', status: 'aplicada', draft_version: draftVersion.value, changes: [], changed: { sections: [], fields: [] }, sections: version.sections });
    titleDraft.value = version.title;
    layoutDraft.value = layoutOf(version.layout);
    touched();
};

defineExpose({ askEdit, leave, snapshot, applyProposal, applyVersion, draftVersion, payload: draftPayload });
const impact = ref<TemplateDraftImpact | null>(null);
const save = async (): Promise<void> => {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    let result: TemplateDraftImpact | undefined;
    try {
        result = await getTemplateDraftImpact(props.template.id, draftPayload());
    } catch (reason) {
        busy.value = false;
        if (reason instanceof ApiError && reason.status === 422) {
            error.value = apiMessage(reason, 'No se pudo guardar la plantilla');
            return;
        }
        impact.value = { affected: true, counted: false, in_progress: 0, keep: 0, lose: 0, back_to_draft: 0, careers: [] };
        return;
    }
    if (result?.affected) {
        impact.value = result;
        busy.value = false;
        return;
    }
    await persist();
};
const confirmImpact = (): void => {
    impact.value = null;
    busy.value = true;
    void persist();
};
const persist = async (): Promise<void> => {
    try {
        await importTemplateJson(props.template.id, draftPayload());
        toast.success('Plantilla guardada');
        assistantMarks.value = { sections: [], fields: [] };
        awaitingReload.value = true;
        structure.reset();
        preview.value = true;
        previewing.value = false;
        problems.value = [];
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

const togglePreview = async (): Promise<void> => {
    if (previewing.value) {
        previewing.value = false;
        return;
    }
    if (previewLoading.value) return;
    previewLoading.value = true;
    error.value = null;
    try {
        draftPreview.value = (await previewTemplateDraft(props.template.id, draftPayload())).sheets;
        selectedField.value = null;
        selectedSection.value = null;
        activeEditor.value = null;
        previewing.value = true;
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo armar la vista previa');
    } finally {
        previewLoading.value = false;
    }
};

const problems = ref<DraftProblem[]>([]);
const problemsByTarget = computed(() => draftProblemsByTarget(problems.value));
const problemLabel = computed(() => problemCount(problems.value.length));
let checkTimer: ReturnType<typeof setTimeout> | undefined;
let checkRun = 0;
const runCheck = async (): Promise<void> => {
    const run = checkRun += 1;
    const sent = draft.value.map((section) => ({ id: section.id, fields: section.fields.map((field) => field.id) }));
    let result: TemplateDraftCheck | undefined;
    try {
        result = await checkTemplateDraft(props.template.id, draftPayload());
    } catch {
        result = undefined;
    }
    if (run !== checkRun || preview.value || !result) return;
    problems.value = locateDraftProblems(result.problems, sent);
};
watch(() => [revision.value, titleDraft.value, preview.value] as const, () => {
    clearTimeout(checkTimer);
    checkRun += 1;
    if (preview.value) {
        problems.value = [];
        return;
    }
    checkTimer = setTimeout(() => void runCheck(), 800);
});
onBeforeUnmount(() => clearTimeout(checkTimer));
const showFirstProblem = (): void => {
    const first = problems.value.find((problem) => problem.target !== 'general') ?? problems.value[0];
    if (!first) return;
    if (previewing.value) previewing.value = false;
    void nextTick(() => {
        const selector = first.target === 'field' ? `[data-field="${first.id}"]` : first.target === 'section' ? `[data-section="${first.id}"]` : '[data-general-problems]';
        root.value?.querySelector<HTMLElement>(selector)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        if (first.target === 'field' && first.id) selectField(first.id, null);
        if (first.target === 'section' && first.id) selectSection(first.id);
    });
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
    return `min(${sheets.value[0]?.landscape ? paper.height : paper.width}mm, 100%)`;
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
const removalShown = useShownWhileClosing(() => removal.value);

const moved = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + direction, 0, item!);
    return next;
};
const moveSection = (index: number, direction: -1 | 1): void => {
    record();
    draft.value = moved(draft.value, index, direction);
    touched();
};
const moveField = (sectionId: string, index: number, direction: -1 | 1): void => {
    const section = draft.value.find((item) => item.id === sectionId);
    if (!section) return;
    record();
    section.fields = moved(section.fields, index, direction);
    touched();
};

const addSection = (index?: number): void => {
    const created: TemplateSectionPayload = { id: temporaryId(), key: uniqueKey('nueva seccion', 'seccion', usedSectionKeys.value), title: 'Nueva sección', orientation: 'portrait', fields: [] };
    record();
    draft.value.splice(index ?? draft.value.length, 0, created);
    focusId.value = created.id;
    touched();
};
const addField = (sectionId: string, index?: number): void => {
    const section = draft.value.find((item) => item.id === sectionId);
    if (!section) return;
    record();
    const created: TemplateField = { id: temporaryId(), key: uniqueKey('', 'campo', usedFieldKeys.value), label: '', quien_llena: 'carrera', content: emptyDocument() };
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
    const current = section.fields[position]!;
    record(value.label !== current.label ? `field-label:${fieldId}` : value.content !== current.content ? `field-content:${fieldId}` : undefined);
    section.fields[position] = value;
    touched();
};
const setOrientation = (section: TemplateSectionPayload, orientation: 'portrait' | 'landscape'): void => {
    record();
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
    record(`section-title:${section.id}`);
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
    record();
    if (target.kind === 'section') draft.value = draft.value.filter((section) => section.id !== target.id);
    else for (const section of draft.value) section.fields = section.fields.filter((field) => field.id !== target.id);
    removal.value = null;
    touched();
};

const fieldName = (field: TemplateField): string => field.label.trim() || 'Campo sin nombre';

const dropMissingSelection = (): void => {
    const sectionIds = new Set(draft.value.map((section) => section.id));
    const fieldIds = new Set(draft.value.flatMap((section) => section.fields.map((field) => field.id)));
    if (selectedSection.value && !sectionIds.has(selectedSection.value)) selectedSection.value = null;
    if (selectedField.value && !fieldIds.has(selectedField.value)) {
        selectedField.value = null;
        activeEditor.value = null;
    }
};
const copyField = (field: TemplateField, used: string[], label: string): TemplateField => {
    const key = uniqueKey(field.key, 'campo', used);
    used.push(key);
    return { ...clone(field), id: temporaryId(), key, label };
};
const duplicateSelected = (): void => {
    const target = selected.value;
    if (!target || locked.value || busy.value) return;
    record();
    const used = [...usedFieldKeys.value];
    const field = target.section.fields[target.fieldIndex];
    if (field) {
        const copy = copyField(field, used, field.label.trim() ? `${field.label.trim()} (copia)` : '');
        target.section.fields.splice(target.fieldIndex + 1, 0, copy);
        selectedField.value = copy.id;
        activeEditor.value = null;
    } else {
        const section = target.section;
        const copy: TemplateSectionPayload = { ...clone(section), id: temporaryId(), key: uniqueKey(section.key, 'seccion', usedSectionKeys.value), title: `${section.title.trim()} (copia)`, fields: section.fields.map((item) => copyField(item, used, item.label)) };
        draft.value.splice(target.sectionIndex + 1, 0, copy);
        selectedSection.value = copy.id;
    }
    touched();
};
const relocateField = (fieldId: string, sectionId: string, index: number): void => {
    const from = draft.value.find((section) => section.fields.some((field) => field.id === fieldId));
    const to = draft.value.find((section) => section.id === sectionId);
    if (!from || !to || locked.value || busy.value) return;
    const position = from.fields.findIndex((field) => field.id === fieldId);
    const target = from === to && position < index ? index - 1 : index;
    if (from === to && target === position) return;
    record();
    const [field] = from.fields.splice(position, 1);
    to.fields.splice(target, 0, field!);
    touched();
};
const relocateSection = (sectionId: string, index: number): void => {
    const position = draft.value.findIndex((section) => section.id === sectionId);
    const target = position < index ? index - 1 : index;
    if (position < 0 || target === position || locked.value || busy.value) return;
    record();
    const next = [...draft.value];
    const [section] = next.splice(position, 1);
    next.splice(target, 0, section!);
    draft.value = next;
    touched();
};
const moveTargets = computed<TemplateSectionTarget[]>(() => {
    const target = selected.value;
    if (!target || target.fieldIndex < 0) return [];
    return draft.value.filter((section) => section.id !== target.section.id).map((section) => ({ id: section.id, title: section.title }));
});
const moveSelectedTo = (sectionId: string): void => {
    const target = selected.value;
    const field = target && target.fieldIndex >= 0 ? target.section.fields[target.fieldIndex] : undefined;
    const destination = draft.value.find((section) => section.id === sectionId);
    if (field && destination) relocateField(field.id, sectionId, destination.fields.length);
};

type DragItem = { kind: 'field' | 'section'; id: string };
type DropMark = { kind: 'field'; sectionId: string; index: number } | { kind: 'section'; index: number };
const DRAG_TYPE = 'application/x-template-item';
const dragging = ref<DragItem | null>(null);
const dropMark = ref<DropMark | null>(null);
const startDrag = (event: DragEvent, item: DragItem): void => {
    if (locked.value || busy.value) {
        event.preventDefault();
        return;
    }
    dragging.value = item;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_TYPE, item.id);
    }
};
const endDrag = (): void => {
    dragging.value = null;
    dropMark.value = null;
};
const inLowerHalf = (event: DragEvent, element: Element): boolean => {
    const rect = element.getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2;
};
const dragOver = (event: DragEvent): void => {
    const item = dragging.value;
    const element = event.target instanceof Element ? event.target.closest('[data-section]') : null;
    const sectionIndex = element ? draft.value.findIndex((entry) => entry.id === element.getAttribute('data-section')) : -1;
    const section = draft.value[sectionIndex];
    if (!item || !element || !section) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (item.kind === 'section') {
        dropMark.value = { kind: 'section', index: sectionIndex + (inLowerHalf(event, element) ? 1 : 0) };
        return;
    }
    const row = event.target instanceof Element ? event.target.closest('[data-field]') : null;
    const index = row ? section.fields.findIndex((field) => field.id === row.getAttribute('data-field')) : -1;
    dropMark.value = { kind: 'field', sectionId: section.id, index: row && index >= 0 ? index + (inLowerHalf(event, row) ? 1 : 0) : section.fields.length };
};
const dropDragged = (event: DragEvent): void => {
    const item = dragging.value;
    const mark = dropMark.value;
    if (!item || !mark) return;
    event.preventDefault();
    if (item.kind === 'field' && mark.kind === 'field') relocateField(item.id, mark.sectionId, mark.index);
    if (item.kind === 'section' && mark.kind === 'section') relocateSection(item.id, mark.index);
    endDrag();
};
const fieldMarked = (sectionId: string, index: number): boolean => dropMark.value?.kind === 'field' && dropMark.value.sectionId === sectionId && dropMark.value.index === index;
const sectionMarked = (index: number): boolean => dropMark.value?.kind === 'section' && dropMark.value.index === index;
</script>

<template>
  <TooltipProvider>
  <div ref="root" class="flex min-w-0 flex-col gap-4" aria-label="Constructor visual de la plantilla del sílabo" role="region">
    <Alert v-if="error" variant="destructive" role="alert" class="mx-auto max-w-3xl"><AlertDescription>{{ error }}</AlertDescription></Alert>


    <!-- La cinta mide al menos lo que la hoja y crece con su contenido para quedar en una línea. -->
    <div v-if="!preview" class="pointer-events-none sticky top-16 z-20 flex w-full justify-center">
      <div data-template-ribbon role="toolbar" aria-label="Cinta de edición de la plantilla" :style="{ minWidth: toolbarWidth }" class="pointer-events-auto flex w-max max-w-full items-start gap-1 rounded-md ring-1 ring-surface-ring bg-card p-1.5 shadow-menu">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <TemplateFormatTools :editor="ribbonEditor" :disabled="locked || busy || previewing" :variables="variables" :can-undo="canUndo" :can-redo="canRedo" @undo="undoStructure" @redo="redoStructure" />
        <TemplateResponseTool :editor="ribbonEditor" :allowed="selection?.kind === 'field' && selection.field.quien_llena !== 'institucional'" :disabled="locked || busy || previewing" />
        <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        <TemplateSelectionTools
          :selection="selection"
          :presets="presets"
          :locked="locked || previewing"
          :busy="busy"
          :targets="moveTargets"
          @duplicate="duplicateSelected"
          @move-to="moveSelectedTo"
          @responsible="patchSelectedField({ quien_llena: $event })"
          @preset="applyPreset"
          @name="nameSelected"
          @move="moveSelected"
          @remove="removeSelected"
          @orientation="toggleOrientation"
        />
        </div>
        <div class="flex shrink-0 items-center gap-1">
        <span class="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        <div class="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger as-child>
              <span class="inline-flex">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Opciones avanzadas" :disabled="busy || locked"><Settings2 aria-hidden="true" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem v-if="layoutControls.length" :disabled="locked" @select="designOpen = true"><Ruler aria-hidden="true" />Diseño</DropdownMenuItem>
                      <DropdownMenuItem :disabled="locked" @select="jsonOpen = true"><Braces aria-hidden="true" />Editar JSON</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            </TooltipTrigger>
            <TooltipContent>Opciones avanzadas</TooltipContent>
          </Tooltip>
        </div>
        <IconTooltip :label="previewing ? 'Volver a editar' : 'Vista previa'"><Button type="button" :variant="previewing ? 'secondary' : 'ghost'" size="icon-sm" :aria-label="previewing ? 'Volver a editar' : 'Vista previa'" :aria-pressed="previewing" :disabled="busy || previewLoading" data-draft-preview @click="togglePreview"><Spinner v-if="previewLoading" /><EyeOff v-else-if="previewing" aria-hidden="true" /><Eye v-else aria-hidden="true" /></Button></IconTooltip>
        <div class="flex shrink-0 items-center gap-2">
          <Button v-if="problems.length" type="button" variant="ghost" size="sm" class="text-destructive hover:text-destructive" data-problems @click="showFirstProblem"><CircleAlert data-icon="inline-start" aria-hidden="true" />{{ problemLabel }}</Button>
          <span class="sr-only" aria-live="polite"><template v-if="changed">Sin guardar</template></span>
          <Button type="button" class="relative" data-tour="template-save" :disabled="busy || !changed" @click="save"><Spinner v-if="busy" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar<span v-if="changed" data-unsaved class="absolute -right-1 -top-1 size-2.5 rounded-full bg-warning ring-2 ring-background" aria-hidden="true" /></Button>
        </div>
        </div>
      </div>
    </div>

    <div v-for="(sheet, sheetIndex) in sheets" :key="sheetIndex" class="min-w-0 overflow-x-auto" tabindex="0" role="region" :aria-label="`Hoja ${sheetIndex + 1} de la plantilla con desplazamiento horizontal`">
    <article :ref="(element) => setSheet(sheetIndex, element)" data-sheet :data-preview="readOnly" :style="{ zoom: scaleFor(sheet.landscape), ...layoutStyle(shownLayout, documentStyle) }" :class="cn('template-sheet relative shadow-none', sheet.landscape && 'template-sheet--landscape')">
      <div data-sheet-content class="flex flex-col gap-6">
      <header v-if="sheetIndex === 0" class="flex flex-col gap-3">
        <div v-if="logos" class="flex items-center justify-between gap-4">
          <label :class="cn('group relative block', !readOnly && !locked && 'cursor-pointer')">
            <img :src="logoOverride ?? logos.institution" alt="Logo de la universidad" class="h-12 w-auto object-contain" @load="paginate">
            <template v-if="!readOnly && !locked">
              <span class="absolute inset-0 flex items-center justify-center gap-1 rounded-sm bg-background/80 text-sm font-medium opacity-0 outline outline-1 outline-border group-focus-within:opacity-100 group-hover:opacity-100"><Spinner v-if="uploadingLogo" /><ImageUp v-else class="size-4" aria-hidden="true" />Cambiar logo</span>
              <input type="file" accept="image/png" class="sr-only" aria-label="Cambiar el logo de la universidad" :disabled="uploadingLogo" @change="changeLogo">
            </template>
          </label>
          <img :src="logos.faculty" alt="Logo de la facultad" class="h-12 w-auto object-contain" @load="paginate">
        </div>
        <div class="flex items-center justify-center px-2 py-1">
          <div v-if="!readOnly && !locked" class="template-sheet-title w-full"><TemplateInlineText :model-value="titleDraft" :maxlength="180" label="Título del documento" class="rounded-sm text-center hover:outline hover:outline-1 hover:outline-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" @update:model-value="setDocumentTitle" /></div>
          <h2 v-else class="template-sheet-title">{{ shownTitle }}</h2>
        </div>
        <ul v-if="!preview && problemsByTarget.general.length" data-general-problems class="flex flex-col gap-1 font-sans text-xs text-destructive">
          <li v-for="(problem, index) in problemsByTarget.general" :key="index" class="flex items-start gap-1" data-problem><CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{{ problem.message }}</li>
        </ul>
      </header>

      <template v-for="({ section, fields, index: sectionIndex }) in sheet.items" :key="section.id">
      <section :data-section="section.id" :data-orientation="sheet.landscape ? 'landscape' : 'portrait'" class="relative flex min-w-0 scroll-mt-36 flex-col gap-3">
        <span v-if="sectionMarked(sectionIndex)" data-drop-mark class="pointer-events-none absolute inset-x-0 -top-3 z-10 h-0.5 rounded-full bg-primary" aria-hidden="true" />
        <span v-if="sectionIndex === sections.length - 1 && sectionMarked(sections.length)" data-drop-mark class="pointer-events-none absolute inset-x-0 -bottom-3 z-10 h-0.5 rounded-full bg-primary" aria-hidden="true" />
        <TemplateInsertPoint v-if="!readOnly && !locked && (sectionIndex === 0 || (sections[sectionIndex - 1]?.fields.length ?? 0) === 0)" :disabled="locked || busy" :actions="[{ key: 'section', label: 'Nueva sección' }]" position="top" gap="section" @insert="addSection(sectionIndex)" />
        <h3 v-if="readOnly" class="font-bold" data-section-title>{{ section.title }}</h3>
        <div v-else data-section-heading data-section-title :data-changed="proposedSection(section) || undefined" :class="cn('group/heading relative rounded-sm font-bold outline-offset-2', proposedSection(section) && 'rounded-md bg-warning/10 ring-2 ring-warning/60', selectedSection === section.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40')" @focusin="selectSection(section.id)">
          <span v-if="proposedSection(section)" class="absolute -top-2.5 right-2 z-10 rounded-full bg-warning px-2 py-0.5 font-sans text-xs font-medium text-warning-foreground" data-change-mark>Cambió</span>
          <IconTooltip :label="`Arrastrar la sección ${section.title}`"><Button type="button" variant="ghost" size="icon-sm" data-drag-handle :draggable="!locked && !busy" :disabled="locked || busy" :aria-label="`Arrastrar la sección ${section.title}`" :class="cn('absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab font-normal text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover/heading:opacity-100', selectedSection === section.id && 'opacity-100')" @click="selectSection(section.id)" @dragstart="startDrag($event, { kind: 'section', id: section.id })" @dragend="endDrag"><GripVertical aria-hidden="true" /></Button></IconTooltip>
          <TemplateInlineText
            :ref="(element) => setTitleRef(element, section.id)"
            :model-value="section.title"
            :maxlength="180"
            :disabled="locked"
            :label="`Sección ${section.title}`"
            @update:model-value="setTitle(section, $event)"
          />
        </div>
        <ul v-if="!preview && problemsByTarget.sections[section.id]?.length" class="flex flex-col gap-1 font-sans text-xs text-destructive" :data-section-problems="section.id">
          <li v-for="(problem, index) in problemsByTarget.sections[section.id]" :key="index" class="flex items-start gap-1" data-problem><CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{{ problem.message }}</li>
        </ul>

        <ol class="flex flex-col gap-3">
          <template v-for="(field, fieldIndex) in fields" :key="field.id">
          <li :data-field="field.id" :data-field-responsible="field.quien_llena" :data-changed="proposedField(field) || undefined" :data-invalid="(!preview && Boolean(problemsByTarget.fields[field.id]?.length)) || undefined" :class="cn('relative min-w-0 rounded-sm px-2 py-1', proposedField(field) && 'rounded-md bg-warning/10 ring-2 ring-warning/60', !preview && problemsByTarget.fields[field.id]?.length && 'bg-destructive/5 ring-1 ring-destructive/60', !readOnly && ['group outline-offset-2', selectedField === field.id ? 'outline outline-2 outline-primary' : 'outline outline-1 outline-transparent hover:outline-primary/40'])">
            <span v-if="proposedField(field)" class="absolute -top-2.5 right-2 z-10 rounded-full bg-warning px-2 py-0.5 font-sans text-xs font-medium text-warning-foreground" data-change-mark>Cambió</span>
            <span v-if="!readOnly && fieldMarked(section.id, fieldIndex)" data-drop-mark class="pointer-events-none absolute inset-x-0 -top-2 z-10 h-0.5 rounded-full bg-primary" aria-hidden="true" />
            <span v-if="!readOnly && fieldIndex === fields.length - 1 && fieldMarked(section.id, fields.length)" data-drop-mark class="pointer-events-none absolute inset-x-0 -bottom-2 z-10 h-0.5 rounded-full bg-primary" aria-hidden="true" />
            <IconTooltip v-if="!readOnly" :label="`Arrastrar el campo ${fieldName(field)}`"><Button type="button" variant="ghost" size="icon-sm" data-drag-handle :draggable="!locked && !busy" :disabled="locked || busy" :aria-label="`Arrastrar el campo ${fieldName(field)}`" :class="cn('absolute -left-8 top-0 z-10 cursor-grab text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100', selectedField === field.id && 'opacity-100')" @click="selectField(field.id, null)" @dragstart="startDrag($event, { kind: 'field', id: field.id })" @dragend="endDrag"><GripVertical aria-hidden="true" /></Button></IconTooltip>
            <TemplateInsertPoint v-if="!readOnly && !locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="top" gap="field" @insert="addField(section.id, fieldIndex)" />
            <TemplateInsertPoint v-if="!readOnly && !locked && fieldIndex === fields.length - 1" :disabled="busy" :actions="[{ key: 'section', label: 'Nueva sección' }, { key: 'field', label: 'Agregar campo' }]" position="bottom" gap="field" @insert="insertAfterLastField($event, section.id, sectionIndex)" />
            <TemplateFieldContent v-if="readOnly" :field="field" :variables="variables" preview />
            <TemplateSheetField
              v-else
              :field="field"
              :locked="locked"
              :focus-on-create="focusId === field.id"
              :naming="naming === field.id"
              :variables="variables"
              @select="selectField(field.id, $event)"
              @named="naming = null"
              @update:field="setField(section.id, field.id, $event)"
            />
            <ul v-if="!preview && problemsByTarget.fields[field.id]?.length" class="mt-1 flex flex-col gap-1 font-sans text-xs text-destructive" :data-field-problems="field.id">
              <li v-for="(problem, index) in problemsByTarget.fields[field.id]" :key="index" class="flex items-start gap-1" data-problem><CircleAlert class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{{ problem.message }}</li>
            </ul>
          </li>
          </template>
        </ol>
        <p v-if="fields.length === 0 && !readOnly" :class="cn('relative rounded-sm py-1 text-sm text-muted-foreground', fieldMarked(section.id, 0) && 'outline outline-2 outline-dashed outline-primary')">Sección sin campos.<TemplateInsertPoint v-if="!locked" :disabled="busy" :actions="[{ key: 'field', label: 'Agregar campo' }]" position="inline" gap="field" @insert="addField(section.id)" /></p>
      </section>
      </template>
      <div v-if="sheetIndex === 0 && !readOnly && sections.length === 0" class="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <p>La plantilla no tiene secciones</p>
        <Button type="button" variant="outline" :disabled="locked || busy" @click="addSection()"><Plus data-icon="inline-start" aria-hidden="true" />Nueva sección</Button>
      </div>
      </div>

    </article>
    </div>

    <TemplateImpactDialog :impact="impact" @confirm="confirmImpact" @cancel="impact = null" />
    <UnsavedChangesDialog :open="leaveOpen" title="Hay cambios sin guardar" description="Los cambios de la plantilla no se guardaron. Si vuelve, los perderá" discard-label="Volver y descartar cambios" @continue="leaveOpen = false" @discard="discardAndLeave" @update:open="leaveOpen = $event" />

    <Dialog v-model:open="designOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Diseño</DialogTitle>
          <DialogDescription>Márgenes y tamaños del documento. La letra, los colores y la alineación son los institucionales</DialogDescription>
        </DialogHeader>
        <FieldGroup class="gap-4">
          <Field v-for="control in layoutControls" :key="control.key">
            <FieldLabel :for="`template-layout-${control.key}`">{{ control.label }}</FieldLabel>
            <Select :model-value="String(layoutDraft[control.key])" @update:model-value="setLayout(control.key, $event)">
              <SelectTrigger :id="`template-layout-${control.key}`"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="option in control.options" :key="option.value" :value="String(option.value)">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
    <TemplateJsonDialog v-model:open="jsonOpen" :template-id="template.id" :locked="locked" @imported="reloadAfterJson" />

    <Dialog v-model:open="editWarningOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar la plantilla</DialogTitle>
          <DialogDescription>Si guarda cambios:</DialogDescription>
          <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Al reanudar una convocatoria en pausa, sus sílabos vuelven a borrador y conservan lo escrito en los campos que siguen igual</li>
            <li>En el próximo período, los docentes no conservan lo que escribieron</li>
          </ul>
        </DialogHeader>
        <ConfirmPhrase id="template-edit-confirm" v-model="editTyped" :phrase="EDIT_PHRASE" />
        <DialogFooter>
          <Button type="button" variant="outline" @click="editWarningOpen = false">Cancelar</Button>
          <Button type="button" :disabled="!matchesPhrase(editTyped, EDIT_PHRASE)" @click="startEditing"><Pencil data-icon="inline-start" aria-hidden="true" />Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="removal !== null" @update:open="(value: boolean) => { if (!value) removal = null }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ removalShown?.kind === 'section' ? 'Eliminar sección' : 'Eliminar campo' }}</DialogTitle>
          <DialogDescription>
            {{ removalShown?.kind === 'section' ? `Se quitará «${removalShown?.name}» con sus ${removalShown?.count} campos de la plantilla` : `Se quitará «${removalShown?.name}» de la plantilla` }}
            Se aplica al guardar la plantilla
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
