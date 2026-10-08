<script setup lang="ts">
import { FileText, FileUp, Sparkles, Trash2, X } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { applyFichaImport, discardFichaImport, getFichaImport, startFichaImport, type FichaImport, type FichaImportSubject } from '@/api/ficha-imports';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from '@/components/ui/attachment';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ applied: [message: string] }>();
const open = ref(false);
const available = ref(true);
const current = ref<FichaImport | null>(null);
const files = ref<File[]>([]);
const chosen = ref<Set<string>>(new Set());
const busy = ref(false);
const error = ref<string | null>(null);
let timer: number | undefined;

const working = computed(() => current.value?.state === 'pendiente' || current.value?.state === 'en_ejecucion');
const ready = computed(() => current.value?.state === 'lista');
const proposed = computed(() => (current.value?.subjects ?? []).filter((subject) => subject.state === 'lista'));
const fieldLabel = (key: string): string => current.value?.fields.find((field) => field.key === key)?.label ?? key;
const stateText = (subject: FichaImportSubject): string => ({ lista: 'Ficha propuesta', sin_evidencia: 'Sin información en los documentos', fallida: 'No se pudo proponer', pendiente: 'Analizando…' })[subject.state];
const asLines = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value]);

const stop = (): void => { if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; } };
const load = async (): Promise<void> => {
  stop();
  try {
    const state = await getFichaImport();
    available.value = state.available;
    current.value = state.import;
    if (state.import?.state === 'lista' && chosen.value.size === 0) {
      chosen.value = new Set(state.import.subjects.filter((subject) => subject.state === 'lista').map((subject) => subject.subject_id));
    }
    if (open.value && (state.import?.state === 'pendiente' || state.import?.state === 'en_ejecucion')) timer = window.setTimeout(() => void load(), 3000);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo consultar el asistente.';
  }
};
watch(open, (value) => { if (value) { error.value = null; files.value = []; chosen.value = new Set(); void load(); } else stop(); });
onBeforeUnmount(stop);

