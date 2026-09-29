<script setup lang="ts">
import { ChevronDown, FileSearch, X } from '@lucide/vue';
import { computed, nextTick, ref, watch } from 'vue';
import type { CurricularImportIndex } from '@/api/curricular-imports';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{ index: CurricularImportIndex; processing: boolean; errors: Record<string, string[]> }>();
const emit = defineEmits<{ submit: [input: { files: File[]; instruction: string }] }>();
const files = ref<File[]>([]);
const instruction = ref('');
const instructionOpen = ref(false);
const formContent = ref<HTMLElement | null>(null);
const fileError = ref<string | null>(null);
// La plantilla manda (I-151, I-155): sin @ProyectoCarrera en la plantilla no hay nada que buscar.
const noConcepts = computed(() => !props.index.concepts.length);
const disabled = computed(() => props.processing || Boolean(props.index.lock_reason) || !props.index.capabilities.extraction || noConcepts.value);
const selectedCount = computed(() => files.value.length);
const fieldErrors = computed(() => Object.entries(props.errors).filter(([key]) => key.startsWith('files')).flatMap(([, values]) => values));
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
const submit = () => {
  if (disabled.value || !selectedCount.value) return;
  emit('submit', { files: files.value, instruction: instruction.value });
};
const revealInstruction = (): void => {
  if (formContent.value) formContent.value.scrollTop = formContent.value.scrollHeight;
};
watch(instructionOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    revealInstruction();
  }
});
watch(() => props.errors.instruction, (messages) => {
  if (messages?.length) instructionOpen.value = true;
}, { immediate: true });
</script>

<template>
  <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submit">
    <div ref="formContent" class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-5">
      <Alert v-if="noConcepts"><AlertDescription>La plantilla del sílabo todavía no tiene datos del Proyecto de carrera. Cuando Administración los agregue, podrás importarlos aquí.</AlertDescription></Alert>
      <FieldGroup class="gap-5">
        <Alert v-if="index.lock_reason || !index.capabilities.extraction">
          <AlertDescription>{{ index.lock_reason ?? 'La extracción de documentos no está disponible en este momento. Las importaciones anteriores siguen disponibles en el historial.' }}</AlertDescription>
        </Alert>
        <Field :data-invalid="Boolean(fileError || fieldErrors.length)" :data-disabled="disabled">
          <FieldLabel for="curricular-import-files">Archivos nuevos</FieldLabel>
          <FileDropzone input-id="curricular-import-files" :model-value="null" kind="curricular" multiple :max-bytes="20 * 1024 * 1024" :disabled="disabled" :invalid="Boolean(fileError || fieldErrors.length)" @files-selected="addFiles" @validation-error="fileError = $event" />
          <FieldDescription>Proyecto de carrera, guías o bibliografía. Hasta 10 archivos; 20 MB por archivo y 30 MB en total.</FieldDescription>
          <ul v-if="files.length" class="flex flex-col gap-2">
            <li v-for="(file, index) in files" :key="`${file.name}-${file.lastModified}`" class="flex min-w-0 items-center justify-between gap-2">
              <span class="min-w-0 break-all text-sm">{{ file.name }}</span>
              <Button type="button" size="icon-sm" variant="ghost" :aria-label="`Quitar ${file.name}`" :disabled="processing" @click="files.splice(index, 1)"><X data-icon="inline-start" aria-hidden="true" /></Button>
            </li>
          </ul>
          <FieldError :errors="[fileError ?? undefined, ...fieldErrors]" />
        </Field>
        <Collapsible v-if="!noConcepts">
          <CollapsibleTrigger as-child>
            <Button type="button" variant="ghost" size="sm" class="group px-0">
              Se buscarán {{ index.concepts.length }} {{ index.concepts.length === 1 ? 'dato' : 'datos' }} de la plantilla
              <ChevronDown data-icon="inline-end" class="group-data-[state=open]:rotate-180" aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent class="pt-2 text-sm text-muted-foreground">
            <ul class="flex flex-col gap-1">
              <li v-for="concept in index.concepts" :key="concept.key">
                <span class="font-medium text-foreground">{{ concept.label }}</span>
                <template v-if="concept.sections.length"> · en {{ concept.sections.join(', ') }}</template>
              </li>
            </ul>
            <p class="mt-1">Si un documento trae otra información, se avisará sin importarla.</p>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible v-model:open="instructionOpen">
          <CollapsibleTrigger as-child>
            <Button type="button" variant="ghost" size="sm" class="px-0" :disabled="disabled">
              Agregar una indicación (opcional)
              <ChevronDown data-icon="inline-end" :class="instructionOpen ? 'rotate-180' : undefined" aria-hidden="true" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent class="pt-3">
            <Field :data-invalid="Boolean(errors.instruction)" :data-disabled="disabled">
              <FieldLabel for="curricular-import-instruction" class="sr-only">Indicación adicional</FieldLabel>
              <Textarea id="curricular-import-instruction" v-model="instruction" maxlength="4000" :disabled="disabled" :aria-invalid="Boolean(errors.instruction)" placeholder="Ej. Identifica los resultados de aprendizaje y las habilidades disponibles para cada asignatura." @focus="revealInstruction" />
              <FieldError :errors="errors.instruction" />
            </Field>
          </CollapsibleContent>
        </Collapsible>
      </FieldGroup>
    </div>
    <div class="flex shrink-0 flex-col gap-2 border-t bg-card py-3">
      <p v-if="noConcepts" class="text-sm text-muted-foreground">La importación se habilita cuando la plantilla tenga datos del Proyecto de carrera.</p>
      <p v-else-if="!disabled && !selectedCount" class="text-sm text-muted-foreground">Adjunta al menos un archivo para continuar.</p>
      <p v-else-if="selectedCount" class="text-sm text-muted-foreground">{{ selectedCount }} {{ selectedCount === 1 ? 'archivo adjunto' : 'archivos adjuntos' }}</p>
      <Button type="submit" class="w-full" :disabled="disabled || !selectedCount">
        <Spinner v-if="processing" data-icon="inline-start" /><FileSearch v-else data-icon="inline-start" aria-hidden="true" />
        {{ processing ? 'Enviando documentos…' : 'Analizar documentos' }}
      </Button>
    </div>
  </form>
</template>
