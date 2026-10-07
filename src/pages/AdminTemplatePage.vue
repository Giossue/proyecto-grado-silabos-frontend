<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Inbox, LoaderCircle, Plus } from '@lucide/vue';
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { paths } from '@/lib/routes';

const router = useRouter();
const payload = ref<TemplatePayload | null>(null);
const loading = ref(true);
const creating = ref(false);
const formatting = ref(false);
const loadError = ref<string | null>(null);
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

const create = async (): Promise<void> => {
    if (creating.value) return;
    creating.value = true;
    actionError.value = null;
    try {
        await createTemplate();
        await load();
    } catch (reason) {
        actionError.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo crear la plantilla.';
    } finally {
        creating.value = false;
    }
};

const format = async (): Promise<void> => {
    const templateId = payload.value?.template?.id;
    if (!templateId || formatting.value) return;

    formatting.value = true;
    actionError.value = null;
    try {
        await formatTemplate(templateId);
        await load();
    } catch (reason) {
        actionError.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo aplicar el formato oficial.';
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
    <LoadingSkeleton v-if="loading" variant="template" />

    <PageFrame
        v-else-if="loadError"
        title="Plantilla de sílabo"
        description="Hoja base de la plantilla institucional."
    >
        <LoadErrorState :message="loadError" @retry="load" />
    </PageFrame>

    <PageFrame
        v-else-if="!template"
        title="Plantilla de sílabo"
        description="El formato del sílabo: qué secciones y campos tiene, y en qué orden. Se edita en el sitio; cada sílabo entregado conserva su propia copia."
    >
        <template #actions>
            <Button :disabled="creating || Boolean(payload?.processLock)" @click="create">
                <LoaderCircle v-if="creating" class="animate-spin" aria-hidden="true" />
                <Plus v-else aria-hidden="true" />
                {{ creating ? 'Creando plantilla…' : 'Crear plantilla vacía' }}
            </Button>
        </template>

        <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        <Empty class="min-h-60 gap-3 border-0 p-6 md:p-10">
            <EmptyHeader class="gap-3">
                <EmptyMedia variant="icon" class="text-muted-foreground"><Inbox aria-hidden="true" /></EmptyMedia>
                <EmptyTitle class="text-sm font-normal text-muted-foreground">
                    No hay una plantilla institucional. Cree el contenedor vacío y decida si desea configurarlo manualmente o aplicar el formato oficial.
                </EmptyTitle>
            </EmptyHeader>
        </Empty>
    </PageFrame>

    <PageFrame
        v-else-if="template"
        title="Plantilla de sílabo"
        description="El formato del sílabo: qué secciones y campos tiene, quién escribe cada uno y en qué orden. Cada sílabo entregado conserva su propia copia."
        size="wide"
        :header-width="794"
    >
        <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        <Alert v-if="payload?.templateChangedDuringPause" class="mb-4">
            <AlertDescription>Al reanudar el proceso, todos los sílabos de este período se rehacen desde cero.</AlertDescription>
        </Alert>
        <ProcessLockAlert v-if="payload?.processLock" class="mb-4" />

        <TemplateVisualBuilder :template="template" :process-lock="payload?.processLock" :logos="payload?.logos" :designs="payload?.sectionDesigns" :can-format="template.sections.length === 0" :formatting="formatting" @changed="reloadFromMutation" @format="format" />
    </PageFrame>
</template>
