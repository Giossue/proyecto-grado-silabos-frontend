<script setup lang="ts">
import {
    ArrowDown,
    ArrowUp,
    Pencil,
    Settings,
    Settings2,
    Trash2,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import type { CSSProperties } from 'vue';
import TemplateController from '@/api/template-routes';
import TemplateBlockCreator from '@/components/domain/configuration/TemplateBlockCreator.vue';
import TemplateDocumentView from '@/components/domain/configuration/TemplateDocumentView.vue';
import TemplateFieldActions from '@/components/domain/configuration/TemplateFieldActions.vue';
import TemplateInsertPopover from '@/components/domain/configuration/TemplateInsertPopover.vue';
import TemplateSectionActions from '@/components/domain/configuration/TemplateSectionActions.vue';
import TemplateTableDesigner from '@/components/domain/configuration/TemplateTableDesigner.vue';
import TemplateTitleActions from '@/components/domain/configuration/TemplateTitleActions.vue';
import TemplateToolbarButton from '@/components/domain/configuration/TemplateToolbarButton.vue';
import PaginatedDocument from '@/components/domain/PaginatedDocument.vue';
import { Button } from '@/components/ui/button';
import { defaultDocument, nodesOfType } from '@/lib/templateDocument';
import { sectionOrientation } from '@/lib/templateParts';
import { templatePreviewFields } from '@/lib/templatePreview';
import { choiceOptions, isChoiceField } from '@/lib/fieldConditions';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { apiRouter as router } from '@/lib/apiVisit';
import type {
    TemplateAppearance,
    TemplateBuilderProps,
    TemplateFieldContainer,
    TemplateSection,
} from '@/types/configuration';

const props = withDefaults(
    defineProps<{
        template: TemplateBuilderProps['template'];
        appearance: TemplateAppearance;
        blockTypes: TemplateBuilderProps['blockTypes'];
        variables: TemplateBuilderProps['variables'];
        logos: TemplateBuilderProps['logos'];
        identificationDesign: TemplateBuilderProps['identificationDesign'];
        colorOptions: TemplateBuilderProps['appearanceOptions']['colors'];
        readonly: boolean;
        ribbon?: boolean;
        fixedRibbon?: boolean;
    }>(),
    { ribbon: false },
);

const emit = defineEmits<{ personalize: [] }>();
type Editable = { openEdit: () => void; openDelete: () => void };
type TitleActions = { openEdit: () => void };
type TableDesigner = { start: () => void };
type MoveDirection = -1 | 1;
type Selection =
    | { kind: 'document' }
    | { kind: 'title' }
    | { kind: 'section'; sectionId: string }
    | { kind: 'field'; sectionId: string; blockId: string };

const selection = ref<Selection>({ kind: 'document' });
/** Partes Sí/No o de selección: las que sirven para «Mostrar solo si». */
const choiceFields = computed(() =>
    props.template.sections.flatMap((section) =>
        section.blocks.flatMap((block) =>
            block.fields
                .filter((field) => !field.inherited && isChoiceField(field))
                .map((field) => ({
                    key: field.key,
                    sectionId: section.id,
                    label: field.label.trim() || block.title.trim() || section.title,
                    options: choiceOptions(field),
                })),
        ),
    ),
);
const activeTable = ref<string | null>(null);
const reorderPending = ref(false);
const sectionActions = ref<Record<string, Editable>>({});
const fieldActions = ref<Record<string, Editable>>({});
const tableDesigners = ref<Record<string, TableDesigner>>({});
const titleActions = ref<TitleActions | null>(null);

const bindHandle = <T,>(
    collection: Record<string, T>,
    id: string,
    instance: unknown,
): void => {
    if (instance) {
        collection[id] = instance as T;

        return;
    }

    delete collection[id];
};

const selectedSection = computed<TemplateSection | null>(() => {
    const current = selection.value;

    if (current.kind !== 'section' && current.kind !== 'field') {
        return null;
    }

    return (
        props.template.sections.find(
            (section) => section.id === current.sectionId,
        ) ?? null
    );
});

const selectedField = computed<TemplateFieldContainer | null>(() => {
    const current = selection.value;

    if (current.kind !== 'field') {
        return null;
    }

    return (
        selectedSection.value?.blocks.find(
            (block) => block.id === current.blockId,
        ) ?? null
    );
});

const variableSamples = computed(() =>
    Object.fromEntries(
        props.variables.map((variable) => [variable.key, variable.sample]),
    ),
);

const titleStyle = computed<CSSProperties>(() => ({
    color: props.appearance.accent_color,
    fontFamily: props.appearance.font_family,
    fontSize: `${props.appearance.title_font_size}pt`,
    fontWeight: props.appearance.title_bold ? '700' : '400',
    fontStyle: props.appearance.title_italic ? 'italic' : 'normal',
    textAlign: props.appearance.title_alignment,
}));

const sectionStyle = computed<CSSProperties>(() => ({
    color: props.appearance.text_color,
    fontFamily: props.appearance.font_family,
    fontSize: `${props.appearance.section_font_size}pt`,
    fontWeight: props.appearance.section_bold ? '700' : '400',
    fontStyle: props.appearance.section_italic ? 'italic' : 'normal',
    textAlign: props.appearance.section_alignment,
}));

const fieldStyle = computed<CSSProperties>(() => ({
    color: props.appearance.text_color,
    fontFamily: props.appearance.font_family,
    fontSize: `${props.appearance.field_font_size}pt`,
}));

const documentFor = (block: TemplateFieldContainer) =>
    block.document ?? defaultDocument(block, props.identificationDesign);
const fieldsFor = (block: TemplateFieldContainer) =>
    templatePreviewFields(block.fields, block.table);
/** Las partes sin nombre no llevan subtítulo ni número, igual que en el Word. */
const partNumber = (section: TemplateSection, index: number): number =>
    section.blocks
        .slice(0, index + 1)
        .filter((block) => block.title.trim() !== '').length;
/** Toda parte se edita sobre la hoja: texto, listas y tablas mezclan marcas (I-155). */
const editableOnSheet = (block: TemplateFieldContainer): boolean =>
    block.content_type !== 'institutional' ||
    nodesOfType(documentFor(block), 'table').length > 0;

type SheetGroup = {
    orientation: TemplateAppearance['orientation'];
    sections: { section: TemplateSection; index: number }[];
};

/**
 * Secciones seguidas con la misma orientación comparten hojas. Una sección con
 * hoja horizontal abre su propio grupo, igual que en el documento Word.
 */
const sheetGroups = computed<SheetGroup[]>(() => {
    const groups: SheetGroup[] = [];

    props.template.sections.forEach((section, index) => {
        const orientation = sectionOrientation(
            section.blocks,
            props.appearance.orientation,
        );
        const last = groups.at(-1);

        if (last && last.orientation === orientation) {
            last.sections.push({ section, index });

            return;
        }

        groups.push({ orientation, sections: [{ section, index }] });
    });

    return groups.length > 0
        ? groups
        : [{ orientation: props.appearance.orientation, sections: [] }];
});
const groupPages = ref<number[]>([]);
const startPage = (groupIndex: number): number =>
    1 +
    groupPages.value
        .slice(0, groupIndex)
        .reduce((total, count) => total + (count ?? 1), 0);
const updateGroupPages = (groupIndex: number, count: number): void => {
    const next = [...groupPages.value];
    next[groupIndex] = count;
    groupPages.value = next;
};

const shiftedIds = (
    ids: string[],
    id: string,
    direction: MoveDirection,
): string[] | null => {
    const current = ids.indexOf(id);
    const target = current + direction;

    if (current < 0 || target < 0 || target >= ids.length) {
        return null;
    }

    const reordered = [...ids];
    [reordered[current], reordered[target]] = [
        reordered[target],
        reordered[current],
    ];

    return reordered;
};

const moveSection = (sectionId: string, direction: MoveDirection): void => {
    if (reorderPending.value) {
        return;
    }

    const sectionIds = shiftedIds(
        props.template.sections.map((section) => section.id),
        sectionId,
        direction,
    );

    if (!sectionIds) {
        return;
    }

    reorderPending.value = true;
    router.patch(
        TemplateController.reorderSections.url(props.template.id),
        { section_ids: sectionIds },
        {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success('Sección movida'),
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] ??
                        'No se pudo cambiar el orden de la sección',
                ),
            onFinish: () => {
                reorderPending.value = false;
            },
        },
    );
};

