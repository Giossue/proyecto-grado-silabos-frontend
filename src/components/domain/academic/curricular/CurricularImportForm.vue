<script setup lang="ts">
import { FileSearch, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import type { CurricularImportIndex } from '@/api/curricular-imports';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{ index: CurricularImportIndex; processing: boolean; errors: Record<string, string[]> }>();
const emit = defineEmits<{ submit: [input: { files: File[]; source_ids: string[]; instruction: string }] }>();
const files = ref<File[]>([]);
const sourceIds = ref<string[]>([]);
const instruction = ref('');
const fileError = ref<string | null>(null);
const disabled = computed(() => props.processing || Boolean(props.index.lock_reason) || !props.index.capabilities.extraction);
const fieldErrors = computed(() => Object.entries(props.errors).filter(([key]) => key.startsWith('files') || key.startsWith('source_ids')).flatMap(([, values]) => values));
const addFiles = (incoming: File[]) => {
  const unsupported = incoming.some((file) => file.name.toLowerCase().endsWith('.pdf') ? !props.index.capabilities.pdf : !props.index.capabilities.xlsx);
  if (unsupported) { fileError.value = 'Uno de los formatos adjuntos no está disponible para importar en este momento.'; return; }
  const additional = [...new Map(incoming.map((file) => [`${file.name}:${file.size}:${file.lastModified}`, file])).values()].filter((file) => !files.value.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified));
  if (files.value.length + additional.length > 10) { fileError.value = 'Adjunta hasta 10 archivos por importación.'; return; }
  if ([...files.value, ...additional].reduce((total, file) => total + file.size, 0) > 30 * 1024 * 1024) { fileError.value = 'Los archivos de una importación pueden sumar hasta 30 MB. Divide los documentos en varios lotes.'; return; }
  fileError.value = null;
  for (const file of incoming) {
    if (!files.value.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) files.value.push(file);
  }
};
const selectSource = (id: string, selected: boolean | 'indeterminate') => {
  sourceIds.value = selected === true ? [...sourceIds.value, id] : sourceIds.value.filter((item) => item !== id);
};
const submit = () => {
  if (disabled.value || (!files.value.length && !sourceIds.value.length)) return;
  emit('submit', { files: files.value, source_ids: sourceIds.value, instruction: instruction.value });
};
</script>

<template>
  <form @submit.prevent="submit">
    <FieldGroup>
      <Alert v-if="index.lock_reason || !index.capabilities.extraction">
        <AlertDescription>{{ index.lock_reason ?? 'La extracción de documentos no está disponible en este momento. Las importaciones anteriores siguen disponibles en el historial.' }}</AlertDescription>
      </Alert>
      <Field :data-invalid="Boolean(fileError || fieldErrors.length)">
        <FieldLabel for="curricular-import-files">Documentos</FieldLabel>
        <FileDropzone input-id="curricular-import-files" :model-value="null" kind="curricular" multiple :max-bytes="20 * 1024 * 1024" :disabled="disabled" :invalid="Boolean(fileError || fieldErrors.length)" @files-selected="addFiles" @validation-error="fileError = $event" />
        <FieldDescription>Proyecto de carrera, guías o bibliografía. Hasta 10 archivos PDF o Excel: 20 MB por archivo y 30 MB en total.</FieldDescription>
        <ul v-if="files.length" class="flex flex-col gap-2">
          <li v-for="(file, index) in files" :key="`${file.name}-${file.lastModified}`" class="flex min-w-0 items-center justify-between gap-2">
            <span class="min-w-0 break-all text-sm">{{ file.name }}</span>
            <Button type="button" size="icon-sm" variant="ghost" :aria-label="`Quitar ${file.name}`" :disabled="processing" @click="files.splice(index, 1)"><X data-icon="inline-start" aria-hidden="true" /></Button>
          </li>
        </ul>
        <FieldError :errors="[fileError ?? undefined, ...fieldErrors]" />
      </Field>
      <FieldSet v-if="index.sources.length" :disabled="disabled">
        <FieldLegend>O usa fuentes ya cargadas</FieldLegend>
        <FieldGroup class="max-h-44 gap-3 overflow-y-auto">
          <Field v-for="source in index.sources" :key="source.id" orientation="horizontal">
            <Checkbox :id="`curricular-source-${source.id}`" :model-value="sourceIds.includes(source.id)" :disabled="disabled || (sourceIds.length >= 10 && !sourceIds.includes(source.id))" @update:model-value="selectSource(source.id, $event)" />
            <FieldLabel :for="`curricular-source-${source.id}`" class="min-w-0 break-words">{{ source.name }}</FieldLabel>
          </Field>
        </FieldGroup>
        <FieldDescription>Selecciona hasta 10 fuentes existentes.</FieldDescription>
      </FieldSet>
      <Field :data-invalid="Boolean(errors.instruction)">
        <FieldLabel for="curricular-import-instruction">Qué necesitas organizar <span class="text-muted-foreground">(opcional)</span></FieldLabel>
        <Textarea id="curricular-import-instruction" v-model="instruction" maxlength="4000" :disabled="disabled" :aria-invalid="Boolean(errors.instruction)" placeholder="Ej. Identifica los resultados de aprendizaje y las habilidades disponibles para cada asignatura." />
        <FieldError :errors="errors.instruction" />
      </Field>
      <Button type="submit" :disabled="disabled || (!files.length && !sourceIds.length)">
        <Spinner v-if="processing" data-icon="inline-start" /><FileSearch v-else data-icon="inline-start" aria-hidden="true" />
        {{ processing ? 'Enviando documentos…' : 'Analizar documentos' }}
      </Button>
    </FieldGroup>
  </form>
</template>
