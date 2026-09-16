<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { Palette, Pencil, Plus, Trash2, X } from "@lucide/vue";
import { ApiError } from "@/api/client";
import {
  createTemplate,
  createTemplateField,
  createTemplateSection,
  deleteTemplateBlock,
  deleteTemplateSection,
  getTemplate,
  reorderTemplateBlocks,
  reorderTemplateSections,
  updateTemplateAppearance,
  updateTemplateDocument,
  updateTemplateField,
  updateTemplateSection,
  updateTemplateTable,
  updateTemplateTitle,
  uploadInstitutionLogo,
  type TemplateAppearance,
  type TemplateBlock,
  type TemplateContentType,
  type TemplateFieldDraft,
  type TemplatePayload,
  type TemplateTableLayout,
} from "@/api/template";
import { getSession } from "@/api/session";
import TemplateFieldForm from "@/components/TemplateFieldForm.vue";
import TemplateTableDesigner from "@/components/TemplateTableDesigner.vue";
import TemplateVisualBuilder from "@/components/domain/configuration/TemplateVisualBuilder.vue";
import ProcessLockAlert from "@/components/domain/ProcessLockAlert.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { defaultDocument, type DocumentNode } from "@/lib/templateDocument";

type Panel = "appearance" | "new-section" | "new-field" | "selection" | null;
type Selection =
  | { kind: "title" }
  | { kind: "section"; sectionId: string }
  | { kind: "field"; sectionId: string; blockId: string; fieldId: string }
  | null;
type PurgeOperation = (confirmPurge: boolean) => Promise<{ message: string }>;
type PendingPurge = { operation: PurgeOperation; onSaved?: () => void };
type DeleteTarget =
  | { kind: "section"; id: string }
  | { kind: "field"; id: string };
const TemplateDocumentEditor = defineAsyncComponent(
  () => import("@/components/domain/configuration/TemplateDocumentEditor.vue"),
);

const router = useRouter();
const data = ref<TemplatePayload | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const saving = ref(false);
const editing = ref(false);
const panel = ref<Panel>(null);
const selection = ref<Selection>(null);
const title = ref("PROGRAMA DE ASIGNATURA (SÍLABO)");
const titleDraft = ref("");
const logo = ref<File | null>(null);
const appearance = ref<TemplateAppearance | null>(null);
const sectionTitleDraft = ref("");
const fieldDraft = ref<TemplateFieldDraft | null>(null);
const newFieldSectionId = ref("");

const makeKey = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const emptyField = (): TemplateFieldDraft => ({
  key: makeKey("campo"),
  label: "",
  help: "",
  content_type: "text",
  options: [],
  ai_enabled: false,
  ai_coordinator_configurable: true,
});
const newSection = reactive<{
  title: string;
  key: string;
  fields: TemplateFieldDraft[];
}>({ title: "", key: makeKey("bloque"), fields: [emptyField()] });
const newField = ref<TemplateFieldDraft>(emptyField());
const purgeOpen = ref(false);
const pendingPurge = ref<PendingPurge | null>(null);
const deleteOpen = ref(false);
const deleteTarget = ref<DeleteTarget | null>(null);
const designOpen = ref(false);
const documentEditor = ref<{ save: () => void } | null>(null);

const template = computed(() => data.value?.template ?? null);
const locked = computed(() => Boolean(data.value?.processLock));
const contentTypes = computed(() =>
  (data.value?.blockTypes ?? []) as Array<{
    value: TemplateContentType;
    label: string;
  }>,
);
const selectedSection = computed(() => {
  const sectionId = selection.value && "sectionId" in selection.value
    ? selection.value.sectionId
    : null;
  return template.value?.sections.find((section) => section.id === sectionId) ?? null;
});
const selectedBlock = computed(() => {
  const current = selection.value;
  if (current?.kind !== "field") return null;
  return selectedSection.value?.blocks.find(
    (block) => block.id === current.blockId,
  ) ?? null;
});
const selectedField = computed(() => {
  const current = selection.value;
  if (current?.kind !== "field") return null;
  return selectedBlock.value?.fields.find(
    (field) => field.id === current.fieldId,
  ) ?? null;
});
const blockContext = (blockId: string) => {
  const current = template.value;
  const section = current?.sections.find((item) => item.blocks.some((block) => block.id === blockId));
  const block = section?.blocks.find((item) => item.id === blockId);
  return section && block ? { section, block } : null;
};
const handleBuilderSelectField = (sectionId: string, blockId: string): void => {
  const field = template.value?.sections.find((section) => section.id === sectionId)?.blocks.find((block) => block.id === blockId)?.fields[0];
  if (field) selectField(sectionId, blockId, field.id);
};
const handleBuilderEditField = (blockId: string): void => {
  const context = blockContext(blockId);
  const field = context?.block.fields[0];
  if (context && field) selectField(context.section.id, blockId, field.id);
};
const handleBuilderDeleteSection = (sectionId: string): void => {
  selection.value = { kind: "section", sectionId };
  removeSelected();
};
const handleBuilderDeleteField = (blockId: string): void => {
  const context = blockContext(blockId);
  const field = context?.block.fields[0];
  if (context && field) {
    selection.value = { kind: "field", sectionId: context.section.id, blockId, fieldId: field.id };
    removeSelected();
  }
};
const handleBuilderEditTable = (blockId: string): void => {
  const context = blockContext(blockId);
  const field = context?.block.fields[0];
  if (context && field) {
    selection.value = { kind: "field", sectionId: context.section.id, blockId, fieldId: field.id };
    panel.value = "selection";
    syncSelection();
  }
};
const documentFor = (block: TemplateBlock) =>
  block.document ?? defaultDocument(
    block as Parameters<typeof defaultDocument>[0],
    data.value?.identificationDesign ?? { type: "doc", content: [] },
  );

