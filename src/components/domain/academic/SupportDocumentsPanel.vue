<script setup lang="ts">
import { Trash2, Upload } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import {
  deleteSupportDocument,
  getCoordinationSupportDocuments,
  getTeacherSupportDocuments,
  uploadSupportDocument,
  viewSupportDocument,
  type SupportDocument,
} from '@/api/support-documents';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import TableCardLine from '@/components/domain/TableCardLine.vue';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import TablePagination from '@/components/domain/TablePagination.vue';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { useShownWhileClosing } from '@/lib/dialogExit';
import { openPdfWindow, showInPdfWindow } from '@/lib/openPdf';
import { activateRow } from '@/lib/rowActivation';
import { toast } from '@/lib/toast';

const props = defineProps<{ manages: boolean }>();
const uploadOpen = defineModel<boolean>('uploadOpen', { default: false });
const initialLoading = defineModel<boolean>('loading', { default: false });

const MAX_BYTES = 20 * 1024 * 1024;
const POLL_MS = 4000;

const manages = computed(() => props.manages);
const documents = ref<SupportDocument[]>([]);
const loaded = ref(false);
const loading = ref(true);
const loadError = ref<string | null>(null);
watch(() => loading.value && !loaded.value && !loadError.value, (value) => { initialLoading.value = value; }, { immediate: true });
const busyId = ref<string | null>(null);
let poll: number | undefined;

const load = async (quiet = false): Promise<void> => {
  if (!quiet) { loading.value = true; loadError.value = null; }
  try {
    const { data } = manages.value ? await getCoordinationSupportDocuments() : await getTeacherSupportDocuments();
    documents.value = data;
    loaded.value = true;
  } catch (reason) {
    if (!quiet) loadError.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los documentos';
  } finally {
    loading.value = false;
  }
};

const pending = computed(() => documents.value.some((document) => document.view === 'pendiente'));
watch(pending, (value) => {
  window.clearInterval(poll);
  poll = value ? window.setInterval(() => { void load(true); }, POLL_MS) : undefined;
});
onBeforeUnmount(() => window.clearInterval(poll));

const filter = useClientFilter(() => documents.value, (document) => [document.title]);
const { items: pagedDocuments, meta, setPage } = useClientPagination(() => filter.items.value, 20, filter.criteria);

const sizeOf = (bytes: number): string => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