const moveField = (
    section: TemplateSection,
    blockId: string,
    direction: MoveDirection,
): void => {
    if (reorderPending.value) {
        return;
    }

    const blockIds = shiftedIds(
        section.blocks.map((block) => block.id),
        blockId,
        direction,
    );

    if (!blockIds) {
        return;
    }

    reorderPending.value = true;
    router.patch(
        TemplateController.reorderBlocks.url(props.template.id),
        { section_id: section.id, block_ids: blockIds },
        {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => toast.success('Parte movida'),
            onError: (errors) =>
                toast.error(
                    Object.values(errors)[0] ??
                        'No se pudo cambiar el orden de la parte',
                ),
            onFinish: () => {
                reorderPending.value = false;
            },
        },
    );
};

const selectSection = (sectionId: string): void => {
    if (!activeTable.value) {
        selection.value = { kind: 'section', sectionId };
    }
};

const selectTitle = (): void => {
    if (!activeTable.value) {
        selection.value = { kind: 'title' };
    }
};

const selectField = (sectionId: string, blockId: string): void => {
    if (activeTable.value && activeTable.value !== blockId) {
        return;
    }

    selection.value = { kind: 'field', sectionId, blockId };
};

const updateTableEditing = (
    sectionId: string,
    blockId: string,
    editing: boolean,
): void => {
    if (editing) {
        activeTable.value = blockId;
        selection.value = { kind: 'field', sectionId, blockId };

        return;
    }

    if (activeTable.value === blockId) {
        activeTable.value = null;
    }
};