const fieldContentTypes = computed(() => {
  const current = selectedField.value?.content_type;
  if (current === "institutional" || current === "flow") {
    return [{ value: current, label: "Institucional · solo lectura" }];
  }
  return contentTypes.value;
});

const syncSelection = (): void => {
  if (selection.value?.kind === "title") {
    titleDraft.value = title.value;
    return;
  }
  if (selection.value?.kind === "section") {
    sectionTitleDraft.value = selectedSection.value?.title ?? "";
    return;
  }
  const current = selectedField.value;
  if (current) {
    fieldDraft.value = {
      key: current.key,
      label: current.label,
      help: current.help ?? "",
      content_type: current.content_type,
      options: current.options.map((option) => ({ ...option })),
      ai_enabled: current.ai_enabled,
      ai_coordinator_configurable: current.ai_coordinator_configurable,
    };
  }
};

const load = async (): Promise<void> => {
  try {
    const session = await getSession();
    if (session.active_role?.code !== "administrador") {
      await router.replace("/panel");
      return;
    }
    data.value = await getTemplate();
    title.value = data.value.template?.titleBlock.text ?? title.value;
    appearance.value = data.value.template
      ? { ...data.value.template.appearance }
      : null;
    syncSelection();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo cargar la plantilla.";
  }
};

const run = async (
  operation: PurgeOperation,
  onSaved?: () => void,
): Promise<boolean> => {
  try {
    saving.value = true;
    error.value = null;
    let result: { message: string };
    try {
      result = await operation(false);
    } catch (reason) {
      const purgeRequired =
        reason instanceof ApiError && "purge_required" in reason.errors;
      if (!purgeRequired) {
        throw reason;
      }
      pendingPurge.value = { operation, onSaved };
      purgeOpen.value = true;
      return false;
    }
    message.value = result.message;
    await load();
    onSaved?.();
    return true;
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? Object.values(reason.errors)[0]?.[0] ?? reason.message
        : reason instanceof Error
          ? reason.message
          : "No se pudo guardar la plantilla.";
    return false;
  } finally {
    saving.value = false;
  }
};
const confirmPurge = async (): Promise<void> => {
  const pending = pendingPurge.value;
  if (!pending) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await pending.operation(true);
    message.value = result.message;
    purgeOpen.value = false;
    pendingPurge.value = null;
    await load();
    pending.onSaved?.();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? Object.values(reason.errors)[0]?.[0] ?? reason.message
        : reason instanceof Error
          ? reason.message
          : "No se pudo guardar la plantilla.";
  } finally {
    saving.value = false;
  }
};

const selectTitle = (): void => {
  if (!editing.value) return;
  selection.value = { kind: "title" };
  panel.value = "selection";
  syncSelection();
};
const selectSection = (sectionId: string): void => {
  if (!editing.value) return;
  selection.value = { kind: "section", sectionId };
  panel.value = "selection";
  syncSelection();
};
const selectField = (
  sectionId: string,
  blockId: string,
  fieldId: string,
): void => {
  if (!editing.value) return;
  selection.value = { kind: "field", sectionId, blockId, fieldId };
  panel.value = "selection";
  syncSelection();
};
const closePanel = (): void => {
  panel.value = null;
};
const startEditing = (): void => {
  if (locked.value) return;
  editing.value = true;
  selection.value = null;
};
const stopEditing = (): void => {
  editing.value = false;
  selection.value = null;
  panel.value = null;
};

