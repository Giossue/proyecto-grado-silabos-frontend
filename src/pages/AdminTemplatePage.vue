<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import {
  createTemplate, createTemplateField, createTemplateSection, deleteTemplateBlock, deleteTemplateSection,
  getTemplate, reorderTemplateBlocks, reorderTemplateSections, updateTemplateAppearance, updateTemplateDocument,
  updateTemplateField, updateTemplateSection, updateTemplateTable, updateTemplateTitle, uploadInstitutionLogo,
  type TemplateAppearance, type TemplateBlock, type TemplateField, type TemplatePayload,
} from '@/api/template';
import { getSession } from '@/api/session';

const router = useRouter();
const data = ref<TemplatePayload | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const saving = ref(false);
const title = ref('PROGRAMA DE ASIGNATURA (SÍLABO)');
const logo = ref<File | null>(null);
const appearance = ref<TemplateAppearance | null>(null);
const designEditors = reactive<Record<string, string>>({});
const tableEditors = reactive<Record<string, string>>({});
const section = reactive({ title: '', key: '', first_field_label: '', first_field_key: '', first_field_content_type: 'text' });
const field = reactive({ section_id: '', key: '', label: '', help: '', content_type: 'text', required: true, inherited: false, master_source: '', teacher_editable: true, ai_enabled: false, ai_coordinator_configurable: true });

const load = async (): Promise<void> => {
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') { await router.replace('/panel'); return; }
    data.value = await getTemplate();
    title.value = data.value.template?.titleBlock.title ?? title.value;
    appearance.value = data.value.template ? { ...data.value.template.appearance } : null;
    for (const currentSection of data.value.template?.sections ?? []) {
      for (const block of currentSection.blocks) {
        designEditors[block.id] = JSON.stringify(block.document, null, 2);
        tableEditors[block.id] = JSON.stringify(block.table, null, 2);
      }
    }
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la plantilla.';
  }
};

const run = async (operation: () => Promise<{ message: string }>): Promise<void> => {
  try { saving.value = true; error.value = null; message.value = (await operation()).message; await load(); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : reason instanceof Error ? reason.message : 'No se pudo guardar la plantilla.'; }
  finally { saving.value = false; }
};

const addSection = () => run(() => createTemplateSection(data.value!.template!.id, { ...section }));
const addField = () => run(() => createTemplateField(data.value!.template!.id, { ...field, help: field.help || null, master_source: field.inherited ? field.master_source : null }));
const saveField = (item: TemplateField) => run(() => updateTemplateField(data.value!.template!.id, item.id, { block_id: item.block_id, key: item.key, label: item.label, help: item.help, content_type: item.content_type, required: item.required, inherited: item.inherited, master_source: item.master_source, teacher_editable: item.teacher_editable, ai_enabled: item.ai_enabled, ai_coordinator_configurable: item.ai_coordinator_configurable }));
const uploadLogo = () => { if (logo.value) void run(() => uploadInstitutionLogo(logo.value!)); };