const sectionSelectionListeners = (sectionId: string) =>
    props.readonly
        ? {}
        : {
              pointerdown: () => selectSection(sectionId),
              keydown: (event: KeyboardEvent) => {
                  if (
                      event.key === 'Enter' &&
                      event.target === event.currentTarget
                  ) {
                      selectSection(sectionId);
                  }
              },
          };

const fieldSelectionListeners = (sectionId: string, blockId: string) =>
    props.readonly || activeTable.value
        ? {}
        : {
              pointerdown: (event: PointerEvent) => {
                  event.stopPropagation();
                  selectField(sectionId, blockId);
              },
              keydown: (event: KeyboardEvent) => {
                  if (
                      event.key === 'Enter' &&
                      event.target === event.currentTarget
                  ) {
                      selectField(sectionId, blockId);
                  }
              },
          };

const clearSelectionFromBackground = (event: PointerEvent): void => {
    if (props.readonly || activeTable.value) {
        return;
    }

    const target = event.target;

    if (
        !(target instanceof Element) ||
        target.closest('[data-template-selectable]') ||
        target.closest('#template-editor-ribbon')
    ) {
        return;
    }

    selection.value = { kind: 'document' };
};
</script>

<template>
    <div
        class="min-w-0"
        :aria-label="
            readonly
                ? 'Plantilla del sílabo, solo lectura'
                : 'Constructor visual de la plantilla del sílabo'
        "
        @pointerdown.capture="clearSelectionFromBackground"
    >
        <Teleport to="body" :disabled="!fixedRibbon">
            <header
                v-if="ribbon && !readonly"
                id="template-editor-ribbon"
                aria-label="Herramientas del editor de plantilla"
                :class="
                    cn(
                        'min-w-0 bg-background/95 backdrop-blur',
                        fixedRibbon
                            ? 'fixed inset-x-0 top-0 z-40 border-b shadow-sm'
                            : 'sticky top-2 z-20 mb-4 rounded-lg border shadow-sm',
                    )
                "
            >
                <div
                    class="flex min-h-14 min-w-0 items-center gap-2 overflow-hidden px-3 py-2 sm:px-5"
                >
                    <div class="flex min-w-fit flex-1 items-center">
                        <slot name="ribbon-start" />
                    </div>

                    <div
                        id="template-editor-ribbon-tools"
                        class="flex min-w-0 items-center gap-2 overflow-x-auto"
                    >
                        <template v-if="!activeTable">
                            <Button
                                v-if="selection.kind === 'title'"
                                type="button"
                                variant="ghost"
                                size="sm"
                                @click="titleActions?.openEdit()"
                            >
                                <Pencil
                                    data-icon="inline-start"
                                    aria-hidden="true"
                                />
                                Editar título
                            </Button>
                            <template v-if="selectedSection && !selectedField">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    @click="
                                        sectionActions[
                                            selectedSection.id
                                        ]?.openEdit()
                                    "
                                >
                                    <Pencil
                                        data-icon="inline-start"
                                        aria-hidden="true"
                                    />
                                    Renombrar sección
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive hover:text-destructive"
                                    @click="
                                        sectionActions[
                                            selectedSection.id
                                        ]?.openDelete()
                                    "
                                >
                                    <Trash2
                                        data-icon="inline-start"
                                        aria-hidden="true"
                                    />
                                    Eliminar sección
                                </Button>
                            </template>

                            <template v-if="selectedField && selectedSection">
                                <Button
                                    v-if="editableOnSheet(selectedField)"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    @click="
                                        tableDesigners[
                                            selectedField.id
                                        ]?.start()
                                    "
                                >
                                    <Pencil
                                        data-icon="inline-start"
                                        aria-hidden="true"
                                    />
                                    Editar
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    @click="
                                        fieldActions[
                                            selectedField.id
                                        ]?.openEdit()
                                    "
                                >
                                    <Settings2
                                        data-icon="inline-start"
                                        aria-hidden="true"
                                    />
                                    Propiedades
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive hover:text-destructive"
                                    @click="
                                        fieldActions[
                                            selectedField.id
                                        ]?.openDelete()
                                    "
                                >
                                    <Trash2
                                        data-icon="inline-start"
                                        aria-hidden="true"
                                    />
                                    Eliminar parte
                                </Button>
                            </template>
                        </template>
                    </div>

                    <div
                        id="template-editor-ribbon-actions"
                        class="flex min-w-fit flex-1 items-center justify-end gap-2"
                    >
                        <Button
                            v-if="!activeTable"
                            type="button"
                            variant="ghost"
                            size="sm"
                            @click="emit('personalize')"
                        >
                            <Settings
                                data-icon="inline-start"
                                aria-hidden="true"
                            />
                            Documento
                        </Button>
                    </div>
                </div>
            </header>
        </Teleport>

        <div class="flex min-w-0 flex-col gap-6 overflow-x-auto p-1 pb-4">
            <PaginatedDocument
                v-for="(group, groupIndex) in sheetGroups"
                :key="groupIndex"
                :orientation="group.orientation"
                :margin-cm="appearance.margin_cm"
                :font-family="appearance.font_family"
                :font-size="appearance.body_font_size"
                :text-color="appearance.text_color"
                :start-page="startPage(groupIndex)"
                :data-sheet-orientation="group.orientation"
                @pages="updateGroupPages(groupIndex, $event)"
            >
                <template v-if="groupIndex === 0">
                <div
                    class="mb-5 flex w-full items-center justify-between gap-6"
                    :style="{
                        marginTop: `-${appearance.margin_cm * 0.4}cm`,
                    }"
                    data-page-unit
                    data-page-keep-next
                >
                    <div class="flex min-w-0 flex-1 justify-start">
                        <img
                            :src="logos.institution"
                            alt="Universidad Estatal de Bolívar"
                            class="h-auto max-h-10 max-w-full object-contain object-left"
                        />
                    </div>
                    <div class="flex min-w-0 flex-1 justify-end">
                        <img
                            :src="logos.faculty"
                            alt="Ejemplo de logo de facultad"
                            class="h-auto max-h-14 max-w-full object-contain object-right"
                        />
                    </div>
                </div>

                <TemplateTitleActions
                    v-if="!readonly"
                    :ref="
                        (instance) => {
                            titleActions = (instance as TitleActions | null) ?? null;
                        }
                    "
                    :template-id="template.id"
                    :title="template.titleBlock.text"
                />
                <div
                    v-if="!readonly"
                    class="mb-8 rounded-xs leading-tight outline-offset-4 transition-shadow"
                    :class="{
                        'cursor-pointer outline-2 outline-primary':
                            selection.kind === 'title',
                    }"
                    :aria-label="`Título ${template.titleBlock.text}`"
                    role="button"
                    :aria-pressed="selection.kind === 'title'"
                    tabindex="0"
                    data-template-selectable="title"
                    data-page-unit
                    data-page-keep-next
                    @pointerdown.stop="selectTitle"
                    @keydown.enter.self="selectTitle"
                >
                    <h1 :style="titleStyle">
                        {{ template.titleBlock.text }}
                    </h1>
                </div>
                <h1
                    v-else
                    class="mb-8 leading-tight"
                    :style="titleStyle"
                    data-page-unit
                    data-page-keep-next
                >
                    {{ template.titleBlock.text }}
                </h1>

                <div
                    v-if="template.sections.length === 0"
                    class="flex min-h-80 items-center justify-center"
                    data-page-unit
                >
                    <TemplateBlockCreator
                        v-if="!readonly"
                        :template-id="template.id"
                        :position="0"
                        :block-types="blockTypes"
                        empty
                    />
                    <p v-else class="text-center text-muted-foreground">
                        La plantilla todavía no tiene secciones.
                    </p>
                </div>
                </template>

                <section
                    v-for="{ section, index: sectionIndex } in group.sections"
                    :key="section.id"
                    data-template-selectable="section"
                    class="relative mb-6 rounded-none outline-offset-4 transition-shadow"
                    :class="{
                        'cursor-pointer outline-2 outline-primary':
                            !readonly &&
                            selection.kind === 'section' &&
                            selection.sectionId === section.id,
                    }"
                    :aria-label="`Sección ${section.title}`"
                    :role="readonly ? undefined : 'button'"
                    :aria-pressed="
                        readonly
                            ? undefined
                            : selection.kind === 'section' &&
                              selection.sectionId === section.id
                    "
                    :tabindex="readonly ? undefined : 0"
                    v-on="sectionSelectionListeners(section.id)"
                >
                    <div v-if="!readonly" class="hidden" aria-hidden="true">
                        <TemplateSectionActions
                            :ref="
                                (instance) =>
                                    bindHandle(
                                        sectionActions,
                                        section.id,
                                        instance,
                                    )
                            "
                            :template-id="template.id"
                            :section="section"
                        />
                        <TemplateFieldActions
                            :variables="variables"
                            v-for="block in section.blocks"
                            :key="block.id"
                            :ref="
                                (instance) =>
                                    bindHandle(fieldActions, block.id, instance)
                            "
                            :template-id="template.id"
                            :section-title="section.title"
                            :section-id="section.id"
                            :field="block"
                            :choice-fields="choiceFields"
                        />
                    </div>

                    <h2
                        :id="`template-section-${section.id}`"
                        class="mb-3 min-w-0 scroll-mt-40 leading-snug"
                        :style="sectionStyle"
                        data-page-unit
                        data-page-keep-next
                        tabindex="-1"
                    >
                        {{ sectionIndex + 1 }}. {{ section.title }}
                    </h2>

                    <p
                        v-if="section.blocks.length === 0"
                        class="mb-3 text-sm text-muted-foreground"
                        data-page-unit
                    >
                        Esta sección todavía no tiene partes.
                    </p>

                    <article
                        v-for="(block, fieldIndex) in section.blocks"
                        :key="block.id"
                        :id="`template-field-${block.id}`"
                        data-template-selectable="field"
                        class="relative mb-4 scroll-mt-40 rounded-none outline-offset-4 transition-shadow"
                        :class="{
                            'cursor-pointer outline-2 outline-primary':
                                !readonly &&
                                !activeTable &&
                                selection.kind === 'field' &&
                                selection.blockId === block.id,
                        }"
                        :aria-label="`Parte ${block.title.trim() || 'sin nombre'}`"
                        :role="readonly || activeTable ? undefined : 'button'"
                        :aria-pressed="
                            readonly || activeTable
                                ? undefined
                                : selection.kind === 'field' &&
                                  selection.blockId === block.id
                        "
                        :tabindex="readonly || activeTable ? undefined : 0"
                        v-on="fieldSelectionListeners(section.id, block.id)"
                    >
                        <h3
                            v-if="block.title.trim() !== ''"
                            class="mb-2 leading-snug font-semibold"
                            :style="fieldStyle"
                            data-page-unit
                            data-page-keep-next
                            tabindex="-1"
                        >
                            {{ sectionIndex + 1 }}.{{ partNumber(section, fieldIndex) }}
                            {{ block.title }}
                        </h3>

                        <TemplateTableDesigner
                            v-if="!readonly && editableOnSheet(block)"
                            :ref="
                                (instance) =>
                                    bindHandle(
                                        tableDesigners,
                                        block.id,
                                        instance,
                                    )
                            "
                            :template-id="template.id"
                            :block-id="block.id"
                            :fingerprint="block.fingerprint ?? ''"
                            :document="documentFor(block)"
                            :fields="fieldsFor(block)"
                            :variables="variables"
                            :variable-samples="variableSamples"
                            :layout="block.table"
                            :appearance="appearance"
                            :colors="colorOptions"
                            ribbon-target="#template-editor-ribbon"
                            :section-title="section.title"
                            :part-title="block.title"
                            @activate="selectField(section.id, block.id)"
                            @editing-change="
                                updateTableEditing(section.id, block.id, $event)
                            "
                        />
                        <TemplateDocumentView
                            v-else
                            :document="documentFor(block)"
                            :fields="fieldsFor(block)"
                            :variables="variableSamples"
                            :layout="block.table"
                            :font-family="appearance.font_family"
                            :font-size="appearance.body_font_size"
                            :text-color="appearance.text_color"
                            :text-align="appearance.body_alignment"
                            :table-header-background="
                                appearance.table_header_background
                            "
                            :table-header-color="appearance.table_header_color"
                            preview
                        />
                        <div
                            v-if="
                                !readonly &&
                                !activeTable &&
                                selection.kind === 'field' &&
                                selection.blockId === block.id
                            "
                            class="absolute top-1/2 -right-1 z-10 flex h-7 translate-x-1/2 -translate-y-1/2 items-center justify-center"
                            data-template-insert="content"
                            @pointerdown.stop
                            @click.stop
                        >
                            <TemplateInsertPopover
                                :template-id="template.id"
                                :section-id="section.id"
                                :field-position="fieldIndex + 1"
                                :block-position="sectionIndex + 1"
                                :block-types="blockTypes"
                            />
                            <div
                                class="absolute top-1/2 left-full ms-1 flex -translate-y-1/2 items-center gap-1"
                            >
                                <TemplateToolbarButton
                                    label="Mover parte arriba"
                                    variant="outline"
                                    :disabled="
                                        reorderPending || fieldIndex === 0
                                    "
                                    @click="moveField(section, block.id, -1)"
                                >
                                    <ArrowUp aria-hidden="true" />
                                </TemplateToolbarButton>
                                <TemplateToolbarButton
                                    label="Mover parte abajo"
                                    variant="outline"
                                    :disabled="
                                        reorderPending ||
                                        fieldIndex === section.blocks.length - 1
                                    "
                                    @click="moveField(section, block.id, 1)"
                                >
                                    <ArrowDown aria-hidden="true" />
                                </TemplateToolbarButton>
                            </div>
                        </div>
                    </article>

                    <div
                        v-if="
                            !readonly &&
                            !activeTable &&
                            selection.kind === 'section' &&
                            selection.sectionId === section.id
                        "
                        class="absolute top-1/2 -right-1 z-10 flex h-7 translate-x-1/2 -translate-y-1/2 items-center justify-center"
                        data-template-insert="content"
                        @pointerdown.stop
                        @click.stop
                    >
                        <TemplateInsertPopover
                            :template-id="template.id"
                            :section-id="section.id"
                            :field-position="section.blocks.length"
                            :block-position="sectionIndex + 1"
                            :block-types="blockTypes"
                        />
                        <div
                            class="absolute top-1/2 left-full ms-1 flex -translate-y-1/2 items-center gap-1"
                        >
                            <TemplateToolbarButton
                                label="Mover sección arriba"
                                variant="outline"
                                :disabled="reorderPending || sectionIndex === 0"
                                @click="moveSection(section.id, -1)"
                            >
                                <ArrowUp aria-hidden="true" />
                            </TemplateToolbarButton>
                            <TemplateToolbarButton
                                label="Mover sección abajo"
                                variant="outline"
                                :disabled="
                                    reorderPending ||
                                    sectionIndex ===
                                        template.sections.length - 1
                                "
                                @click="moveSection(section.id, 1)"
                            >
                                <ArrowDown aria-hidden="true" />
                            </TemplateToolbarButton>
                        </div>
                    </div>
                </section>
            </PaginatedDocument>
        </div>
    </div>
</template>
