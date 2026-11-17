<script setup lang="ts">
import { History, ListChecks, RotateCcw, X } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getTemplateVersion, getTemplateVersionComparison, getTemplateVersions, type TemplateVersionDraft, type TemplateVersionSummary } from '@/api/template';
import EmptyState from '@/components/domain/EmptyState.vue';
import TemplateHistoryChanges, { type TemplateComparison } from '@/components/domain/configuration/TemplateHistoryChanges.vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatDateDisplay } from '@/lib/dateDisplay';

const props = defineProps<{ templateId: string; locked?: string | null }>();
const emit = defineEmits<{ restore: [draft: TemplateVersionDraft, number: number] }>();
const open = defineModel<boolean>('open', { required: true });

const versions = ref<TemplateVersionSummary[] | null>(null);
const failure = ref<string | null>(null);
const changes = ref<Record<string, TemplateComparison>>({});
const confirming = ref<TemplateVersionSummary | null>(null);
const restoring = ref(false);
const restoreError = ref<string | null>(null);

const message = (reason: unknown, fallback: string): string => reason instanceof ApiError ? reason.message : fallback;

const load = async (): Promise<void> => {
    versions.value = null;
    failure.value = null;
    changes.value = {};
    try {
        versions.value = (await getTemplateVersions(props.templateId)).versions;
    } catch (reason) {
        failure.value = message(reason, 'No se pudo leer el historial');
    }
};
watch(open, (value) => { if (value) void load(); }, { immediate: true });

const toggleChanges = async (version: TemplateVersionSummary): Promise<void> => {
    if (changes.value[version.id] !== undefined) {
        const next = { ...changes.value };
        delete next[version.id];
        changes.value = next;
        return;
    }
    changes.value = { ...changes.value, [version.id]: { status: 'loading' } };
    try {
        changes.value = { ...changes.value, [version.id]: { status: 'ready', items: (await getTemplateVersionComparison(props.templateId, version.id)).changes } };
    } catch (reason) {
        changes.value = { ...changes.value, [version.id]: { status: 'error', message: message(reason, 'No se pudo comparar') } };
    }
};

const askRestore = (version: TemplateVersionSummary): void => {
    restoreError.value = null;
    confirming.value = version;
};
const restore = async (): Promise<void> => {
    const version = confirming.value;
    if (!version || restoring.value) return;
    restoring.value = true;
    restoreError.value = null;
    try {
        const detail = await getTemplateVersion(props.templateId, version.id);
        confirming.value = null;
        open.value = false;
        emit('restore', detail.draft, detail.number);
    } catch (reason) {
        restoreError.value = message(reason, 'No se pudo cargar la versión');
    } finally {
        restoring.value = false;
    }
};
</script>

<template>
    <Sheet v-model:open="open">
        <SheetContent
            dismissable
            class="top-0 right-0 left-auto h-dvh max-h-none w-full translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-r-0 duration-300 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md"
        >
            <div class="flex items-center justify-between gap-2 border-b px-6 py-4">
                <div class="flex min-w-0 flex-col gap-0.5"><SheetTitle class="text-lg font-semibold">Historial</SheetTitle><SheetDescription>Cada guardado de la plantilla queda como una versión</SheetDescription></div>
                <IconTooltip label="Cerrar historial"><SheetClose as-child><Button type="button" variant="ghost" size="icon" aria-label="Cerrar historial"><X aria-hidden="true" /></Button></SheetClose></IconTooltip>
            </div>
            <Alert v-if="locked" class="mx-6 mt-4 w-auto"><AlertDescription>No se puede restaurar ahora: {{ locked }}</AlertDescription></Alert>
            <ScrollArea class="min-h-0 flex-1">
                <div class="flex flex-col gap-3 py-4">
                    <div v-if="!versions && !failure" class="flex flex-col gap-3 px-6" aria-busy="true">
                        <span class="sr-only">Cargando historial…</span>
                        <Skeleton v-for="row in 3" :key="row" class="h-16 w-full" />
                    </div>
                    <Alert v-else-if="failure" variant="destructive" class="mx-6 w-auto"><AlertDescription>{{ failure }}</AlertDescription></Alert>
                    <EmptyState v-else-if="versions && versions.length === 0" class="mx-6" :icon="History" title="Todavía no hay versiones" />
                    <ul v-else class="flex flex-col divide-y border-y">
                        <li v-for="version in versions" :key="version.id" :data-version="version.number" class="flex flex-col gap-2 px-6 py-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex min-w-0 flex-col gap-0.5">
                                    <span class="flex items-center gap-2 font-medium">Versión {{ version.number }}<Badge v-if="version.current" variant="secondary">Actual</Badge></span>
                                    <span class="text-sm text-muted-foreground">{{ formatDateDisplay(version.saved_at) }} · {{ version.saved_by }}</span>
                                    <span class="text-xs text-muted-foreground">{{ version.sections }} secciones, {{ version.fields }} campos</span>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" :aria-expanded="changes[version.id] !== undefined" @click="toggleChanges(version)"><ListChecks data-icon="inline-start" aria-hidden="true" />Ver cambios</Button>
                                <Button type="button" variant="outline" size="sm" :disabled="Boolean(locked) || version.current" @click="askRestore(version)"><RotateCcw data-icon="inline-start" aria-hidden="true" />Restaurar</Button>
                            </div>
                            <TemplateHistoryChanges v-if="changes[version.id]" :comparison="changes[version.id]!" />
                        </li>
                    </ul>
                </div>
            </ScrollArea>
        </SheetContent>
    </Sheet>
    <Dialog :open="confirming !== null" @update:open="(value) => { if (!value && !restoring) confirming = null; }">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>¿Restaurar la versión {{ confirming?.number }}?</DialogTitle>
                <DialogDescription>Se carga en el editor como un borrador. La plantilla no cambia hasta que pulse «Guardar»</DialogDescription>
            </DialogHeader>
            <Alert v-if="restoreError" variant="destructive"><AlertDescription>{{ restoreError }}</AlertDescription></Alert>
            <DialogFooter>
                <Button type="button" variant="outline" :disabled="restoring" @click="confirming = null">Cancelar</Button>
                <Button type="button" :disabled="restoring" @click="restore"><Spinner v-if="restoring" data-icon="inline-start" /><RotateCcw v-else data-icon="inline-start" aria-hidden="true" />Cargar en el editor</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