const moveSection = (index: number, offset: number): void => {
  const sections = data.value?.template?.sections; if (!sections) return;
  const target = index + offset; if (target < 0 || target >= sections.length) return;
  const ids = sections.map((item) => item.id); [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  void run(() => reorderTemplateSections(data.value!.template!.id, ids));
};
const moveBlock = (sectionId: string, blocks: TemplateBlock[], index: number, offset: number): void => {
  const target = index + offset; if (target < 0 || target >= blocks.length) return;
  const ids = blocks.map((item) => item.id); [ids[index], ids[target]] = [ids[target]!, ids[index]!];
  void run(() => reorderTemplateBlocks(data.value!.template!.id, sectionId, ids));
};
const parseObject = (text: string, label: string): Record<string, unknown> | null => {
  const parsed: unknown = JSON.parse(text); if (parsed === null) return null;
  if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label} debe ser un objeto JSON.`);
  return parsed as Record<string, unknown>;
};
const saveTable = (block: TemplateBlock) => run(() => updateTemplateTable(data.value!.template!.id, block.id, { ...parseObject(tableEditors[block.id] ?? '{}', 'La tabla'), fingerprint: block.fingerprint }));
const saveDocument = (block: TemplateBlock) => run(() => updateTemplateDocument(data.value!.template!.id, block.id, { document: parseObject(designEditors[block.id] ?? '{}', 'El diseño'), fingerprint: block.fingerprint }));

onMounted(() => { void load(); });
</script>

<template>
  <main class="app-page template-page">
    <header class="app-header"><div><p class="eyebrow">Administración</p><h1>Plantilla institucional</h1><p>Una sola plantilla para todos los sílabos.</p></div><RouterLink class="back-link" to="/panel">Volver al panel</RouterLink></header>
    <p v-if="data?.processLock" role="alert">{{ data.processLock }}</p><p v-if="message" class="save-status">{{ message }}</p><p v-if="error" role="alert">{{ error }}</p>
    <section v-if="data && !data.template" class="detail-card"><h2>No existe una plantilla</h2><button :disabled="saving || Boolean(data.processLock)" @click="run(createTemplate)">Crear plantilla institucional</button></section>
    <template v-else-if="data?.template">
      <section class="document-sheet" :style="{ fontFamily: appearance?.font_family, fontSize: `${appearance?.body_font_size ?? 11}pt` }">
        <header class="document-heading"><img v-if="data.logos" :src="data.logos.institution" alt="Logo institucional" /><h2>{{ title }}</h2><img v-if="data.logos" :src="data.logos.faculty" alt="Logo de facultad" /></header>
        <article v-for="(item, sectionIndex) in data.template.sections" :key="item.id" class="document-section">
          <header><button :disabled="sectionIndex === 0" @click="moveSection(sectionIndex, -1)">Subir</button><button :disabled="sectionIndex === data.template.sections.length - 1" @click="moveSection(sectionIndex, 1)">Bajar</button><input v-model="item.title" :disabled="Boolean(data.processLock)" /><button :disabled="saving || Boolean(data.processLock)" @click="run(() => updateTemplateSection(data!.template!.id, item.id, { title: item.title }))">Guardar sección</button><button :disabled="saving || Boolean(data.processLock)" @click="run(() => deleteTemplateSection(data!.template!.id, item.id))">Eliminar</button></header>
          <section v-for="(block, blockIndex) in item.blocks" :key="block.id" class="document-block"><div class="block-heading"><h3>{{ block.title }}</h3><button :disabled="blockIndex === 0" @click="moveBlock(item.id, item.blocks, blockIndex, -1)">Subir</button><button :disabled="blockIndex === item.blocks.length - 1" @click="moveBlock(item.id, item.blocks, blockIndex, 1)">Bajar</button></div>
            <div v-for="itemField in block.fields" :key="itemField.id" class="template-field"><input v-model="itemField.label" :disabled="Boolean(data.processLock)" /><label><input v-model="itemField.required" type="checkbox" :disabled="Boolean(data.processLock)" /> Obligatorio</label><label><input v-model="itemField.ai_enabled" type="checkbox" :disabled="Boolean(data.processLock)" /> Usa IA</label><label><input v-model="itemField.ai_coordinator_configurable" type="checkbox" :disabled="Boolean(data.processLock)" /> Coordinación decide IA</label><button :disabled="saving || Boolean(data.processLock)" @click="saveField(itemField)">Guardar campo</button></div>
            <details v-if="block.content_type === 'table'"><summary>Diseño avanzado de tabla</summary><textarea v-model="tableEditors[block.id]" class="json-editor" /><button :disabled="saving || Boolean(data.processLock)" @click="saveTable(block)">Guardar tabla</button></details>
            <details><summary>Diseño avanzado del bloque</summary><textarea v-model="designEditors[block.id]" class="json-editor" /><button :disabled="saving || Boolean(data.processLock)" @click="saveDocument(block)">Guardar diseño</button></details>
            <button :disabled="saving || Boolean(data.processLock)" @click="run(() => deleteTemplateBlock(data!.template!.id, block.id))">Eliminar bloque</button>
          </section>
        </article>
      </section>

      <section class="detail-card"><h2>Apariencia y cabecera</h2>
        <form class="editor-form" @submit.prevent="run(() => updateTemplateTitle(data!.template!.id, title))"><label>Título institucional<input v-model="title" required :disabled="Boolean(data.processLock)" /></label><button :disabled="saving || Boolean(data.processLock)">Guardar título</button></form>
        <form v-if="appearance && data.appearanceOptions" class="editor-form" @submit.prevent="run(() => updateTemplateAppearance(data!.template!.id, appearance!))"><div class="form-grid"><label>Fuente<select v-model="appearance.font_family"><option v-for="option in data.appearanceOptions.fonts" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label>Contenido<select v-model="appearance.body_font_size"><option v-for="option in data.appearanceOptions.body_sizes" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label>Título<select v-model="appearance.title_font_size"><option v-for="option in data.appearanceOptions.title_sizes" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label>Secciones<select v-model="appearance.section_font_size"><option v-for="option in data.appearanceOptions.section_sizes" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label>Margen<select v-model="appearance.margin_cm"><option v-for="option in data.appearanceOptions.margins" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><label>Orientación<select v-model="appearance.orientation"><option v-for="option in data.appearanceOptions.orientations" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></div><button :disabled="saving || Boolean(data.processLock)">Guardar apariencia</button></form>
        <form class="editor-form" @submit.prevent="uploadLogo"><label>Logo institucional<input type="file" accept="image/png,image/jpeg,image/webp" :disabled="Boolean(data.processLock)" @change="logo = ($event.target as HTMLInputElement).files?.[0] ?? null" /></label><button :disabled="saving || !logo || Boolean(data.processLock)">Subir logo</button></form>
      </section>

      <section class="detail-card"><h2>Agregar sección</h2><form class="editor-form" @submit.prevent="addSection"><div class="form-grid"><label>Título<input v-model="section.title" required /></label><label>Clave<input v-model="section.key" required pattern="[a-z][a-z0-9_]*" /></label><label>Primer campo<input v-model="section.first_field_label" required /></label><label>Clave del campo<input v-model="section.first_field_key" required pattern="[a-z][a-z0-9_]*" /></label><label>Tipo<select v-model="section.first_field_content_type"><option v-for="type in data.blockTypes" :key="type.value" :value="type.value">{{ type.label }}</option></select></label></div><button :disabled="saving || Boolean(data.processLock)">Agregar sección</button></form></section>
      <section class="detail-card"><h2>Agregar campo</h2><form class="editor-form" @submit.prevent="addField"><div class="form-grid"><label>Sección<select v-model="field.section_id" required><option value="">Seleccione</option><option v-for="item in data.template.sections" :key="item.id" :value="item.id">{{ item.title }}</option></select></label><label>Etiqueta<input v-model="field.label" required /></label><label>Clave<input v-model="field.key" required pattern="[a-z][a-z0-9_]*" /></label><label>Tipo<select v-model="field.content_type"><option v-for="type in data.blockTypes" :key="type.value" :value="type.value">{{ type.label }}</option></select></label></div><label><input v-model="field.required" type="checkbox" /> Obligatorio</label><label><input v-model="field.ai_enabled" type="checkbox" /> Usa IA</label><label><input v-model="field.ai_coordinator_configurable" type="checkbox" /> Coordinación puede cambiar uso de IA</label><button :disabled="saving || Boolean(data.processLock)">Agregar campo</button></form></section>
    </template><p v-else-if="!error">Cargando plantilla…</p>
  </main>
</template>
