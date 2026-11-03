<script setup lang="ts">
import { FileText, FolderOpen } from '@lucide/vue';
import { onMounted, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getTeacherSupportDocuments, viewSupportDocument, type SupportDocument } from '@/api/support-documents';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { openPdfWindow, showInPdfWindow } from '@/lib/openPdf';
import { toast } from '@/lib/toast';

// Acceso del docente al material que Coordinación comparte con su carrera: solo aparece si hay documentos.
const documents = ref<SupportDocument[]>([]);
const open = ref(false);
const busyId = ref<string | null>(null);

const load = async (): Promise<void> => {
  try {
    documents.value = (await getTeacherSupportDocuments()).data;
  } catch {
    if (!open.value) documents.value = [];
  }
};
onMounted(load);
// Al abrir se vuelve a pedir la lista: un documento que se estaba preparando puede ya estar listo.
watch(open, (value) => { if (value) void load(); });

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
</script>

<template>
  <template v-if="documents.length > 0 || open">
    <IconTooltip label="Documentos de apoyo">
      <Button type="button" variant="ghost" size="icon" aria-label="Documentos de apoyo" @click="open = true"><FolderOpen aria-hidden="true" /></Button>
    </IconTooltip>
    <Dialog v-model:open="open">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Documentos de apoyo</DialogTitle>
          <DialogDescription>Material que Coordinación comparte con los docentes de la carrera. Cada documento se abre en una ventana aparte</DialogDescription>
        </DialogHeader>
        <p v-if="documents.length === 0" class="text-sm text-muted-foreground">Coordinación ya no tiene documentos compartidos</p>
        <ul v-else class="flex flex-col divide-y rounded-md border">
          <li v-for="document in documents" :key="document.id">
            <Button
              type="button"
              variant="ghost"
              class="h-auto w-full justify-start gap-3 rounded-none px-3 py-2.5 text-left font-normal whitespace-normal"
              :aria-label="`Abrir ${document.title}`"
              :disabled="document.view !== 'lista' || busyId !== null"
              @click="view(document)"
            >
              <Spinner v-if="busyId === document.id" class="size-4 shrink-0" />
              <FileText v-else class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-medium">{{ document.title }}</span>
                <span v-if="document.view === 'pendiente'" class="text-xs text-muted-foreground">Preparando vista</span>
                <span v-else-if="document.view === 'sin_vista'" class="text-xs text-muted-foreground">No se pudo preparar la vista</span>
                <span v-else class="text-xs text-muted-foreground">{{ sizeOf(document.size) }} · {{ formatDateDisplay(document.uploaded_at) }}</span>
              </span>
            </Button>
          </li>
        </ul>
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  </template>
</template>