const openNewSection = (): void => {
  newSection.title = "";
  newSection.key = makeKey("bloque");
  newSection.fields = [emptyField()];
  panel.value = "new-section";
};
const openNewField = (sectionId?: string): void => {
  newFieldSectionId.value = sectionId ?? selectedSection.value?.id ?? "";
  newField.value = emptyField();
  panel.value = "new-field";
};
const addSectionField = (): void => {
  newSection.fields.push(emptyField());
};
const createSection = (): void => {
  if (!template.value) return;
  void run((confirmPurge) =>
    createTemplateSection(template.value!.id, {
      title: newSection.title,
      key: newSection.key,
      fields: newSection.fields.map((item) => ({
        key: item.key,
        label: item.label,
        help: item.help || null,
        content_type: item.content_type,
        options:
          item.content_type === "multiple_choice" ? item.options : undefined,
        ai_enabled: item.ai_enabled,
        ai_coordinator_configurable: item.ai_coordinator_configurable,
      })),
      confirm_purge: confirmPurge,
    }),
  ).then((saved) => {
    if (saved) closePanel();
  });
};
const createField = (): void => {
  if (!template.value) return;
  const draft = newField.value;
  void run((confirmPurge) =>
    createTemplateField(template.value!.id, {
      section_id: newFieldSectionId.value,
      key: draft.key,
      label: draft.label,
      help: draft.help || null,
      content_type: draft.content_type,
      options: draft.content_type === "multiple_choice" ? draft.options : null,
      ai_enabled: draft.ai_enabled,
      ai_coordinator_configurable: draft.ai_coordinator_configurable,
      confirm_purge: confirmPurge,
    }),
  ).then((saved) => {
    if (saved) closePanel();
  });
};
const saveSelection = (): void => {
  if (!template.value || !selection.value) return;
  if (selection.value.kind === "title") {
    void run((confirmPurge) =>
      updateTemplateTitle(template.value!.id, titleDraft.value, confirmPurge),
    );
    return;
  }
  if (selection.value.kind === "section" && selectedSection.value) {
    const sectionId = selectedSection.value.id;
    void run((confirmPurge) =>
      updateTemplateSection(template.value!.id, sectionId, {
        title: sectionTitleDraft.value,
        confirm_purge: confirmPurge,
      }),
    );
    return;
  }
  if (
    selection.value.kind === "field" &&
    selectedField.value &&
    fieldDraft.value
  ) {
    const current = selectedField.value;
    const draft = fieldDraft.value;
    void run((confirmPurge) =>
      updateTemplateField(template.value!.id, current.id, {
        block_id: current.block_id,
        key: draft.key,
        label: draft.label,
        help: draft.help || null,
        content_type: draft.content_type,
        options: draft.content_type === "multiple_choice" ? draft.options : null,
        required: true,
        inherited: current.inherited,
        master_source: current.master_source,
        teacher_editable: current.teacher_editable,
        ai_enabled: draft.ai_enabled,
        ai_coordinator_configurable: draft.ai_coordinator_configurable,
        confirm_purge: confirmPurge,
      }),
    );
  }
};

const shift = (ids: string[], index: number, offset: number): string[] | null => {
  const target = index + offset;
  if (target < 0 || target >= ids.length) return null;
  const reordered = [...ids];
  [reordered[index], reordered[target]] = [
    reordered[target]!,
    reordered[index]!,
  ];
  return reordered;
};
const moveSection = (index: number, offset: number): void => {
  if (!template.value) return;
  const ids = shift(
    template.value.sections.map((item) => item.id),
    index,
    offset,
  );
  if (ids) {
    void run((confirmPurge) =>
      reorderTemplateSections(
        template.value!.id,
        ids.concat([]).map(String),
        confirmPurge,
      ),
    );
  }
};
const moveBlock = (
  sectionId: string,
  blocks: TemplateBlock[],
  index: number,
  offset: number,
): void => {
  if (!template.value) return;
  const ids = shift(
    blocks.map((item) => item.id),
    index,
    offset,
  );
  if (ids) {
    void run((confirmPurge) =>
      reorderTemplateBlocks(
        template.value!.id,
        sectionId,
        ids.concat([]),
        confirmPurge,
      ),
    );
  }
};
const removeSelected = (): void => {
  if (!template.value || !selection.value) return;
  if (
    selection.value.kind === "section" &&
    selectedSection.value
  ) {
    deleteTarget.value = { kind: "section", id: selectedSection.value.id };
    deleteOpen.value = true;
  }
  if (
    selection.value.kind === "field" &&
    selectedBlock.value
  ) {
    deleteTarget.value = { kind: "field", id: selectedBlock.value.id };
    deleteOpen.value = true;
  }
};
const confirmDelete = (): void => {
  if (!template.value || !deleteTarget.value) return;
  const target = deleteTarget.value;
  void run(
    (confirmPurge) =>
      target.kind === "section"
        ? deleteTemplateSection(template.value!.id, target.id, confirmPurge)
        : deleteTemplateBlock(template.value!.id, target.id, confirmPurge),
    () => {
      deleteOpen.value = false;
      deleteTarget.value = null;
      selection.value = null;
      closePanel();
    },
  );
};
const saveTable = (
  block: TemplateBlock,
  layout: TemplateTableLayout & { fingerprint: string },
): void => {
  if (!template.value) return;
  void run((confirmPurge) =>
    updateTemplateTable(template.value!.id, block.id, {
      ...layout,
      confirm_purge: confirmPurge,
    }),
  );
};
const openDocumentDesign = (): void => {
  if (selectedBlock.value) {
    designOpen.value = true;
  }
};
const saveDocument = (document: DocumentNode): void => {
  if (!template.value || !selectedBlock.value) return;
  const block = selectedBlock.value;
  void run(
    (confirmPurge) =>
      updateTemplateDocument(template.value!.id, block.id, {
        document,
        fingerprint: block.fingerprint,
        confirm_purge: confirmPurge,
      }),
    () => {
      designOpen.value = false;
    },
  );
};
const saveAppearance = (): void => {
  if (!template.value || !appearance.value) return;
  void run((confirmPurge) =>
    updateTemplateAppearance(
      template.value!.id,
      appearance.value!,
      confirmPurge,
    ),
  );
};
const uploadLogo = (): void => {
  if (logo.value) void run(() => uploadInstitutionLogo(logo.value!));
};

