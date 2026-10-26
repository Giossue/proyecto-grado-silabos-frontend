<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, FileSpreadsheet, FileUp, Trash2 } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { applyFichaImport, discardFichaImport, getFichaImport, previewFichaWorkbook, downloadFichaWorkbook, type FichaImport, type FichaImportSubject } from '@/api/ficha-imports';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import FichaProposalValue from '@/components/domain/academic/FichaProposalValue.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ applied: [message: string] }>();
const open = ref(false);
const current = ref<FichaImport | null>(null);
const file = ref<File | null>(null);
const downloading = ref(false);
const chosen = ref<Set<string>>(new Set());
const busy = ref(false);
const error = ref<string | null>(null);
let timer: number | undefined;

const working = computed(() => current.value?.state === 'pendiente' || current.value?.state === 'en_ejecucion');
const ready = computed(() => current.value?.state === 'lista');
const workbook = computed(() => current.value?.format === 'ficha_xlsx_v1');
const proposed = computed(() => (current.value?.subjects ?? []).filter((subject) => subject.state === 'lista'));
const fieldLabel = (key: string): string => current.value?.fields.find((field) => field.key === key)?.label ?? key;
const found = (subject: FichaImportSubject): number => subject.coverage?.found ?? Object.keys(subject.values).length;
const total = (subject: FichaImportSubject): number => subject.coverage?.total ?? current.value?.fields.length ?? 0;
const stateText = (subject: FichaImportSubject): string => subject.state === 'lista' || subject.state === 'sin_evidencia'
  ? `${found(subject)} de ${total(subject)} campos con contenido`
  : ({ fallida: 'No se pudo proponer', pendiente: 'Analizando…' })[subject.state];