const view = async (document: SupportDocument): Promise<void> => {
  if (document.view !== 'lista' || busyId.value) return;
  busyId.value = document.id;
  const tab = openPdfWindow();
  try {
    const url = URL.createObjectURL(await viewSupportDocument(document.id));
    showInPdfWindow(tab, url);
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (reason) {
    tab?.close();
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudo abrir el documento');
  } finally {
    busyId.value = null;
  }
};

const title = ref('');
const file = ref<File | null>(null);
const fileError = ref<string | null>(null);
const uploadError = ref<string | null>(null);
const uploading = ref(false);

// Se limpia al abrir: al cerrar, el formulario se desvanece tal como estaba.
watch(uploadOpen, (open) => {
  if (!open) return;
  title.value = '';
  file.value = null;
  fileError.value = null;
  uploadError.value = null;
});

const pickFile = (picked: File | null): void => {
  file.value = picked;
  fileError.value = null;
};

const upload = async (): Promise<void> => {
  if (!file.value || !title.value.trim()) return;
  uploading.value = true;
  uploadError.value = null;
  try {
    const { document } = await uploadSupportDocument(title.value.trim(), file.value);
    documents.value = [document, ...documents.value];
    uploadOpen.value = false;
    toast.success('Documento subido');
  } catch (reason) {
    uploadError.value = reason instanceof ApiError ? (Object.values(reason.errors)[0]?.[0] ?? reason.message) : 'No se pudo subir el documento';
  } finally {
    uploading.value = false;
  }
};

const removing = ref<SupportDocument | null>(null);
const removeError = ref<string | null>(null);
const removeProcessing = ref(false);
const removingShown = useShownWhileClosing(() => removing.value);
const askRemoval = (document: SupportDocument): void => {
  removeError.value = null;
  removing.value = document;
};
const remove = async (): Promise<void> => {
  const target = removing.value;
  if (!target) return;
  removeProcessing.value = true;
  try {
    await deleteSupportDocument(target.id);
    documents.value = documents.value.filter((document) => document.id !== target.id);
    removing.value = null;
    toast.success('Documento eliminado');
  } catch (reason) {
    removeError.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el documento';
  } finally {
    removeProcessing.value = false;
  }
};

onMounted(() => { void load(); });
</script>

<template>
  <div class="flex flex-col gap-4">
    <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !loaded" variant="table" :rows="4" :columns="manages ? 4 : 3" :actions="manages" :cell-lines="[2, 1, 1]" />
    <div v-else class="flex flex-col gap-4">
      <Card class="py-3"><CardContent class="px-3">
        <ClientFilterBar :filter="filter" input-id="support-documents-search" label="Buscar documento" placeholder="Buscar documento" />
      </CardContent></Card>
      <Table label="Documentos de apoyo">
        <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead class="text-center">Tamaño</TableHead><TableHead>Subido</TableHead><TableHead v-if="manages" class="text-center">Acciones</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!filter.items.value.length" :colspan="manages ? 4 : 3">{{ filter.active.value ? 'Ningún documento coincide con la búsqueda' : manages ? 'Todavía no hay documentos' : 'Coordinación todavía no ha subido documentos' }}</TableEmpty>
          <TableRow
            v-for="document in pagedDocuments"
            v-else
            :key="document.id"
            :class="document.view === 'lista' ? 'cursor-pointer' : undefined"
            :tabindex="document.view === 'lista' ? 0 : undefined"
            :aria-label="document.view === 'lista' ? `Ver ${document.title}` : undefined"
            @click="activateRow($event, () => view(document))"
            @keydown.enter.self.prevent="view(document)"
            @keydown.space.self.prevent="view(document)"
          >
            <TableCell><span>{{ document.title }}</span><span v-if="document.view === 'pendiente'" class="flex items-center gap-1 text-xs text-muted-foreground"><Spinner aria-hidden="true" />Preparando vista</span><span v-else-if="document.view === 'sin_vista'" class="block text-xs text-muted-foreground">No se pudo preparar la vista</span><TableCardLine>{{ sizeOf(document.size) }} · {{ formatDateDisplay(document.uploaded_at, { dateStyle: 'medium' }) }}</TableCardLine></TableCell>
            <TableCell class="text-center" data-card-hide="true">{{ sizeOf(document.size) }}</TableCell>
            <TableCell data-card-hide="true">{{ formatDateDisplay(document.uploaded_at, { dateStyle: 'medium' }) }}</TableCell>
            <TableCell v-if="manages" class="text-center" data-card-no-label="true">
              <IconTooltip label="Eliminar"><Button type="button" variant="ghost" size="icon-sm" class="text-destructive hover:text-destructive" :aria-label="`Eliminar ${document.title}`" @click="askRemoval(document)"><Trash2 aria-hidden="true" /></Button></IconTooltip>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" label="Paginación de documentos de apoyo" @update:page="setPage" />
    </div>

    <Dialog v-if="manages" v-model:open="uploadOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>PDF, Word o Excel de hasta 20 MB</DialogDescription>
        </DialogHeader>
        <form class="flex flex-col gap-4" data-testid="support-document-form" @submit.prevent="upload">
          <Field :data-invalid="Boolean(fileError)">
            <FieldLabel for="support-document-file" required>Archivo</FieldLabel>
            <FileDropzone :model-value="file" input-id="support-document-file" kind="document" :max-bytes="MAX_BYTES" :disabled="uploading" :invalid="Boolean(fileError)" :state="uploading ? 'uploading' : 'idle'" @update:model-value="pickFile" @validation-error="fileError = $event" />
            <FieldError v-if="fileError" :errors="[fileError]" />
          </Field>
          <Field>
            <FieldLabel for="support-document-title" required>Nombre</FieldLabel>
            <Input id="support-document-title" v-model="title" maxlength="180" autocomplete="off" :disabled="uploading" />
          </Field>
          <FeedbackAlert v-if="uploadError" :message="uploadError" />
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" :disabled="uploading">Cancelar</Button></DialogClose>
            <Button type="submit" :disabled="uploading || !file || !title.trim()"><Spinner v-if="uploading" data-icon="inline-start" /><Upload v-else data-icon="inline-start" aria-hidden="true" />Subir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-if="manages" :open="removing !== null" @update:open="(value) => { if (!value) removing = null; }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar {{ removingShown?.title }}</DialogTitle>
          <DialogDescription>Los docentes dejarán de verlo</DialogDescription>
        </DialogHeader>
        <FeedbackAlert v-if="removeError" :message="removeError" />
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button type="button" variant="destructive" :disabled="removeProcessing" @click="remove"><Spinner v-if="removeProcessing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
