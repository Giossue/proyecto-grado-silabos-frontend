<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { FileText, Inbox, LoaderCircle, Plus, Sparkles } from '@lucide/vue';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { paths } from '@/lib/routes';

const router = useRouter();
const payload = ref<TemplatePayload | null>(null);
const loading = ref(true);
const creating = ref(false);
const chooserOpen = ref(true);
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

const create = async (official: boolean): Promise<void> => {
    if (creating.value) return;
    creating.value = true;
    actionError.value = null;
    try {
        await createTemplate(official);
        chooserOpen.value = false;
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
        description="El formato del sílabo: secciones y campos."
    >
        <template #actions>
            <Button :disabled="creating || Boolean(payload?.processLock)" @click="chooserOpen = true">
                <Plus aria-hidden="true" />
                Crear plantilla
            </Button>
        </template>

        <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        <Empty class="min-h-60 gap-3 border-0 p-6 md:p-10">
            <EmptyHeader class="gap-3">
                <EmptyMedia variant="icon" class="text-muted-foreground"><Inbox aria-hidden="true" /></EmptyMedia>
                <EmptyTitle class="text-sm font-normal text-muted-foreground">
                    No hay una plantilla institucional. Créela en blanco o con el formato oficial de la UEB.
                </EmptyTitle>
            </EmptyHeader>
        </Empty>
        <Dialog v-model:open="chooserOpen">
            <DialogContent class="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Crear la plantilla del sílabo</DialogTitle>
                    <DialogDescription>Elija cómo empezar. Después podrá cambiar secciones y campos.</DialogDescription>
                </DialogHeader>
                <div class="grid gap-3 sm:grid-cols-2">
                    <Button type="button" variant="outline" class="h-auto flex-col items-start gap-2 p-4 text-left whitespace-normal" :disabled="creating || Boolean(payload?.processLock)" @click="create(false)">
                        <FileText class="size-5 text-muted-foreground" aria-hidden="true" />
                        <span class="font-medium">En blanco</span>
                        <span class="text-sm text-muted-foreground">Una plantilla sin secciones. Usted agrega cada sección y campo.</span>
                    </Button>
                    <Button type="button" variant="outline" class="h-auto flex-col items-start gap-2 p-4 text-left whitespace-normal" :disabled="creating || Boolean(payload?.processLock)" @click="create(true)">
                        <Sparkles class="size-5 text-muted-foreground" aria-hidden="true" />
                        <span class="font-medium">Plantilla oficial UEB</span>
                        <span class="text-sm text-muted-foreground">El formato oficial del sílabo, con sus secciones en orden, listo para usar.</span>
                    </Button>
                </div>
                <p v-if="creating" class="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle class="size-4 animate-spin" aria-hidden="true" />Creando plantilla…</p>
            </DialogContent>
        </Dialog>
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
            <Alert v-if="payload?.templateChangedDuringPause">
                <AlertDescription>Al reanudar el proceso, todos los sílabos de este período se rehacen desde cero.</AlertDescription>
            </Alert>
            <ProcessLockAlert v-if="payload?.processLock" />
        </div>

        <TemplateVisualBuilder :template="template" :process-lock="payload?.processLock" :logos="payload?.logos" :designs="payload?.sectionDesigns" :can-format="template.sections.length === 0" :formatting="formatting" @changed="reloadFromMutation" @format="format" />
    </PageFrame>
</template>
