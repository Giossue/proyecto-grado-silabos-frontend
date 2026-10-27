<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { RotateCcw } from '@lucide/vue';
import { ApiError } from '@/api/client';
import { createTemplate, getTemplate, type TemplatePayload } from '@/api/template';
import { getSession } from '@/api/session';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import { useDiscardConfirmation } from '@/composables/useDiscardConfirmation';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { paths } from '@/lib/routes';

const router = useRouter();
const payload = ref<TemplatePayload | null>(null);
const loading = ref(true);
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

const unsaved = ref(false);
const { open: discardOpen, ask: askToDiscard, decide: decideDiscard } = useDiscardConfirmation();
const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!unsaved.value) return;
    event.preventDefault();
    event.returnValue = '';
};
onBeforeRouteLeave(() => !unsaved.value || askToDiscard());

const reloadFromMutation = (): void => {
    void load({ silent: true });
};

onMounted(() => {
    window.addEventListener('silabos:template-changed', reloadFromMutation);
    window.addEventListener('beforeunload', warnBeforeUnload);
    void load();
});
onBeforeUnmount(() => {
    window.removeEventListener('silabos:template-changed', reloadFromMutation);
    window.removeEventListener('beforeunload', warnBeforeUnload);
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
        <template v-if="payload?.templateChangedDuringPause || payload?.processLock" #banner>
            <ProcessLockAlert v-if="payload?.templateChangedDuringPause" banner :icon="RotateCcw" title="Plantilla modificada durante la pausa" message="Al reanudar el proceso, todos los sílabos de este período se rehacen desde cero." hide-action />
            <ProcessLockAlert v-if="payload?.processLock" banner :lock="payload.processLockDetail" />
        </template>
        <div class="mx-auto flex flex-col gap-4 empty:hidden" :style="{ width: `${SHEET_WIDTH}px`, maxWidth: '100%' }">
            <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        </div>

        <TemplateVisualBuilder :template="template" :process-lock="payload?.processLock" :logos="payload?.logos" :variables="payload?.variables" :presets="payload?.presets" @changed="reloadFromMutation" @dirty="unsaved = $event" />
        <UnsavedChangesDialog :open="discardOpen" title="Hay cambios sin guardar" description="Los cambios de la plantilla no se guardaron. Si sale, los perderá" discard-label="Salir y descartar cambios" @continue="decideDiscard(false)" @discard="decideDiscard(true)" @update:open="(value) => { if (!value) decideDiscard(false); }" />
    </PageFrame>
</template>
