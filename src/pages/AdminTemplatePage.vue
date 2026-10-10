<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { RotateCcw } from '@lucide/vue';
import { ApiError } from '@/api/client';
import { createTemplate, formatTemplate, getTemplate, type TemplatePayload } from '@/api/template';
import { getSession } from '@/api/session';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';

const router = useRouter();
const payload = ref<TemplatePayload | null>(null);
const loading = ref(true);
const resetOpen = ref(false);
const formatting = ref(false);
const loadError = ref<string | null>(null);
const SHEET_WIDTH = 794;
const actionError = ref<string | null>(null);
const template = computed(() => payload.value?.template ?? null);

const load = async ({ silent = false }: { silent?: boolean } = {}): Promise<void> => {
    if (!silent) {
        loading.value = true;
        loadError.value = null;
    }

    try {
        if (!silent) {
            const session = await getSession();
            if (session.active_role?.code !== 'administrador') {
                await router.replace(paths.dashboard);
                return;
            }
        }

        payload.value = await getTemplate();
        if (!silent && payload.value.template === null) {
            await createTemplate();
            payload.value = await getTemplate();
        }
    } catch (reason) {
        const message = reason instanceof ApiError
            ? reason.message
            : 'No se pudo cargar la plantilla.';

        if (silent) {
            actionError.value = message;
        } else {
            loadError.value = message;
        }
    } finally {
        if (!silent) {
            loading.value = false;
        }
    }
};

const format = async (): Promise<void> => {
    const templateId = payload.value?.template?.id;
    if (!templateId || formatting.value) return;

    formatting.value = true;
    actionError.value = null;
    try {
        await formatTemplate(templateId);
        resetOpen.value = false;
        await load();
    } catch (reason) {
        actionError.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo restablecer la plantilla.';
    } finally {
        formatting.value = false;
    }
};

const reloadFromMutation = (): void => {
    void load({ silent: true });
};

onMounted(() => {
    window.addEventListener('silabos:template-changed', reloadFromMutation);
    void load();
});
onBeforeUnmount(() => {
    window.removeEventListener('silabos:template-changed', reloadFromMutation);
});
</script>

<template>
    <PageFrame
        v-if="loading"
        title="Plantilla de sílabo"
        description="El formato del sílabo: secciones y campos."
        size="wide"
        :header-width="SHEET_WIDTH"
    >
        <LoadingSkeleton variant="template" />
    </PageFrame>

    <PageFrame
        v-else-if="loadError"
        title="Plantilla de sílabo"
        description="Hoja base de la plantilla institucional."
    >
        <LoadErrorState :message="loadError" @retry="load" />
    </PageFrame>

    <PageFrame
        v-else-if="template"
        title="Plantilla de sílabo"
        description="El formato del sílabo: secciones y campos."
        size="wide"
        :header-width="SHEET_WIDTH"
    >
        <div class="mx-auto flex flex-col gap-4 empty:hidden" :style="{ width: `${SHEET_WIDTH}px`, maxWidth: '100%' }">
            <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
            <ProcessLockAlert v-if="payload?.templateChangedDuringPause" :icon="RotateCcw" title="Plantilla modificada durante la pausa" message="Al reanudar el proceso, todos los sílabos de este período se rehacen desde cero." hide-action />
            <ProcessLockAlert v-if="payload?.processLock" :lock="payload.processLockDetail" />
            <div class="flex justify-end">
                <Button type="button" variant="outline" :disabled="Boolean(payload?.processLock) || formatting" @click="resetOpen = true">
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    Restablecer a plantilla oficial
                </Button>
            </div>
        </div>

        <TemplateVisualBuilder :template="template" :process-lock="payload?.processLock" :logos="payload?.logos" :variables="payload?.variables" @changed="reloadFromMutation" />
        <Dialog v-model:open="resetOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Restablecer a plantilla oficial</DialogTitle>
                    <DialogDescription>Se reemplazarán todas las secciones y campos actuales por el formato oficial de la UEB. Los cambios que hizo se perderán.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose as-child><Button type="button" variant="outline" :disabled="formatting">Cancelar</Button></DialogClose>
                    <Button type="button" :disabled="formatting" @click="format">
                        <Spinner v-if="formatting" data-icon="inline-start" /><RotateCcw v-else data-icon="inline-start" aria-hidden="true" />
                        Restablecer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </PageFrame>
</template>
