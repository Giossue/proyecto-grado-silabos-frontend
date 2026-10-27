<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileSpreadsheet, Upload } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { downloadImportTemplate, sendImport, type ImportKind, type ImportResult } from '@/api/spreadsheet-import';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = defineProps<{
    title: string;
    kind: ImportKind;
    templateName: string;
    columns: { key: string; label: string }[];
    extra?: Record<string, string>;
}>();
const emit = defineEmits<{ imported: [message: string] }>();
const open = ref(false);
const file = ref<File | null>(null);
const result = ref<ImportResult | null>(null);
const processing = ref(false);
const error = ref<string | null>(null);
const failedRows = computed(() => result.value?.rows.filter((row) => row.errors.length > 0).length ?? 0);

watch(open, (value) => { if (value) { file.value = null; result.value = null; error.value = null; } });

const run = async (confirm: boolean): Promise<void> => {
    if (!file.value) return;
    processing.value = true; error.value = null;
    try {
        result.value = await sendImport(props.kind, file.value, confirm, props.extra);
        if (confirm && result.value.valid) {
            open.value = false;
            emit('imported', `${result.value.created} registros importados.`);
        }
    } catch (reason) {
        result.value = null;
        error.value = reason instanceof ApiError ? Object.values(reason.errors).flat()[0] ?? reason.message : 'No se pudo procesar el archivo.';
    } finally { processing.value = false; }
};
const reset = (): void => { result.value = null; };
const invalidFile = (message: string | null): void => { error.value = message; };
const download = async (): Promise<void> => {
    try { await downloadImportTemplate(props.kind, props.templateName); }
    catch { error.value = 'No se pudo descargar la plantilla.'; }
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger as-child><Button type="button" variant="success"><FileSpreadsheet data-icon="inline-start" aria-hidden="true" />Importar desde Excel</Button></DialogTrigger>
        <DialogContent :aria-describedby="undefined" class="max-h-screen flex flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
            <ScrollArea class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-2rem)]">
                <div class="grid gap-4 p-6">
                    <DialogHeader><DialogTitle>{{ title }}</DialogTitle></DialogHeader>
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-2 text-sm">
                            <p>1. Descargue la plantilla y complete una fila por registro.</p>
                            <Button type="button" variant="outline" class="w-fit" @click="download"><Download data-icon="inline-start" aria-hidden="true" />Descargar plantilla</Button>
                            <p>2. Suba el archivo .xlsx y revise el resultado antes de importar.</p>
                            <FileDropzone v-model="file" input-id="import-spreadsheet-file" kind="xlsx" :max-bytes="2 * 1024 * 1024" :disabled="processing" :invalid="Boolean(error)" @update:model-value="reset" @validation-error="invalidFile" />
                        </div>
                        <FeedbackAlert v-if="error" :message="error" />
                        <template v-if="result">
                            <p v-if="result.valid" class="text-sm">Todas las filas son válidas ({{ result.rows.length }}). Confirme para importarlas.</p>
                            <p v-else class="text-sm text-destructive">{{ failedRows }} fila(s) con errores. Corrija el archivo y vuelva a subirlo; no se importó nada.</p>
                            <Table label="Vista previa de la importación">
                                <TableHeader><TableRow><TableHead>Fila</TableHead><TableHead v-for="column in columns" :key="column.key">{{ column.label }}</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow v-for="row in result.rows" :key="row.line">
                                        <TableCell>{{ row.line }}</TableCell>
                                        <TableCell v-for="column in columns" :key="column.key">{{ row.values[column.key] }}</TableCell>
                                        <TableCell :class="row.errors.length ? 'text-destructive' : 'text-muted-foreground'">{{ row.errors.length ? row.errors.join(' ') : 'Válida' }}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </template>
                        <div class="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="outline" :disabled="processing" @click="open = false">Cancelar</Button>
                            <Button v-if="result?.valid" type="button" variant="success" :disabled="processing" @click="run(true)"><Spinner v-if="processing" data-icon="inline-start" /><Upload v-else data-icon="inline-start" aria-hidden="true" />Importar</Button>
                            <Button v-else type="button" :disabled="!file || processing" @click="run(false)"><Spinner v-if="processing" data-icon="inline-start" />Revisar</Button>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
</template>
