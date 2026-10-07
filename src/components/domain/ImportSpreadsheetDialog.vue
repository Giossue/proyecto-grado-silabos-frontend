<script setup lang="ts">
import { Download, FileSpreadsheet, Upload } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { downloadImportTemplate, sendImport, type ImportResult } from '@/api/spreadsheet-import';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = defineProps<{
    title: string;
    description: string;
    endpoint: string;
    templateEndpoint: string;
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
        result.value = await sendImport(props.endpoint, file.value, confirm, props.extra);
        if (confirm && result.value.valid) {
            open.value = false;
            emit('imported', `${result.value.created} registros importados.`);
        }
    } catch (reason) {
        result.value = null;
        error.value = reason instanceof ApiError ? Object.values(reason.errors).flat()[0] ?? reason.message : 'No se pudo procesar el archivo.';
    } finally { processing.value = false; }
};
const pick = (event: Event): void => {
    file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
    result.value = null; error.value = null;
};
const download = async (): Promise<void> => {
    try { await downloadImportTemplate(props.templateEndpoint, props.templateName); }
    catch { error.value = 'No se pudo descargar la plantilla.'; }
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger as-child><Button type="button" variant="outline"><FileSpreadsheet data-icon="inline-start" aria-hidden="true" />Importar desde Excel</Button></DialogTrigger>
        <DialogContent class="max-h-screen overflow-y-auto sm:max-w-3xl">
            <DialogHeader><DialogTitle>{{ title }}</DialogTitle><DialogDescription>{{ description }}</DialogDescription></DialogHeader>
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2 text-sm">
                    <p>1. Descargue la plantilla y complete una fila por registro.</p>
                    <Button type="button" variant="outline" class="w-fit" @click="download"><Download data-icon="inline-start" aria-hidden="true" />Descargar plantilla</Button>
                    <p>2. Suba el archivo .xlsx y revise el resultado antes de importar.</p>
                    <Input type="file" accept=".xlsx" aria-label="Archivo Excel" @change="pick" />
                </div>
                <FeedbackAlert v-if="error" :message="error" />
                <template v-if="result">
                    <p v-if="result.valid" class="text-sm">Todas las filas son válidas ({{ result.rows.length }}). Confirme para importarlas.</p>
                    <p v-else class="text-sm text-destructive">{{ failedRows }} fila(s) con errores. Corrija el archivo y vuelva a subirlo; no se importó nada.</p>
                    <Table>
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
                    <Button type="button" variant="outline" :disabled="!file || processing" @click="run(false)"><Spinner v-if="processing" data-icon="inline-start" />Revisar archivo</Button>
                    <Button type="button" :disabled="!result?.valid || processing" @click="run(true)"><Upload data-icon="inline-start" aria-hidden="true" />Importar</Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