const MAX_FILES = 6;
const addFiles = (selected: File[]): void => {
  const next = [...files.value, ...selected.filter((file) => !files.value.some((item) => item.name === file.name && item.size === file.size))];
  if (next.length > MAX_FILES) error.value = `Puede subir hasta ${MAX_FILES} documentos.`;
  files.value = next.slice(0, MAX_FILES);
};
const removeFile = (index: number): void => { files.value = files.value.filter((_, position) => position !== index); };
const fileSize = (bytes: number): string => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
const run = async (action: () => Promise<unknown>, fallback: string): Promise<boolean> => {
  busy.value = true; error.value = null;
  try { await action(); return true; }
  catch (reason) { error.value = reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : fallback; return false; }
  finally { busy.value = false; }
};
const analyze = async (): Promise<void> => { if (await run(async () => { current.value = (await startFichaImport(files.value)).import; }, 'No se pudieron enviar los documentos.')) void load(); };
const discard = async (): Promise<void> => { if (current.value && await run(() => discardFichaImport(current.value!.id), 'No se pudo descartar.')) { current.value = null; chosen.value = new Set(); files.value = []; } };
const excluded = ref<Record<string, string[]>>({});
const fieldChosen = (subjectId: string, key: string): boolean => !(excluded.value[subjectId] ?? []).includes(key);
const toggleField = (subjectId: string, key: string, value: boolean): void => {
  const rest = (excluded.value[subjectId] ?? []).filter((item) => item !== key);
  excluded.value = { ...excluded.value, [subjectId]: value ? rest : [...rest, key] };
};
const chosenFields = (): Record<string, string[]> | undefined => {
  const selection: Record<string, string[]> = {};
  for (const subject of current.value?.subjects ?? []) {
    if (!chosen.value.has(subject.subject_id) || !(excluded.value[subject.subject_id] ?? []).length) continue;
    selection[subject.subject_id] = Object.keys(subject.values).filter((key) => fieldChosen(subject.subject_id, key));
  }

  return Object.keys(selection).length ? selection : undefined;
};
const apply = async (): Promise<void> => {
  if (!current.value) return;
  const id = current.value.id;
  if (await run(() => applyFichaImport(id, [...chosen.value], chosenFields()), 'No se pudieron aplicar las fichas.')) { open.value = false; emit('applied', `Fichas aplicadas a ${chosen.value.size} materias.`); }
};
const expanded = ref<Set<string>>(new Set());
const toggleExpanded = (id: string): void => { const next = new Set(expanded.value); if (!next.delete(id)) next.add(id); expanded.value = next; };
const toggle = (id: string, value: boolean): void => { const next = new Set(chosen.value); if (value) next.add(id); else next.delete(id); chosen.value = next; };
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child><Button type="button" :disabled="props.disabled"><Sparkles data-icon="inline-start" aria-hidden="true" />Importar documentos</Button></DialogTrigger>
    <DialogContent class="max-h-screen overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Importar el proyecto de carrera</DialogTitle>
        <DialogDescription>Suba los documentos de la carrera (PDF o Excel). El asistente propone la ficha de cada materia y usted decide cuáles aplicar.</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-4">
        <FeedbackAlert v-if="error" :message="error" />
        <Alert v-if="!available"><AlertDescription>El asistente de IA no está configurado en este entorno. Pídale a Administración que lo active.</AlertDescription></Alert>

        <template v-else-if="working">
          <p class="flex items-center gap-2 text-sm" role="status"><Spinner /> Analizando los documentos… {{ current?.progress.done ?? 0 }} de {{ current?.progress.total ?? 0 }} materias.</p>
        </template>

        <template v-else-if="current?.state === 'fallida'">
          <Alert variant="destructive"><AlertDescription>{{ current.error ?? 'El análisis falló.' }}</AlertDescription></Alert>
          <div><Button type="button" variant="outline" :disabled="busy" @click="discard"><Trash2 data-icon="inline-start" aria-hidden="true" />Descartar y empezar de nuevo</Button></div>
        </template>

        <template v-else-if="ready">
          <p class="text-sm">Propuesta para {{ proposed.length }} de {{ current?.subjects.length }} materias. Marque las que desea aplicar; lo que no marque no se toca. En cada materia puede comparar con la ficha actual y elegir qué campos aplicar.</p>
          <ul class="flex max-h-96 flex-col gap-2 overflow-y-auto">
            <li v-for="subject in current?.subjects" :key="subject.subject_id" class="rounded-md border p-3">
              <div class="flex items-start gap-3">
                <Checkbox :id="`ficha-${subject.subject_id}`" :model-value="chosen.has(subject.subject_id)" :disabled="subject.state !== 'lista' || busy" :aria-label="`Aplicar la ficha de ${subject.name}`" @update:model-value="toggle(subject.subject_id, $event === true)" />
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <FieldLabel :for="`ficha-${subject.subject_id}`" class="font-medium">{{ subject.name }}<span class="font-normal text-muted-foreground"> · {{ subject.code }}</span></FieldLabel>
                  <p class="text-sm text-muted-foreground">{{ stateText(subject) }}<template v-if="subject.state === 'lista' && subject.replaces"> · reemplaza la ficha actual</template></p>
                  <div v-if="subject.state === 'lista'" class="text-sm">
                    <Button type="button" variant="link" size="sm" class="h-auto px-0" :aria-expanded="expanded.has(subject.subject_id)" @click="toggleExpanded(subject.subject_id)">{{ expanded.has(subject.subject_id) ? 'Ocultar la comparación' : (subject.replaces ? 'Comparar con la ficha actual' : 'Ver lo que propone') }}</Button>
                    <div v-for="(value, key) in expanded.has(subject.subject_id) ? subject.values : {}" :key="key" class="mt-3 rounded-md border p-2">
                      <div class="flex items-center gap-2">
                        <Checkbox :id="`ficha-${subject.subject_id}-${key}`" :model-value="fieldChosen(subject.subject_id, String(key))" :disabled="!chosen.has(subject.subject_id) || busy" @update:model-value="toggleField(subject.subject_id, String(key), $event === true)" />
                        <FieldLabel :for="`ficha-${subject.subject_id}-${key}`" class="font-medium">{{ fieldLabel(String(key)) }}</FieldLabel>
                      </div>
                      <div class="mt-2 grid gap-3" :class="subject.replaces ? 'sm:grid-cols-2' : ''">
                        <div v-if="subject.replaces">
                          <p class="text-xs font-medium text-muted-foreground">Actual</p>
                          <p class="whitespace-pre-wrap" :class="subject.current[String(key)] ? '' : 'text-muted-foreground'">{{ subject.current[String(key)] ?? 'Vacío' }}</p>
                        </div>
                        <div>
                          <p class="text-xs font-medium text-muted-foreground">Propuesta</p>
                          <p v-for="(line, index) in asLines(value)" :key="index" class="whitespace-pre-wrap">{{ Array.isArray(value) ? '• ' : '' }}{{ line }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </template>

        <template v-else>
          <div class="flex flex-col gap-2">
            <FieldLabel for="ficha-import-files">Documentos (PDF o Excel, hasta 6)</FieldLabel>
            <FileDropzone :model-value="null" input-id="ficha-import-files" kind="document" multiple :max-bytes="20 * 1024 * 1024" :disabled="busy || files.length >= MAX_FILES" @files-selected="addFiles" @validation-error="(message) => { if (message) error = message; }" />
            <Attachment v-for="(file, index) in files" :key="`${file.name}-${file.size}`" class="w-full">
              <AttachmentMedia><FileText aria-hidden="true" /></AttachmentMedia>
              <AttachmentContent><AttachmentTitle>{{ file.name }}</AttachmentTitle><AttachmentDescription>{{ fileSize(file.size) }}</AttachmentDescription></AttachmentContent>
              <AttachmentActions><AttachmentAction type="button" :aria-label="`Quitar ${file.name}`" :disabled="busy" @click="removeFile(index)"><X aria-hidden="true" /></AttachmentAction></AttachmentActions>
            </Attachment>
          </div>
        </template>
      </div>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
        <template v-if="ready">
          <Button type="button" variant="outline" :disabled="busy" @click="discard"><Trash2 data-icon="inline-start" aria-hidden="true" />Descartar</Button>
          <Button type="button" :disabled="busy || chosen.size === 0" @click="apply"><Spinner v-if="busy" data-icon="inline-start" />Aplicar a {{ chosen.size }} materias</Button>
        </template>
        <Button v-else-if="available && !working && current?.state !== 'fallida'" type="button" :disabled="busy || files.length === 0" @click="analyze"><Spinner v-if="busy" data-icon="inline-start" /><FileUp v-else data-icon="inline-start" aria-hidden="true" />Analizar documentos</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
