<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { ArrowLeft, Bot, Pencil, RotateCcw, UserPen, X } from '@lucide/vue';
import { ApiError } from '@/api/client';
import { createTemplate, getTemplate, getTemplateTeacherPreview, previewTemplateDraft, type TemplatePayload } from '@/api/template';
import type { SyllabusDetail, SyllabusField } from '@/api/syllabi';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import SyllabusTeacherForm from '@/components/domain/syllabus/SyllabusTeacherForm.vue';
import type { DocumentNode } from '@/lib/templateDocument';
import { getSession } from '@/api/session';
import { applyTemplateAssistantProposal, discardTemplateAssistantProposal, getTemplateAssistantProposal } from '@/api/templateAssistant';
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
import { toast } from '@/lib/toast';
import { paths } from '@/lib/routes';

const router = useRouter();
const payload = ref<TemplatePayload | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const SHEET_WIDTH = 794;
const actionError = ref<string | null>(null);
const template = computed(() => payload.value?.template ?? null);
// «Ver como docente»: el formulario que llenará el docente con la plantilla guardada. Lo que se escriba para probar no se guarda.
const teacherView = ref(false);
const teacherSections = ref<SyllabusDetail['sections'] | null>(null);
const teacherError = ref<string | null>(null);
const teacherSection = ref('');
const teacherCollapsed = ref<Set<string>>(new Set());
const toggleTeacherView = async (): Promise<void> => {
    teacherView.value = !teacherView.value;
    if (!teacherView.value || !template.value) return;
    teacherSections.value = null;
    teacherError.value = null;
    try {
        const draft = editing.value ? builder.value?.payload() : undefined;
        teacherSections.value = draft ? (await previewTemplateDraft(template.value.id, draft)).sections : (await getTemplateTeacherPreview(template.value.id)).sections;
    } catch (reason) {
        teacherError.value = reason instanceof ApiError ? reason.message : 'No se pudo armar la vista del docente';
    }
};
const tryValue = (field: SyllabusField, value: DocumentNode): void => {
    teacherSections.value = (teacherSections.value ?? []).map((section) => ({ ...section, fields: section.fields.map((item) => (item.id === field.id ? { ...item, value } : item)) }));
};

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
            : 'No se pudo cargar la plantilla';

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
const deciding = ref<string | null>(null);
const draftVersion = computed(() => builder.value?.draftVersion ?? '');
const draftSnapshot = () => builder.value?.snapshot() ?? { sections: [], version: '' };
const apiFailure = (reason: unknown, fallback: string): string => reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : fallback;
const toggleAssistant = (): void => {
    assistantLoaded.value = true;
    assistantOpen.value = !assistantOpen.value;
};
const applyProposal = async (id: string): Promise<void> => {
    if (deciding.value) return;
    deciding.value = id;
    try {
        const proposal = await getTemplateAssistantProposal(id);
        if (proposal.draft_version !== draftVersion.value) {
            toast.error('El borrador cambió. Pida la propuesta de nuevo');
            return;
        }
        await applyTemplateAssistantProposal(id);
        builder.value?.applyProposal(proposal);
        toast.success('Cambios aplicados. Guárdelos con «Guardar»');
    } catch (reason) {
        toast.error(apiFailure(reason, 'No se pudo aplicar la propuesta'));
    } finally {
        deciding.value = null;
        assistantRefresh.value += 1;
    }
};
const discardProposal = async (id: string): Promise<void> => {
    if (deciding.value) return;
    deciding.value = id;
    try {
        await discardTemplateAssistantProposal(id);
    } catch (reason) {
        toast.error(apiFailure(reason, 'No se pudo descartar la propuesta'));
    } finally {
        deciding.value = null;
        assistantRefresh.value += 1;
    }
};

