<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
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

type Panel = "appearance" | "new-section" | "new-field" | "selection" | null;
type Selection =
  | { kind: "title" }
  | { kind: "section"; sectionId: string }
  | { kind: "field"; sectionId: string; blockId: string; fieldId: string }
  | null;

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
  operation: (confirmPurge: boolean) => Promise<{ message: string }>,
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
      if (
        !purgeRequired ||
        !window.confirm(
          "Este cambio descartará borradores no enviados afectados. Las revisiones enviadas se conservarán. ¿Desea continuar?",
        )
      ) {
        throw reason;
      }
      result = await operation(true);
    }
    message.value = result.message;
    await load();
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
    selectedSection.value &&
    window.confirm("Se eliminará el bloque y todos sus campos. ¿Desea continuar?")
  ) {
    const sectionId = selectedSection.value.id;
    void run((confirmPurge) =>
      deleteTemplateSection(template.value!.id, sectionId, confirmPurge),
    ).then((removed) => {
      if (removed) {
        selection.value = null;
        closePanel();
      }
    });
  }
  if (
    selection.value.kind === "field" &&
    selectedBlock.value &&
    window.confirm("Se eliminará este campo de la plantilla. ¿Desea continuar?")
  ) {
    const blockId = selectedBlock.value.id;
    void run((confirmPurge) =>
      deleteTemplateBlock(template.value!.id, blockId, confirmPurge),
    ).then((removed) => {
      if (removed) {
        selection.value = null;
        closePanel();
      }
    });
  }
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
  <main class="app-page template-page" :class="{ 'is-editing': editing }">
    <header v-if="!editing" class="app-header">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Plantilla institucional</h1>
        <p>Vista del documento que usarán todos los sílabos.</p>
      </div>
      <div class="header-actions">
        <button
          v-if="template"
          type="button"
          :disabled="locked"
          @click="startEditing"
        >
          Editar plantilla
        </button>
        <RouterLink class="back-link" to="/panel">Volver al panel</RouterLink>
      </div>
    </header>

    <header v-else class="template-ribbon">
      <button type="button" @click="stopEditing">Salir de edición</button>
      <strong>Editar plantilla</strong>
      <div>
        <button type="button" @click="openNewSection">Agregar bloque</button>
        <button
          type="button"
          :disabled="!template?.sections.length"
          @click="openNewField()"
        >
          Agregar campo
        </button>
        <button type="button" @click="panel = 'appearance'">
          Personalizar
        </button>
        <button
          v-if="selection?.kind === 'section' || selection?.kind === 'field'"
          type="button"
          class="danger-button"
          @click="removeSelected"
        >
          Eliminar
        </button>
      </div>
    </header>

    <p v-if="data?.processLock" class="feedback error" role="alert">
      {{ data.processLock }}
    </p>
    <p v-if="message" class="save-status">{{ message }}</p>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>

    <section v-if="data && !template" class="detail-card">
      <h2>No existe una plantilla</h2>
      <p>Créela para cargar la estructura institucional base.</p>
      <button
        :disabled="saving || locked"
        @click="run(() => createTemplate())"
      >
        Crear plantilla institucional
      </button>
    </section>

    <section
      v-else-if="template"
      class="template-workspace"
      :class="{ 'with-inspector': panel }"
    >
      <article
        class="template-paper"
        :style="{
          fontFamily: appearance?.font_family,
          fontSize: `${appearance?.body_font_size ?? 11}pt`,
          color: appearance?.text_color,
          textAlign: appearance?.body_alignment as 'left' | 'center' | 'right' | 'justify',
          width: appearance?.orientation === 'landscape' ? '70rem' : '52rem',
          padding: `${appearance?.margin_cm ?? 2.5}cm`,
        }"
      >
        <header class="document-heading">
          <img v-if="data?.logos" :src="data.logos.institution" alt="Logo institucional" />
          <button
            type="button"
            class="template-title"
            :class="{ selected: selection?.kind === 'title' }"
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
          <img v-if="data?.logos" :src="data.logos.faculty" alt="Logo de facultad" />
        </header>

        <article
          v-for="(item, sectionIndex) in template.sections"
          :key="item.id"
          class="document-section"
          :class="{ selected: selection?.kind === 'section' && selection.sectionId === item.id }"
        >
          <header class="document-section-heading">
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
            <span v-if="editing" class="document-order-actions">
              <button
                type="button"
                aria-label="Mover bloque hacia arriba"
                :disabled="sectionIndex === 0 || saving"
                @click="moveSection(sectionIndex, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Mover bloque hacia abajo"
                :disabled="sectionIndex === template.sections.length - 1 || saving"
                @click="moveSection(sectionIndex, 1)"
              >
                ↓
              </button>
              <button type="button" @click="openNewField(item.id)">＋</button>
            </span>
          </header>

          <article
            v-for="(block, blockIndex) in item.blocks"
            :key="block.id"
            class="document-block"
          >
            <div
              v-for="itemField in block.fields"
              :key="itemField.id"
              class="template-field-preview"
              :style="{ fontSize: `${appearance?.field_font_size ?? 11}pt` }"
              :class="{
                selected:
                  selection?.kind === 'field' &&
                  selection.fieldId === itemField.id,
              }"
            >
              <button
                type="button"
                class="template-field-select"
                :disabled="!editing"
                @click="selectField(item.id, block.id, itemField.id)"
              >
                <strong v-if="item.blocks.length > 1 || block.fields.length > 1">
                  {{ sectionIndex + 1 }}.{{ blockIndex + 1 }} {{ itemField.label }}
                </strong>
                <span v-if="itemField.help">{{ itemField.help }}</span>
              </button>
              <div v-if="itemField.content_type === 'boolean'" class="boolean-preview">
                <span>□ Sí</span><span>□ No</span>
              </div>
              <div
                v-else-if="itemField.content_type === 'multiple_choice'"
                class="choice-preview"
              >
                <span v-for="option in itemField.options" :key="option.value">
                  □ {{ option.label }}
                </span>
              </div>
              <table
                v-else-if="itemField.content_type === 'table' && block.table"
                class="template-table-preview"
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
              <div v-else class="text-preview">Texto que completará el docente.</div>
              <span v-if="editing" class="document-order-actions field-order">
                <button
                  type="button"
                  aria-label="Mover campo hacia arriba"
                  :disabled="blockIndex === 0 || saving"
                  @click="moveBlock(item.id, item.blocks, blockIndex, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Mover campo hacia abajo"
                  :disabled="blockIndex === item.blocks.length - 1 || saving"
                  @click="moveBlock(item.id, item.blocks, blockIndex, 1)"
                >
                  ↓
                </button>
              </span>
            </div>
          </article>
        </article>
      </article>

      <aside v-if="panel" class="template-inspector" aria-label="Propiedades de plantilla">
        <header>
          <div>
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
            <small>Los cambios afectan únicamente borradores no enviados.</small>
          </div>
          <button type="button" aria-label="Cerrar propiedades" @click="closePanel">
            ×
          </button>
        </header>

        <form
          v-if="panel === 'new-section'"
          class="template-inspector-body"
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
            class="new-section-field"
          >
            <legend>Campo {{ index + 1 }}</legend>
            <TemplateFieldForm
              v-model="newSection.fields[index]!"
              :content-types="contentTypes"
            />
            <button
              v-if="newSection.fields.length > 1"
              type="button"
              @click="newSection.fields.splice(index, 1)"
            >
              Quitar campo
            </button>
          </fieldset>
          <button type="button" @click="addSectionField">Agregar otro campo</button>
          <footer>
            <button type="button" @click="closePanel">Cancelar</button>
            <button :disabled="saving">Crear bloque</button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'new-field'"
          class="template-inspector-body"
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
          <footer>
            <button type="button" @click="closePanel">Cancelar</button>
            <button :disabled="saving">Agregar campo</button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'appearance' && appearance && data?.appearanceOptions"
          class="template-inspector-body"
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
          <button type="button" :disabled="!logo || saving" @click="uploadLogo">
            Subir logo
          </button>
          <footer>
            <button type="button" @click="closePanel">Cancelar</button>
            <button :disabled="saving">Guardar apariencia</button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'selection' && selection?.kind === 'title'"
          class="template-inspector-body"
          @submit.prevent="saveSelection"
        >
          <label>
            Título institucional <span aria-label="obligatorio">*</span>
            <input v-model="titleDraft" required maxlength="180" />
          </label>
          <footer>
            <button type="button" @click="closePanel">Cancelar</button>
            <button :disabled="saving">Guardar título</button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'selection' && selection?.kind === 'section'"
          class="template-inspector-body"
          @submit.prevent="saveSelection"
        >
          <label>
            Nombre del bloque <span aria-label="obligatorio">*</span>
            <input v-model="sectionTitleDraft" required maxlength="180" />
          </label>
          <footer>
            <button type="button" @click="closePanel">Cancelar</button>
            <button :disabled="saving">Guardar bloque</button>
          </footer>
        </form>

        <form
          v-else-if="panel === 'selection' && selectedField && fieldDraft"
          class="template-inspector-body"
          @submit.prevent="saveSelection"
        >
          <p class="save-status">
            Campo obligatorio{{ selectedField.inherited ? ' · institucional' : '' }}
          </p>
          <TemplateFieldForm
            v-model="fieldDraft"
            :content-types="fieldContentTypes"
            :type-locked="selectedField.inherited"
            :ai-available="!selectedField.inherited"
          />
          <TemplateTableDesigner
            v-if="selectedBlock?.content_type === 'table' && selectedBlock.table"
            :layout="selectedBlock.table"
            :fingerprint="selectedBlock.fingerprint"
            :saving="saving"
            @save="saveTable(selectedBlock!, $event)"
          />
          <footer>
            <button type="button" @click="closePanel">Cancelar</button>
            <button :disabled="saving">Guardar campo</button>
          </footer>
        </form>
      </aside>
    </section>
    <p v-else-if="!error">Cargando plantilla…</p>
  </main>
</template>
