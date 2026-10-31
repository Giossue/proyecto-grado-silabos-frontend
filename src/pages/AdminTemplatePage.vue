<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { ArrowLeft, Bot, Check, RotateCcw, Trash2, X } from '@lucide/vue';
import { ApiError } from '@/api/client';
import { createTemplate, getTemplate, type TemplatePayload } from '@/api/template';
import { getSession } from '@/api/session';
import { applyTemplateAssistantProposal, discardTemplateAssistantProposal, getTemplateAssistantProposal, proposalPreview, type TemplateProposalPreview } from '@/api/templateAssistant';
import TemplateAssistant from '@/components/domain/ai/TemplateAssistant.vue';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import UnsavedChangesDialog from '@/components/domain/UnsavedChangesDialog.vue';
import { useDiscardConfirmation } from '@/composables/useDiscardConfirmation';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useCountdown } from '@/composables/useCountdown';
import { toast } from '@/lib/toast';
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
const editing = ref(false);
const builder = ref<InstanceType<typeof TemplateVisualBuilder> | null>(null);
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

const assistantOpen = ref(false);
const assistantLoaded = ref(false);
const assistantRefresh = ref(0);
const proposal = ref<TemplateProposalPreview | null>(null);
const deciding = ref<'apply' | 'discard' | null>(null);
const applyOpen = ref(false);
const applyCountdown = useCountdown(applyOpen);
const apiFailure = (reason: unknown, fallback: string): string => reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : fallback;
const toggleAssistant = (): void => {
    assistantLoaded.value = true;
    assistantOpen.value = !assistantOpen.value;
};
const viewProposal = async (id: string): Promise<void> => {
    actionError.value = null;
    try {
        proposal.value = proposalPreview(await getTemplateAssistantProposal(id));
    } catch (reason) {
        actionError.value = apiFailure(reason, 'No se pudo abrir la propuesta');
    }
};
const closeProposal = (): void => {
    proposal.value = null;
};
const decided = async (message: string): Promise<void> => {
    proposal.value = null;
    assistantRefresh.value += 1;
    await load({ silent: true });
    toast.success(message);
};
const applyProposal = async (): Promise<void> => {
    if (!proposal.value || deciding.value) return;
    deciding.value = 'apply';
    actionError.value = null;
    try {
        await applyTemplateAssistantProposal(proposal.value.id);
        applyOpen.value = false;
        await decided('Propuesta aplicada');
    } catch (reason) {
        applyOpen.value = false;
        actionError.value = apiFailure(reason, 'No se pudo aplicar la propuesta');
        assistantRefresh.value += 1;
    } finally {
        deciding.value = null;
    }
};
const discardProposal = async (): Promise<void> => {
    if (!proposal.value || deciding.value) return;
    deciding.value = 'discard';
    actionError.value = null;
    try {
        await discardTemplateAssistantProposal(proposal.value.id);
        await decided('Propuesta descartada');
    } catch (reason) {
        actionError.value = apiFailure(reason, 'No se pudo descartar la propuesta');
    } finally {
        deciding.value = null;
    }
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
    <header v-if="editing" class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 shadow-surface backdrop-blur sm:px-5" aria-label="Herramientas de la plantilla">
        <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="builder?.leave()"><ArrowLeft aria-hidden="true" />Volver a la vista</Button>
        <span class="flex-1" />
        <AppearanceToggle />
    </header>
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

        <TemplateVisualBuilder ref="builder" :template="template" :process-lock="payload?.processLock" :logos="payload?.logos" :variables="payload?.variables" :presets="payload?.presets" :proposal="proposal" @changed="reloadFromMutation" @dirty="unsaved = $event" @editing="editing = $event">
            <template #proposal-actions>
                <span class="px-2 text-sm font-medium">Propuesta del asistente</span>
                <Button type="button" variant="ghost" :disabled="deciding !== null" @click="closeProposal"><X data-icon="inline-start" aria-hidden="true" />Cerrar</Button>
                <Button type="button" variant="outline" :disabled="deciding !== null" @click="discardProposal"><Spinner v-if="deciding === 'discard'" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Descartar</Button>
                <Button type="button" :disabled="deciding !== null || Boolean(payload?.processLock)" @click="applyOpen = true"><Check data-icon="inline-start" aria-hidden="true" />Aplicar</Button>
            </template>
        </TemplateVisualBuilder>
        <template v-if="!editing">
            <aside v-if="assistantLoaded" v-show="assistantOpen" class="fixed right-6 bottom-20 z-40 h-[min(var(--layout-assistant-height),calc(100dvh-8rem))] w-(--layout-syllabus-aside-width) max-w-[calc(100vw-2rem)] max-sm:inset-x-4 max-sm:top-20 max-sm:right-4 max-sm:bottom-[calc(var(--mobile-nav-height)+5rem)] max-sm:h-auto max-sm:w-auto" aria-label="Asistente de plantilla">
                <TemplateAssistant :refresh="assistantRefresh" :viewing="proposal?.id ?? null" @view="viewProposal" />
            </aside>
            <Button type="button" class="fixed right-20 bottom-4 z-40 h-12 rounded-full px-5 shadow-menu max-sm:right-4 max-sm:bottom-[calc(var(--mobile-nav-height)+1rem)]" :aria-expanded="assistantOpen" @click="toggleAssistant">
                <X v-if="assistantOpen" data-icon="inline-start" aria-hidden="true" /><Bot v-else data-icon="inline-start" aria-hidden="true" />{{ assistantOpen ? 'Cerrar asistente' : 'Asistente' }}
            </Button>
        </template>
        <Dialog v-model:open="applyOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Aplicar la propuesta</DialogTitle>
                    <DialogDescription>Al aplicarla:</DialogDescription>
                    <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        <li>La plantilla cambia como indica la propuesta</li>
                        <li>Al reanudar una convocatoria en pausa, sus sílabos se rehacen desde cero</li>
                        <li>En el próximo período, los docentes no conservan lo que escribieron</li>
                    </ul>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" @click="applyOpen = false">Cancelar</Button>
                    <Button type="button" :disabled="applyCountdown > 0 || deciding !== null" @click="applyProposal"><Spinner v-if="deciding === 'apply'" data-icon="inline-start" /><Check v-else data-icon="inline-start" aria-hidden="true" />{{ applyCountdown > 0 ? `Aplicar (${applyCountdown})` : 'Aplicar' }}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <UnsavedChangesDialog :open="discardOpen" title="Hay cambios sin guardar" description="Los cambios de la plantilla no se guardaron. Si sale, los perderá" discard-label="Salir y descartar cambios" @continue="decideDiscard(false)" @discard="decideDiscard(true)" @update:open="(value) => { if (!value) decideDiscard(false); }" />
    </PageFrame>
</template>