watch(editing, () => {
    teacherView.value = false;
});

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
    <header v-if="editing" class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur sm:px-5" aria-label="Herramientas de la plantilla">
        <Button type="button" variant="link" size="sm" class="h-auto px-0" data-tour="template-back" @click="builder?.leave()"><ArrowLeft aria-hidden="true" />Volver a la vista</Button>
        <span class="flex-1" />
        <IconTooltip :label="teacherView ? 'Volver a la plantilla' : 'Ver como docente'"><Button type="button" :variant="teacherView ? 'secondary' : 'ghost'" size="icon" aria-label="Ver como docente" :aria-pressed="teacherView" data-draft-teacher-view @click="toggleTeacherView"><UserPen aria-hidden="true" /></Button></IconTooltip>
        <AppearanceToggle />
    </header>
    <PageFrame
        v-if="loading"
        title="Plantilla de sílabo"
        description="El formato del sílabo: secciones y campos"
        size="wide"
        :header-width="SHEET_WIDTH"
        loading
        :actions-skeleton="['w-22']"
    >
        <LoadingSkeleton variant="template" />
    </PageFrame>

    <PageFrame
        v-else-if="loadError"
        title="Plantilla de sílabo"
        description="Hoja base de la plantilla institucional"
    >
        <LoadErrorState :message="loadError" @retry="load" />
    </PageFrame>

    <PageFrame
        v-else-if="template"
        title="Plantilla de sílabo"
        description="El formato del sílabo: secciones y campos"
        size="wide"
        :header-width="SHEET_WIDTH"
    >
        <template v-if="payload?.templateChangedDuringPause || payload?.processLock" #banner>
            <ProcessLockAlert v-if="payload?.templateChangedDuringPause" banner :icon="RotateCcw" title="Plantilla modificada durante la pausa" message="Al reanudar el proceso, los sílabos de este período se adaptan a la plantilla: se conserva lo escrito y los enviados o aprobados vuelven a borrador" hide-action />
            <ProcessLockAlert v-if="payload?.processLock" banner :lock="payload.processLockDetail" />
        </template>
        <template v-if="!editing" #actions>
            <IconTooltip :label="teacherView ? 'Volver a la plantilla' : 'Ver como docente'"><Button type="button" :variant="teacherView ? 'secondary' : 'ghost'" size="icon" aria-label="Ver como docente" :aria-pressed="teacherView" @click="toggleTeacherView"><UserPen aria-hidden="true" /></Button></IconTooltip>
            <Button v-if="!teacherView" type="button" data-tour="template-edit" :disabled="Boolean(payload?.processLock)" @click="builder?.askEdit()"><Pencil data-icon="inline-start" aria-hidden="true" />Editar</Button>
        </template>
        <div class="mx-auto flex flex-col gap-4 empty:hidden" :style="{ width: `${SHEET_WIDTH}px`, maxWidth: '100%' }">
            <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        </div>

        <div v-if="teacherView" class="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <Alert v-if="teacherError" variant="destructive"><AlertDescription>{{ teacherError }}</AlertDescription></Alert>
            <LoadingSkeleton v-else-if="!teacherSections" variant="syllabus" />
            <template v-else>
                <Alert><AlertDescription>{{ editing ? 'Vista de prueba del borrador sin guardar: así verá el formulario el docente. Lo que escriba aquí no se guarda' : 'Vista de prueba: así verá el formulario el docente. Lo que escriba aquí no se guarda' }}</AlertDescription></Alert>
                <SyllabusTeacherForm v-model:active="teacherSection" v-model:collapsed="teacherCollapsed" :sections="teacherSections" @update:value="tryValue" />
            </template>
        </div>
        <!-- El editor tiene varias raíces: se oculta su contenedor (v-show en el componente no tendría efecto) -->
        <div v-show="!teacherView" class="contents">
            <TemplateVisualBuilder ref="builder" :template="template" :process-lock="payload?.processLock" :logos="payload?.logos" :variables="payload?.variables" :presets="payload?.presets" :block-designs="payload?.blockDesigns" @changed="reloadFromMutation" @dirty="unsaved = $event" @editing="editing = $event" />
        </div>
        <template v-if="editing">
            <aside v-if="assistantLoaded" v-show="assistantOpen" class="fixed right-6 bottom-24 z-40 h-[min(var(--layout-assistant-height),calc(100dvh-7rem))] w-(--layout-syllabus-aside-width) max-w-[calc(100vw-2rem)] max-sm:inset-x-4 max-sm:top-20 max-sm:right-4 max-sm:h-auto max-sm:w-auto" aria-label="Asistente de plantilla">
                <TemplateAssistant :refresh="assistantRefresh" :draft-version="draftVersion" :snapshot="draftSnapshot" :busy="deciding" @apply="applyProposal" @discard="discardProposal" />
            </aside>
            <Button type="button" data-tour="template-assistant" class="fixed right-6 bottom-6 z-40 h-12 rounded-full px-5 shadow-menu" :aria-expanded="assistantOpen" @click="toggleAssistant">
                <X v-if="assistantOpen" data-icon="inline-start" aria-hidden="true" /><Bot v-else data-icon="inline-start" aria-hidden="true" />{{ assistantOpen ? 'Cerrar asistente' : 'Asistente' }}
            </Button>
        </template>
        <UnsavedChangesDialog :open="discardOpen" title="Hay cambios sin guardar" description="Los cambios de la plantilla no se guardaron. Si sale, los perderá" discard-label="Salir y descartar cambios" @continue="decideDiscard(false)" @discard="decideDiscard(true)" @update:open="(value) => { if (!value) decideDiscard(false); }" />
    </PageFrame>
</template>
