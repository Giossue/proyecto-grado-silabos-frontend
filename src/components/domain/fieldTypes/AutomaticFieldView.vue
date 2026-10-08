<script setup lang="ts">
import { computed, inject } from 'vue';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { FORMATION_LABEL, formationEditorKey } from '@/components/domain/identity/formationEditor';
import type { FreeTextAction } from '@/components/domain/syllabus/freeTextRender';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField }>();
const card = computed(() => fieldConfig(props.field).source === 'identification_card');
const openFormation = inject(formationEditorKey, null);
const action = computed<FreeTextAction | undefined>(() => openFormation?.value
    ? { text: FORMATION_LABEL, label: 'Editar formación y experiencia', run: openFormation.value }
    : undefined);
</script>

<template>
  <div v-if="card" class="automatic-card"><FreeTextContent :value="field.document" :action="action" empty-text="Se completa con los datos del sílabo al enviarlo." /></div>
  <p v-else class="text-sm text-muted-foreground">Se completa automáticamente.</p>
</template>

<style scoped>
.automatic-card { max-width: 100%; overflow-x: auto; font-size: 10pt; }
.automatic-card :deep(.free-text-content) { font-size: inherit; }
.automatic-card :deep(.free-text-table) { table-layout: fixed; }
.automatic-card :deep(.free-text-table td) { overflow-wrap: anywhere; padding: 0.1rem 0.25rem; }
:global(.syllabus-readonly-field) .automatic-card { font-size: 0.875rem; }
:global(.syllabus-readonly-field) .automatic-card :deep(.free-text-table) { border: 1px solid var(--border); }
:global(.syllabus-readonly-field) .automatic-card :deep(.free-text-table td),
:global(.syllabus-readonly-field) .automatic-card :deep(.free-text-table th) { padding: 0.375rem 0.5rem; background-color: transparent !important; color: var(--foreground) !important; border-color: var(--border); }
:global(.syllabus-readonly-field) .automatic-card :deep(.free-text-table [style]) { color: inherit !important; background-color: transparent !important; }
</style>
