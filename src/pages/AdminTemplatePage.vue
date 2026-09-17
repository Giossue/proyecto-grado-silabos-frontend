<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Inbox, LoaderCircle, Pencil, Plus } from '@lucide/vue';
import { ApiError } from '@/api/client';
import { createTemplate, getTemplate, type TemplatePayload } from '@/api/template';
import { getSession } from '@/api/session';
import TemplateAppearanceSheet from '@/components/domain/configuration/TemplateAppearanceSheet.vue';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { TemplateAppearance, TemplateBuilderProps } from '@/types/configuration';
import { paths } from '@/lib/routes';

const router = useRouter();
const payload = ref<TemplatePayload | null>(null);
const loading = ref(true);
const creating = ref(false);
const editing = ref(false);
const appearanceOpen = ref(false);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const previewAppearance = ref<TemplateAppearance | null>(null);

const builder = computed<TemplateBuilderProps | null>(() => {
    const value = payload.value;
    if (
        !value?.template ||
        !value.variables ||
        !value.identificationDesign ||
        !value.logos ||
        !value.blockTypes ||
        !value.appearanceOptions
    ) return null;

    return {
        processLock: value.processLock,
        identificationSample: value.identificationSample ?? [],
        variables: value.variables,
        identificationDesign: value.identificationDesign,
        logos: value.logos,
        template: value.template as TemplateBuilderProps['template'],
        blockTypes: value.blockTypes,
        appearanceOptions: value.appearanceOptions as TemplateBuilderProps['appearanceOptions'],
    };
});

watch(
    () => builder.value?.template.appearance,
    (appearance) => {
        if (appearance) previewAppearance.value = { ...appearance };
    },
    { deep: true, immediate: true },
);

const load = async (): Promise<void> => {
    loading.value = true;
    loadError.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'administrador') {
            await router.replace(paths.dashboard);
            return;
        }
        payload.value = await getTemplate();
    } catch (reason) {
        loadError.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo cargar la plantilla.';
    } finally {
        loading.value = false;
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

const reloadFromMutation = (): void => {
    void load();
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
        v-else-if="!payload?.template"
        title="Plantilla de sílabo"
        description="El formato del sílabo: qué campos tiene y en qué orden. Se edita en el sitio; cada sílabo entregado conserva su propia copia."
    >
        <template #actions>
            <Button v-if="!payload?.processLock" :disabled="creating" @click="create">
                <LoaderCircle v-if="creating" class="animate-spin" aria-hidden="true" />
                <Plus v-else aria-hidden="true" />
                {{ creating ? 'Creando plantilla…' : 'Nueva plantilla' }}
            </Button>
        </template>

        <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        <Empty class="min-h-60 gap-3 border-0 p-6 md:p-10">
            <EmptyHeader class="gap-3">
                <EmptyMedia variant="icon" class="text-muted-foreground"><Inbox aria-hidden="true" /></EmptyMedia>
                <EmptyTitle class="text-sm font-normal text-muted-foreground">
                    No hay una plantilla institucional. Cree la primera: trae el formato oficial completo, listo para ajustar.
                </EmptyTitle>
            </EmptyHeader>
        </Empty>
    </PageFrame>

    <div v-else-if="editing && builder && previewAppearance" class="min-h-dvh min-w-0">
        <header class="sticky top-0 z-30 border-b bg-background/95 shadow-sm backdrop-blur" aria-label="Herramientas del editor de plantilla">
            <div class="grid h-12 min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:px-5">
                <Button variant="outline" size="sm" class="justify-self-start" @click="editing = false">Volver a la vista</Button>
                <div id="template-editor-header-selection" class="min-w-0 justify-self-center" />
                <div aria-hidden="true" />
            </div>
            <div class="min-h-14 min-w-0 border-t" aria-hidden="true" />
        </header>

        <main class="min-w-0 py-5 sm:py-6">
            <TemplateVisualBuilder
                :template="builder.template"
                :appearance="previewAppearance"
                :block-types="builder.blockTypes"
                :variables="builder.variables"
                :logos="builder.logos"
                :identification-design="builder.identificationDesign"
                :color-options="builder.appearanceOptions.colors"
                :readonly="false"
                ribbon
                fixed-ribbon
                selection-target="#template-editor-header-selection"
                @personalize="appearanceOpen = true"
            />
        </main>

        <TemplateAppearanceSheet
            v-model:open="appearanceOpen"
            :template-id="builder.template.id"
            :appearance="builder.template.appearance"
            :options="builder.appearanceOptions"
            :institution-logo-url="builder.logos.institution"
            @preview="previewAppearance = $event"
        />
    </div>

    <PageFrame
        v-else-if="builder"
        title="Plantilla de sílabo"
        description="Hoja base de la plantilla institucional."
        size="wide"
    >
        <template #actions>
            <Button v-if="!builder.processLock" @click="editing = true">
                <Pencil data-icon="inline-start" aria-hidden="true" />Editar
            </Button>
        </template>

        <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
        <ProcessLockAlert v-if="builder.processLock" title="Plantilla protegida durante el proceso" :reason="builder.processLock" />
        <TemplateVisualBuilder
            :template="builder.template"
            :appearance="builder.template.appearance"
            :block-types="builder.blockTypes"
            :variables="builder.variables"
            :logos="builder.logos"
            :identification-design="builder.identificationDesign"
            :color-options="builder.appearanceOptions.colors"
            :readonly="true"
        />
    </PageFrame>
</template>