const missing = (subject: FichaImportSubject) => subject.missing ?? (current.value?.fields ?? []).filter((field) => !(field.key in subject.values)).map((field) => ({ ...field, reason: 'no_encontrado' as const }));
const missingReason = (reason: string): string => ({ sin_contexto: 'No se incluyó contenido para esta materia.', no_encontrado: 'Sin contenido en el archivo. Este campo no se cambiará.', estructura_invalida: 'El contenido no tiene el formato de este campo.', servicio_no_disponible: 'No se pudo completar la lectura. Puede intentarlo con una nueva importación.' })[reason] ?? 'Sin contenido en el archivo. Este campo no se cambiará.';
const workingText = computed(() => {
  const value = current.value;
  if (value?.progress.total) return 'Preparando la propuesta para cada materia…';
  if (value?.reading) return `Leyendo el documento ${value.reading.index} de ${value.reading.total}: ${value.reading.name}`;
  return 'Preparando los documentos…';
});
const analysisDuration = computed(() => {
  const timing = current.value?.timing;
  if (!timing?.started_at || !timing.ready_at) return null;
  const seconds = Math.max(0, Math.round((new Date(timing.ready_at).getTime() - new Date(timing.started_at).getTime()) / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
});

const stop = (): void => { if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; } };
const load = async (): Promise<void> => {
  stop();
  try {
    const state = await getFichaImport();
    current.value = state.import;
    if (state.import?.state === 'lista' && chosen.value.size === 0) {
      chosen.value = new Set(state.import.subjects.filter((subject) => subject.state === 'lista').map((subject) => subject.subject_id));
    }
    if (open.value && (state.import?.state === 'pendiente' || state.import?.state === 'en_ejecucion')) timer = window.setTimeout(() => void load(), 3000);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo consultar la importación.';
  }
};
watch(open, (value) => { if (value) { error.value = null; file.value = null; chosen.value = new Set(); excluded.value = {}; expanded.value = new Set(); void load(); } else stop(); });
onBeforeUnmount(stop);

const run = async (action: () => Promise<unknown>, fallback: string): Promise<boolean> => {
  busy.value = true; error.value = null;
  try { await action(); return true; }
  catch (reason) { error.value = reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : fallback; return false; }
  finally { busy.value = false; }
};
const download = async (): Promise<void> => {
  downloading.value = true;
  try { await run(downloadFichaWorkbook, 'No se pudo descargar la plantilla.'); }
  finally { downloading.value = false; }
};
const analyze = async (): Promise<void> => {
  if (!file.value) return;
  await run(async () => {
    current.value = (await previewFichaWorkbook(file.value!)).import;
    chosen.value = new Set(current.value.subjects.filter((subject) => subject.state === 'lista').map((subject) => subject.subject_id));
    excluded.value = {};
    expanded.value = new Set();
  }, 'No se pudo leer el Excel.');
};
const discard = async (): Promise<void> => { if (current.value && await run(() => discardFichaImport(current.value!.id), 'No se pudo descartar.')) { stop(); current.value = null; chosen.value = new Set(); excluded.value = {}; expanded.value = new Set(); file.value = null; } };
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
const selectedSubjects = computed(() => proposed.value.filter((subject) => chosen.value.has(subject.subject_id) && Object.keys(subject.values).some((key) => fieldChosen(subject.subject_id, key))).map((subject) => subject.subject_id));
const apply = async (): Promise<void> => {
  if (!current.value) return;
  const id = current.value.id;
  if (await run(() => applyFichaImport(id, selectedSubjects.value, chosenFields()), 'No se pudieron aplicar las fichas.')) { open.value = false; emit('applied', `Fichas aplicadas a ${selectedSubjects.value.length} materias.`); }
};
const expanded = ref<Set<string>>(new Set());
const toggleExpanded = (id: string): void => { const next = new Set(expanded.value); if (!next.delete(id)) next.add(id); expanded.value = next; };
const toggle = (id: string, value: boolean): void => { const next = new Set(chosen.value); if (value) next.add(id); else next.delete(id); chosen.value = next; };
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child><Button type="button" variant="success" :disabled="props.disabled"><FileSpreadsheet data-icon="inline-start" aria-hidden="true" />Importar desde Excel</Button></DialogTrigger>
    <DialogContent :aria-describedby="undefined" class="max-h-screen flex flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <ScrollArea class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-2rem)]">
            <div class="grid gap-4 p-6">
              <DialogHeader>
                <DialogTitle>Importar el proyecto de carrera</DialogTitle>
              </DialogHeader>
              <div class="flex flex-col gap-4">
                <FeedbackAlert v-if="error" :message="error" />
                <template v-if="working">
                  <p class="flex items-center gap-2 text-sm" role="status"><Spinner /> {{ workingText }}</p>
                </template>

                <template v-else-if="current?.state === 'fallida'">
                  <Alert variant="destructive"><AlertDescription>{{ current.error ?? 'No se pudo leer el archivo.' }}</AlertDescription></Alert>
                  <div><Button type="button" variant="outline" :disabled="busy" @click="discard"><Trash2 data-icon="inline-start" aria-hidden="true" />Descartar y empezar de nuevo</Button></div>
                </template>

                <template v-else-if="ready">
                  <p v-if="workbook" class="text-sm">Vista previa del Excel para {{ proposed.length }} de {{ current?.subjects.length }} materias. Revise el contenido antes de aplicar. Los campos vacíos conservan sus valores actuales.</p>
                  <p v-else class="text-sm">Propuesta para {{ proposed.length }} de {{ current?.subjects.length }} materias. Revise el contenido antes de aplicar.</p>
                  <p v-if="!workbook && analysisDuration" class="text-sm text-muted-foreground">Tiempo de análisis: {{ analysisDuration }}.</p>
                  <ScrollArea class="[&>[data-slot=scroll-area-viewport]]:max-h-96">
                      <ul class="flex flex-col gap-2">
                        <li v-for="subject in current?.subjects" :key="subject.subject_id" class="rounded-md ring-1 ring-surface-ring p-3">
                          <div class="flex items-start gap-3">
                            <Checkbox :id="`ficha-${subject.subject_id}`" :model-value="chosen.has(subject.subject_id)" :disabled="subject.state !== 'lista' || busy" :aria-label="`Aplicar la ficha de ${subject.name}`" @update:model-value="toggle(subject.subject_id, $event === true)" />
                            <div class="flex min-w-0 flex-1 flex-col gap-1">
                              <FieldLabel :for="`ficha-${subject.subject_id}`" class="font-medium">{{ subject.name }}<span class="font-normal text-muted-foreground"> · {{ subject.code }}</span></FieldLabel>
                              <p class="text-sm text-muted-foreground">{{ stateText(subject) }}<template v-if="subject.state === 'lista' && subject.replaces"> · actualiza solo los campos que aplique</template></p>
                              <div v-if="subject.state !== 'pendiente'" class="text-sm">
                                <Button type="button" variant="link" size="sm" class="h-auto px-0" :aria-expanded="expanded.has(subject.subject_id)" @click="toggleExpanded(subject.subject_id)">{{ expanded.has(subject.subject_id) ? 'Ocultar la comparación' : (subject.replaces ? 'Comparar con la ficha actual' : 'Revisar campos') }}</Button>
                                <div v-for="(value, key) in expanded.has(subject.subject_id) ? subject.values : {}" :key="key" class="mt-3 rounded-md ring-1 ring-surface-ring p-2">
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
                                      <p class="text-xs font-medium text-muted-foreground">{{ workbook ? 'Contenido del Excel' : 'Propuesta' }}</p>
                                      <FichaProposalValue :value="value" :label="fieldLabel(String(key))" />
                                    </div>
                                  </div>
                                </div>
                                <div v-if="expanded.has(subject.subject_id) && missing(subject).length" class="mt-3 flex flex-col gap-2">
                                  <p class="font-medium">Campos pendientes</p>
                                  <ul class="flex flex-col gap-2"><li v-for="field in missing(subject)" :key="field.key"><span class="font-medium">{{ field.label }}</span><p class="text-muted-foreground">{{ missingReason(field.reason) }}</p></li></ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      </ul>
                  </ScrollArea>
                </template>

                <template v-else>
                  <ol class="flex list-decimal flex-col gap-2 pl-5 text-sm">
                    <li>Descargue el Excel con las materias y campos actuales de su carrera.</li>
                    <li>Complete las celdas de contenido. Conserve los nombres de las hojas, los campos y las materias.</li>
                    <li>Cargue el archivo y revise la vista previa. Las celdas vacías no cambian la ficha actual.</li>
                  </ol>
                  <div><Button type="button" variant="outline" :disabled="busy" @click="download"><Spinner v-if="downloading" data-icon="inline-start" />Descargar plantilla Excel</Button></div>
                  <FieldGroup>
                    <Field>
                      <FieldLabel for="ficha-import-files">Excel completado (.xlsx)</FieldLabel>
                      <FileDropzone v-model="file" input-id="ficha-import-files" kind="xlsx" :max-bytes="20 * 1024 * 1024" :disabled="busy" :invalid="Boolean(error)" @validation-error="(message) => { if (message) error = message; }" />
                    </Field>
                  </FieldGroup>
                </template>
              </div>
              <DialogFooter>
                <Button v-if="working" type="button" variant="outline" :disabled="busy" @click="discard">Cancelar la importación</Button>
                <DialogClose v-else-if="!ready" as-child><Button type="button" variant="outline" :disabled="busy">Cerrar</Button></DialogClose>
                <template v-if="ready">
                  <Button type="button" variant="outline" :disabled="busy" @click="discard">Descartar</Button>
                  <Button type="button" :disabled="busy || selectedSubjects.length === 0" @click="apply"><Spinner v-if="busy" data-icon="inline-start" /><Check v-else data-icon="inline-start" aria-hidden="true" />Aplicar a {{ selectedSubjects.length }} materias</Button>
                </template>
                <Button v-else-if="!working && current?.state !== 'fallida'" type="button" :disabled="busy || !file" @click="analyze"><Spinner v-if="busy && !downloading" data-icon="inline-start" /><FileUp v-else data-icon="inline-start" aria-hidden="true" />Revisar Excel</Button>
              </DialogFooter>
            </div>
        </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