onMounted(() => void load());
</script>

<template>
  <main :class="editing ? 'min-h-dvh min-w-0 bg-muted/30' : 'flex min-w-0 flex-col gap-6 overflow-x-clip p-4 sm:p-6'">
    <header v-if="!editing" class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="max-w-3xl text-muted-foreground">Hoja base que usarán todos los sílabos. Los cambios conservan las revisiones ya enviadas.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="template"
          type="button"
          :disabled="locked"
          @click="startEditing"
        >
          <Pencil aria-hidden="true" />
          Editar plantilla
        </Button>
      </div>
    </header>

    <header v-else class="sticky top-0 z-30 grid min-h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:px-5" aria-label="Herramientas del editor de plantilla">
      <Button class="justify-self-start" type="button" size="sm" variant="outline" @click="stopEditing">Salir de edición</Button>
      <strong class="truncate text-sm">Editar plantilla</strong>
      <div class="flex flex-wrap justify-self-end gap-2">
        <Button type="button" size="sm" variant="outline" @click="openNewSection"><Plus aria-hidden="true" />Agregar bloque</Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="!template?.sections.length"
          @click="openNewField()"
        >
          <Plus aria-hidden="true" />Agregar campo
        </Button>
        <Button type="button" size="sm" variant="outline" @click="panel = 'appearance'"><Palette aria-hidden="true" />Personalizar</Button>
        <Button
          v-if="selection?.kind === 'section' || selection?.kind === 'field'"
          type="button"
          size="sm"
          variant="destructive"
          @click="removeSelected"
        >
          <Trash2 aria-hidden="true" />Eliminar
        </Button>
      </div>
    </header>

    <ProcessLockAlert
      v-if="data?.processLock"
      title="Plantilla protegida durante la convocatoria"
      :reason="data.processLock"
    />
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>

    <Empty v-if="data && !template" class="min-h-60 border-0">
      <EmptyHeader><EmptyMedia variant="icon"><Plus aria-hidden="true" /></EmptyMedia><EmptyTitle>No existe una plantilla</EmptyTitle><EmptyDescription>Créela para cargar la estructura institucional base.</EmptyDescription></EmptyHeader>
      <Button
        :disabled="saving || locked"
        @click="run(() => createTemplate())"
      >
        Crear plantilla institucional
      </Button>
    </Empty>

    <section
      v-else-if="template"
      class="grid min-w-0 gap-5 px-4 py-5 sm:px-6"
      :class="panel ? 'xl:grid-cols-[minmax(0,1fr)_24rem]' : ''"
    >
      <TemplateVisualBuilder
        v-if="appearance && template"
        :template="template"
        :appearance="appearance"
        :variables="data?.variables ?? []"
        :logos="data?.logos"
        :identification-design="data?.identificationDesign"
        :readonly="!editing"
        :ribbon="editing"
        :fixed-ribbon="editing"
        @personalize="panel = 'appearance'"
        @select-title="selectTitle"
        @select-section="selectSection"
        @select-field="handleBuilderSelectField"
        @edit-title="selectTitle"
        @edit-section="selectSection"
        @edit-field="handleBuilderEditField"
        @delete-section="handleBuilderDeleteSection"
        @delete-field="handleBuilderDeleteField"
        @edit-table="handleBuilderEditTable"
        @add-field="openNewField"
        @add-block="openNewSection"
        @move-section="(sectionId, direction) => moveSection(template?.sections.findIndex((item) => item.id === sectionId) ?? -1, direction)"
        @move-field="(sectionId, blockId, direction) => {
          const section = template?.sections.find((item) => item.id === sectionId);
          if (section) moveBlock(sectionId, section.blocks, section.blocks.findIndex((item) => item.id === blockId), direction);
        }"
      />
      <!-- The previous bespoke renderer remains documented in history; the canonical
           paginated builder above is now the only active template surface. -->
      <!--
      <article
        class="mx-auto min-h-[70rem] max-w-full overflow-hidden bg-white shadow-surface ring-1 ring-black/10"
        :style="{
          fontFamily: appearance?.font_family,
          fontSize: `${appearance?.body_font_size ?? 11}pt`,
          color: appearance?.text_color,
          textAlign: appearance?.body_alignment as 'left' | 'center' | 'right' | 'justify',
          width: appearance?.orientation === 'landscape' ? '70rem' : '52rem',
          padding: `${appearance?.margin_cm ?? 2.5}cm`,
        }"
      >
        <header class="grid grid-cols-[7rem_minmax(0,1fr)_7rem] items-center gap-6 pb-10">
          <img v-if="data?.logos" class="max-h-16 max-w-28 object-contain" :src="data.logos.institution" alt="Logo institucional" />
          <button
            type="button"
            class="min-w-0 rounded px-3 py-2 text-center outline-none transition hover:bg-muted/20 disabled:pointer-events-none"
            :class="{ 'ring-2 ring-primary': selection?.kind === 'title' }"
            :disabled="!editing"
            :style="{
              color: appearance?.accent_color,
              fontSize: `${appearance?.title_font_size ?? 16}pt`,
              fontWeight: appearance?.title_bold ? '700' : '400',
              fontStyle: appearance?.title_italic ? 'italic' : 'normal',
              textAlign: appearance?.title_alignment as 'left' | 'center' | 'right',
            }"
            @click="selectTitle"
          >
            {{ title }}
          </button>
          <img v-if="data?.logos" class="max-h-16 max-w-28 object-contain" :src="data.logos.faculty" alt="Logo de facultad" />
        </header>

        <article
          v-for="(item, sectionIndex) in template.sections"
          :key="item.id"
          class="relative mt-7 space-y-4 rounded-md outline-none ring-primary/40 transition"
          :class="{ 'ring-2 ring-primary': selection?.kind === 'section' && selection.sectionId === item.id }"
        >
          <header class="flex items-start justify-between gap-3">
            <button
              type="button"
              :disabled="!editing"
              :style="{
                color: appearance?.accent_color,
                fontSize: `${appearance?.section_font_size ?? 13}pt`,
                fontWeight: appearance?.section_bold ? '700' : '400',
                fontStyle: appearance?.section_italic ? 'italic' : 'normal',
                textAlign: appearance?.section_alignment as 'left' | 'center' | 'right',
              }"
              @click="selectSection(item.id)"
            >
              {{ sectionIndex + 1 }}. {{ item.title }}
            </button>
            <span v-if="editing" class="flex shrink-0 gap-1 rounded-md border bg-white p-1 shadow-sm">
              <button
                class="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                type="button"
                aria-label="Mover bloque hacia arriba"
                :disabled="sectionIndex === 0 || saving"
                @click="moveSection(sectionIndex, -1)"
              >
                <ArrowUp class="size-4" aria-hidden="true" />
              </button>
              <button
                class="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                type="button"
                aria-label="Mover bloque hacia abajo"
                :disabled="sectionIndex === template.sections.length - 1 || saving"
                @click="moveSection(sectionIndex, 1)"
              >
                <ArrowDown class="size-4" aria-hidden="true" />
              </button>
              <button class="inline-flex size-7 items-center justify-center rounded hover:bg-muted" type="button" aria-label="Agregar campo" @click="openNewField(item.id)"><Plus class="size-4" aria-hidden="true" /></button>
            </span>
          </header>

          <article
            v-for="(block, blockIndex) in item.blocks"
            :key="block.id"
            class="relative space-y-3"
          >
            <div
              v-if="data?.identificationDesign"
              class="relative rounded-md p-2 outline-none ring-primary/40 transition"
              :class="{
                'ring-2 ring-primary':
                  selection?.kind === 'field' && selection.blockId === block.id,
              }"
              :style="{ fontSize: `${appearance?.field_font_size ?? 11}pt` }"
              role="button"
              tabindex="0"
              @click="block.fields[0] && selectField(item.id, block.id, block.fields[0].id)"
              @keydown.enter.prevent="block.fields[0] && selectField(item.id, block.id, block.fields[0].id)"
              @keydown.space.prevent="block.fields[0] && selectField(item.id, block.id, block.fields[0].id)"
            >
              <TemplateDocumentView
                :document="documentFor(block)"
                :fields="block.fields"
                :variables="documentVariables"
                :layout="block.table"
                preview
              />
              <span v-if="editing" class="absolute top-1 right-1 flex gap-1 rounded-md border bg-white p-1 shadow-sm">
                <button
                  class="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                  type="button"
                  aria-label="Mover campo hacia arriba"
                  :disabled="blockIndex === 0 || saving"
                  @click.stop="moveBlock(item.id, item.blocks, blockIndex, -1)"
                >
                  <ArrowUp class="size-4" aria-hidden="true" />
                </button>
                <button
                  class="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                  type="button"
                  aria-label="Mover campo hacia abajo"
                  :disabled="blockIndex === item.blocks.length - 1 || saving"
                  @click.stop="moveBlock(item.id, item.blocks, blockIndex, 1)"
                >
                  <ArrowDown class="size-4" aria-hidden="true" />
                </button>
              </span>
            </div>
            <div
              v-else
              v-for="itemField in block.fields"
              :key="itemField.id"
              class="relative space-y-3 rounded-md p-2 outline-none ring-primary/40 transition"
              :style="{ fontSize: `${appearance?.field_font_size ?? 11}pt` }"
              :class="{
                'ring-2 ring-primary':
                  selection?.kind === 'field' &&
                  selection.fieldId === itemField.id,
              }"
            >
              <button
                type="button"
                class="grid w-full gap-1 rounded p-1 text-left outline-none hover:bg-muted/30 disabled:pointer-events-none"
                :disabled="!editing"
                @click="selectField(item.id, block.id, itemField.id)"
              >
                <strong v-if="item.blocks.length > 1 || block.fields.length > 1">
                  {{ sectionIndex + 1 }}.{{ blockIndex + 1 }} {{ itemField.label }}
                </strong>
                <span v-if="itemField.help">{{ itemField.help }}</span>
              </button>
              <div v-if="itemField.content_type === 'boolean'" class="flex gap-5 rounded border border-dashed p-3 text-muted-foreground">
                <span>□ Sí</span><span>□ No</span>
              </div>
              <div
                v-else-if="itemField.content_type === 'multiple_choice'"
                class="flex flex-wrap gap-5 rounded border border-dashed p-3 text-muted-foreground"
              >
                <span v-for="option in itemField.options" :key="option.value">
                  □ {{ option.label }}
                </span>
              </div>
              <table
                v-else-if="itemField.content_type === 'table' && block.table"
                class="w-full border-collapse text-left [&_td]:border [&_td]:border-neutral-400 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-400 [&_th]:p-2"
              >
                <thead>
                  <tr>
                    <th
                      v-for="column in block.table.columns"
                      :key="column.key"
                      :style="{
                        backgroundColor: appearance?.table_header_background,
                        color: appearance?.table_header_color,
                      }"
                    >
                      {{ column.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td v-for="column in block.table.columns" :key="column.key">
                      &nbsp;
                    </td>
                  </tr>
                </tbody>
              </table>
              <ul v-else-if="itemField.content_type === 'bulleted_list'">
                <li>Elemento que completará el docente</li>
              </ul>
              <ol v-else-if="itemField.content_type === 'numbered_list'">
                <li>Elemento que completará el docente</li>
              </ol>
              <div v-else class="min-h-10 rounded border border-dashed p-3 text-muted-foreground">Texto que completará el docente.</div>
              <span v-if="editing" class="absolute top-1 right-1 flex gap-1 rounded-md border bg-white p-1 shadow-sm">
                <button
                  class="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                  type="button"
                  aria-label="Mover campo hacia arriba"
                  :disabled="blockIndex === 0 || saving"
                  @click="moveBlock(item.id, item.blocks, blockIndex, -1)"
                >
                  <ArrowUp class="size-4" aria-hidden="true" />
                </button>
                <button
                  class="inline-flex size-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
                  type="button"
                  aria-label="Mover campo hacia abajo"
                  :disabled="blockIndex === item.blocks.length - 1 || saving"
                  @click="moveBlock(item.id, item.blocks, blockIndex, 1)"
                >
                  <ArrowDown class="size-4" aria-hidden="true" />
                </button>
              </span>
            </div>
          </article>
        </article>
      </article>

      -->
      <aside
        v-if="panel"
        class="sticky top-20 h-[calc(100dvh-6rem)] overflow-hidden rounded-xl bg-card shadow-menu ring-1 ring-surface-ring [&_form>label]:grid [&_form>label]:gap-2 [&_form>label]:text-sm [&_form>label]:font-medium [&_form>label>input]:h-9 [&_form>label>input]:w-full [&_form>label>input]:rounded-md [&_form>label>input]:border [&_form>label>input]:border-input [&_form>label>input]:bg-transparent [&_form>label>input]:px-3 [&_form>label>input]:text-sm [&_form>label>select]:h-9 [&_form>label>select]:w-full [&_form>label>select]:rounded-md [&_form>label>select]:border [&_form>label>select]:border-input [&_form>label>select]:bg-transparent [&_form>label>select]:px-3"
        aria-label="Propiedades de plantilla"
      >
        <header class="flex items-start justify-between gap-3 border-b p-5">
          <div class="grid gap-1">
            <strong>
              {{
                panel === 'appearance'
                  ? 'Personalizar plantilla'
                  : panel === 'new-section'
                    ? 'Nuevo bloque'
                    : panel === 'new-field'
                      ? 'Nuevo campo'
                      : 'Propiedades'
              }}
            </strong>
            <small class="text-muted-foreground">Los cambios afectan únicamente borradores no enviados.</small>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Cerrar propiedades" @click="closePanel"><X aria-hidden="true" /></Button>
        </header>

        <form
          v-if="panel === 'new-section'"
          class="relative grid max-h-[calc(100dvh-11rem)] gap-5 overflow-y-auto p-5 pb-24"
          @submit.prevent="createSection"
        >
          <label>
            Nombre del bloque <span aria-label="obligatorio">*</span>
            <input v-model="newSection.title" required maxlength="180" />
          </label>
          <label>
            Clave <span aria-label="obligatorio">*</span>
            <input v-model="newSection.key" required pattern="[a-z][a-z0-9_]*" />
          </label>
          <fieldset
            v-for="(draft, index) in newSection.fields"
            :key="index"
            class="new-section-field grid gap-4 rounded-lg border p-4"
          >
            <legend>Campo {{ index + 1 }}</legend>
            <TemplateFieldForm
              v-model="newSection.fields[index]!"
              :content-types="contentTypes"
            />
            <Button
              v-if="newSection.fields.length > 1"
              type="button"
              size="sm"
              variant="ghost"
              @click="newSection.fields.splice(index, 1)"
            >
              Quitar campo
            </Button>
          </fieldset>
          <Button class="w-fit" type="button" variant="outline" @click="addSectionField"><Plus aria-hidden="true" />Agregar otro campo</Button>
          <footer class="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-card p-4">
            <Button type="button" variant="outline" @click="closePanel">Cancelar</Button>
            <Button :disabled="saving">Crear bloque</Button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'new-field'"
          class="relative grid max-h-[calc(100dvh-11rem)] gap-5 overflow-y-auto p-5 pb-24"
          @submit.prevent="createField"
        >
          <label>
            Bloque <span aria-label="obligatorio">*</span>
            <select v-model="newFieldSectionId" required>
              <option value="">Seleccione</option>
              <option v-for="item in template.sections" :key="item.id" :value="item.id">
                {{ item.title }}
              </option>
            </select>
          </label>
          <TemplateFieldForm v-model="newField" :content-types="contentTypes" />
          <footer class="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-card p-4">
            <Button type="button" variant="outline" @click="closePanel">Cancelar</Button>
            <Button :disabled="saving">Agregar campo</Button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'appearance' && appearance && data?.appearanceOptions"
          class="relative grid max-h-[calc(100dvh-11rem)] gap-5 overflow-y-auto p-5 pb-24"
          @submit.prevent="saveAppearance"
        >
          <label>
            Fuente
            <select v-model="appearance.font_family">
              <option
                v-for="option in data.appearanceOptions.fonts"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            Tamaño de contenido
            <select v-model="appearance.body_font_size">
              <option
                v-for="option in data.appearanceOptions.body_sizes"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            Tamaño del título
            <select v-model="appearance.title_font_size">
              <option
                v-for="option in data.appearanceOptions.title_sizes"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            Tamaño de bloques
            <select v-model="appearance.section_font_size">
              <option
                v-for="option in data.appearanceOptions.section_sizes"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            Márgenes
            <select v-model="appearance.margin_cm">
              <option
                v-for="option in data.appearanceOptions.margins"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            Orientación
            <select v-model="appearance.orientation">
              <option
                v-for="option in data.appearanceOptions.orientations"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            Logo institucional
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="logo = ($event.target as HTMLInputElement).files?.[0] ?? null"
            />
          </label>
          <Button class="w-fit" type="button" variant="outline" :disabled="!logo || saving" @click="uploadLogo">
            Subir logo
          </Button>
          <footer class="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-card p-4">
            <Button type="button" variant="outline" @click="closePanel">Cancelar</Button>
            <Button :disabled="saving">Guardar apariencia</Button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'selection' && selection?.kind === 'title'"
          class="relative grid max-h-[calc(100dvh-11rem)] gap-5 overflow-y-auto p-5 pb-24"
          @submit.prevent="saveSelection"
        >
          <label>
            Título institucional <span aria-label="obligatorio">*</span>
            <input v-model="titleDraft" required maxlength="180" />
          </label>
          <footer class="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-card p-4">
            <Button type="button" variant="outline" @click="closePanel">Cancelar</Button>
            <Button :disabled="saving">Guardar título</Button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'selection' && selection?.kind === 'section'"
          class="relative grid max-h-[calc(100dvh-11rem)] gap-5 overflow-y-auto p-5 pb-24"
          @submit.prevent="saveSelection"
        >
          <label>
            Nombre del bloque <span aria-label="obligatorio">*</span>
            <input v-model="sectionTitleDraft" required maxlength="180" />
          </label>
          <footer class="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-card p-4">
            <Button type="button" variant="outline" @click="closePanel">Cancelar</Button>
            <Button :disabled="saving">Guardar bloque</Button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'selection' && selectedField && fieldDraft"
          class="relative grid max-h-[calc(100dvh-11rem)] gap-5 overflow-y-auto p-5 pb-24"
          @submit.prevent="saveSelection"
        >
          <p class="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Campo obligatorio{{ selectedField.inherited ? ' · institucional' : '' }}
          </p>
          <TemplateFieldForm
            v-model="fieldDraft"
            :content-types="fieldContentTypes"
            :type-locked="selectedField.inherited"
            :ai-available="!selectedField.inherited"
          />
          <Button type="button" variant="outline" :disabled="saving" @click="openDocumentDesign">
            Editar diseño del documento
          </Button>
          <TemplateTableDesigner
            v-if="selectedBlock?.content_type === 'table' && selectedBlock.table"
            :layout="selectedBlock.table"
            :fingerprint="selectedBlock.fingerprint"
            :saving="saving"
            @save="saveTable(selectedBlock!, $event)"
          />
          <footer class="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t bg-card p-4">
            <Button type="button" variant="outline" @click="closePanel">Cancelar</Button>
            <Button :disabled="saving">Guardar campo</Button>
          </footer>
        </form>
      </aside>
    </section>
    <p v-else-if="!error">Cargando plantilla…</p>

    <Dialog v-model:open="deleteOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ deleteTarget?.kind === 'section' ? 'Eliminar bloque' : 'Eliminar campo' }}</DialogTitle>
          <DialogDescription>
            {{ deleteTarget?.kind === 'section'
              ? 'Se eliminará el bloque y todos sus campos de la plantilla.'
              : 'Se eliminará este campo de la plantilla.' }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button type="button" variant="destructive" :disabled="saving" @click="confirmDelete">Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="purgeOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar actualización de la plantilla</DialogTitle>
          <DialogDescription>
            Este cambio descartará los borradores no enviados que resulten afectados. Las revisiones enviadas se conservarán.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="saving">Cancelar</Button></DialogClose>
          <Button type="button" variant="destructive" :disabled="saving" @click="confirmPurge">Continuar y descartar borradores</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <section
      v-if="designOpen"
      class="fixed inset-0 z-50 flex min-w-0 flex-col bg-muted/30"
      aria-label="Editor de diseño de plantilla"
    >
      <header class="sticky top-0 z-10 grid min-h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:px-5">
        <Button class="justify-self-start" type="button" size="sm" variant="outline" :disabled="saving" @click="designOpen = false">Salir del diseño</Button>
        <strong class="truncate text-sm">{{ selectedBlock?.title }}</strong>
        <div class="flex justify-self-end gap-2">
          <Button type="button" size="sm" :disabled="saving" @click="documentEditor?.save()">Guardar diseño</Button>
        </div>
      </header>
      <div class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <article class="mx-auto min-h-[70rem] w-full max-w-[52rem] bg-white p-8 shadow-surface ring-1 ring-black/10 sm:p-12">
          <p class="mb-5 text-sm text-muted-foreground">
            Use clic derecho para insertar campos del docente, datos automáticos y tablas; el menú también ofrece formato y propiedades de celda.
          </p>
          <TemplateDocumentEditor
            v-if="selectedBlock"
            :key="`${selectedBlock.id}-${selectedBlock.fingerprint}`"
            ref="documentEditor"
            :document="documentFor(selectedBlock)"
            :variables="data?.variables ?? []"
            :field-keys="selectedBlock.fields.map((field) => field.key)"
            :pending="saving"
            @save="saveDocument"
          />
        </article>
      </div>
    </section>
  </main>
</template>
