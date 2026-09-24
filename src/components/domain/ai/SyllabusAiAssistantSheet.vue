<script setup lang="ts">
import {
    Check,
    ChevronRight,
    CircleAlert,
    Clock3,
    FileText,
    Sparkles,
} from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    applyAiRecommendation,
    decideAiRecommendation,
    getAiChat,
    requestAiReview,
    type AiChat,
} from '@/api/syllabi';
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
    InlineCitation,
    InlineCitationCard,
    InlineCitationCardBody,
    InlineCitationCardTrigger,
    InlineCitationSource,
    InlineCitationText,
} from '@/components/ai-elements/inline-citation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
    Sources,
    SourcesContent,
    SourcesTrigger,
} from '@/components/ai-elements/sources';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Empty,
    EmptyContent,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import RobotAvatar from '@/components/domain/ai/avatar/RobotAvatar.vue';
import { useAvatarController } from '@/components/domain/ai/avatar/useAvatarController';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/api/client';
import { toast } from '@/lib/toast';

type Evidence = {
    id: string;
    source: string;
    excerpt: string;
};

type Recommendation = {
    id: string;
    title: string;
    explanation: string;
    suggested_text: string;
    evidence_ids: string[];
    my_decisions: string[];
    applied: boolean;
};

type Execution = {
    id: string;
    status: 'pendiente' | 'en_ejecucion' | 'completada' | 'no_concluyente' | 'parcial' | 'fallida';
    requested_at: string;
    completed_at: string | null;
    stale: boolean;
    section: { id: string; title: string };
    field: { id: string; label: string };
    input_content: string;
    reason: string | null;
    error_message: string | null;
    evidence: Evidence[];
    recommendations: Recommendation[];
};

export type SyllabusAiAssistance = {
    available: boolean;
    is_provisional_simulator: boolean;
    sources: string[];
    executions: Execution[];
};

const props = defineProps<{
    syllabusId: string;
    syllabusVersion: number;
    canReview: boolean;
    saving: boolean;
}>();

const emit = defineEmits<{
    recommendationApplied: [payload: {
        fieldId: string;
        value: string;
        version: number;
    }];
}>();

const chat = ref<AiChat | null>(null);
const loadError = ref<string | null>(null);
const requestingReview = ref(false);
const decidingId = ref<string | null>(null);
const applyOpen = ref(false);
const activeRecommendation = ref<{
    execution: Execution;
    recommendation: Recommendation;
} | null>(null);
let polling: ReturnType<typeof setTimeout> | null = null;

const assistance = computed<SyllabusAiAssistance>(() => {
    const results = chat.value?.review_results ?? [];
    const executions = results.map<Execution>((result) => {
        const evidenceById = new Map<string, Evidence>();
        for (const recommendation of result.recommendations) {
            for (const citation of recommendation.citations) {
                evidenceById.set(citation.id, {
                    id: citation.id,
                    source: citation.label,
                    excerpt: citation.excerpt,
                });
            }
        }

        return {
            id: result.id,
            status: result.status as Execution['status'],
            requested_at: chat.value?.review?.requested_at ?? '',
            completed_at: chat.value?.review?.completed_at ?? null,
            stale: result.stale,
            section: result.section,
            field: { id: result.field_id, label: result.field_label },
            input_content: '',
            reason: result.reason,
            error_message: result.error,
            evidence: [...evidenceById.values()],
            recommendations: result.recommendations.map((recommendation) => ({
                id: recommendation.id,
                title: recommendation.title,
                explanation: recommendation.explanation,
                suggested_text: recommendation.suggested_text,
                evidence_ids: recommendation.citations.map((citation) => citation.id),
                my_decisions: recommendation.decisions,
                applied: recommendation.applied,
            })),
        };
    });

    return {
        available: chat.value?.available ?? false,
        is_provisional_simulator: false,
        sources: Array.from(new Set(
            executions.flatMap((execution) => execution.evidence.map((evidence) => evidence.source)),
        )),
        executions,
    };
});

const hasProcessing = computed(() =>
    ['pendiente', 'en_ejecucion'].includes(chat.value?.review?.status ?? '') ||
    assistance.value.executions.some((execution) =>
        ['pendiente', 'en_ejecucion'].includes(execution.status),
    ),
);
const hasResults = computed(() => assistance.value.executions.length > 0);

const finishedCount = computed(() =>
    assistance.value.executions.filter((execution) =>
        !['pendiente', 'en_ejecucion'].includes(execution.status),
    ).length,
);
const userEngaged = ref(false);
const avatar = useAvatarController({
    userEngaged,
    awaitingModel: computed(() => requestingReview.value || hasProcessing.value),
    receivedCount: finishedCount,
});

const lastAgentHint = computed(() => {
    const messages = chat.value?.conversation?.messages ?? [];
    const lastAssistant = [...messages].reverse().find((message) =>
        message.role === 'asistente' && message.status === 'completado',
    );
    return lastAssistant?.avatar ?? chat.value?.review?.avatar ?? null;
});
watch(lastAgentHint, (hint) => avatar.applyAgentHint(hint));

const statusLabel = (execution: Execution): string => {
    if (execution.stale) return 'Desactualizado';
    return {
        pendiente: 'Pendiente',
        en_ejecucion: 'Revisando',
        completada: 'Revisado',
        no_concluyente: 'Sin conclusión',
        parcial: 'Parcial',
        fallida: 'No disponible',
    }[execution.status];
};

const statusVariant = (execution: Execution) => {
    if (execution.status === 'fallida') return 'destructive' as const;
    if (execution.status === 'completada' && !execution.stale) return 'default' as const;
    return 'secondary' as const;
};

const citedEvidence = (execution: Execution, recommendation: Recommendation): Evidence[] =>
    execution.evidence.filter((evidence) =>
        recommendation.evidence_ids.includes(evidence.id),
    );

const schedulePoll = (): void => {
    if (polling) clearTimeout(polling);
    if (hasProcessing.value) {
        polling = setTimeout(() => {
            void load();
        }, 4000);
    }
};

const load = async (): Promise<void> => {
    loadError.value = null;
    try {
        chat.value = await getAiChat(props.syllabusId);
    } catch (reason) {
        loadError.value = reason instanceof ApiError && reason.message
            ? reason.message
            : 'No se pudo cargar la asistencia de IA';
    } finally {
        schedulePoll();
    }
};

const requestReview = async (): Promise<void> => {
    if (!props.canReview || props.saving || requestingReview.value) return;
    requestingReview.value = true;
    try {
        await requestAiReview(props.syllabusId, props.syllabusVersion);
        await load();
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo iniciar la revisión');
    } finally {
        requestingReview.value = false;
    }
};

const recordDecision = async (
    execution: Execution,
    recommendation: Recommendation,
    decision: 'aceptada' | 'ignorada' | 'no_util',
): Promise<void> => {
    decidingId.value = recommendation.id;
    try {
        await decideAiRecommendation(
            props.syllabusId,
            execution.field.id,
            recommendation.id,
            decision,
        );
        await load();
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo registrar la decisión');
    } finally {
        decidingId.value = null;
    }
};

const reviewChange = (execution: Execution, recommendation: Recommendation): void => {
    activeRecommendation.value = { execution, recommendation };
    applyOpen.value = true;
};

const applyRecommendation = async (): Promise<void> => {
    const active = activeRecommendation.value;
    if (!active || decidingId.value !== null) return;

    decidingId.value = active.recommendation.id;
    try {
        const result = await applyAiRecommendation(
            props.syllabusId,
            active.execution.field.id,
            active.recommendation.id,
            props.syllabusVersion,
        );
        emit('recommendationApplied', {
            fieldId: active.execution.field.id,
            value: result.value,
            version: result.version_bloqueo,
        });
        applyOpen.value = false;
        await load();
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo aplicar la recomendación');
    } finally {
        decidingId.value = null;
    }
};

const goToSection = (sectionId: string): void => {
    window.setTimeout(() => {
        document.getElementById(`section-${sectionId}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, 200);
};

onMounted(() => void load());
defineExpose({ reload: load });
onBeforeUnmount(() => {
    if (polling) clearTimeout(polling);
});
</script>

<template>
    <Card
        class="min-h-[30rem] gap-0 overflow-hidden py-0 xl:h-full xl:min-h-0"
        @pointerenter="userEngaged = true"
        @pointerleave="userEngaged = false"
        @focusin="userEngaged = true"
        @focusout="userEngaged = false"
    >
        <CardHeader class="shrink-0 py-4">
            <CardTitle class="text-center">Asistente IA</CardTitle>
            <CardDescription class="text-center">
                Sugerencias para mejorar tu sílabo, sección por sección
            </CardDescription>
        </CardHeader>

        <Separator />

        <Conversation
            aria-label="Resultados de la revisión del asistente IA"
            class="min-h-0 flex-1"
        >
            <ConversationContent class="gap-4 px-4 py-4">
                <Alert v-if="loadError" variant="destructive">
                    <CircleAlert aria-hidden="true" />
                    <AlertTitle>No se pudo cargar la asistencia</AlertTitle>
                    <AlertDescription class="flex flex-wrap items-center justify-between gap-3">
                        <span>{{ loadError }}</span>
                        <Button type="button" variant="outline" size="sm" @click="load">Reintentar</Button>
                    </AlertDescription>
                </Alert>

                <Alert v-if="assistance.is_provisional_simulator">
                    <Sparkles aria-hidden="true" />
                    <AlertTitle>Modo de demostración</AlertTitle>
                    <AlertDescription>
                        El flujo y las citas son reales, pero el modelo actual
                        todavía es el simulador técnico
                    </AlertDescription>
                </Alert>

                <Message from="assistant" class="max-w-full">
                    <MessageContent class="w-full">
                        <Card>
                            <CardHeader>
                                <div class="flex justify-center">
                                    <div
                                        class="flex size-12 shrink-0 items-center justify-center"
                                    >
                                        <RobotAvatar
                                            class="size-full"
                                            v-bind="avatar.state.value"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent v-if="assistance.sources.length > 0">
                                <Sources class="mb-0">
                                    <SourcesTrigger
                                        :count="assistance.sources.length"
                                        class="text-xs"
                                    >
                                        <span class="font-medium">
                                            Fuentes seleccionadas
                                        </span>
                                    </SourcesTrigger>
                                    <SourcesContent class="w-full">
                                        <div class="flex flex-wrap gap-2">
                                            <Badge
                                                v-for="source in assistance.sources"
                                                :key="source"
                                                variant="outline"
                                            >
                                                {{ source }}
                                            </Badge>
                                        </div>
                                    </SourcesContent>
                                </Sources>
                            </CardContent>
                        </Card>
                    </MessageContent>
                </Message>

                <Suggestions
                    v-if="hasResults"
                    aria-label="Ir a los campos revisados"
                >
                    <Suggestion
                        v-for="execution in assistance.executions"
                        :key="execution.id"
                        :suggestion="execution.section.title"
                        @click="goToSection(execution.section.id)"
                    >
                        {{ execution.section.title }}
                    </Suggestion>
                </Suggestions>

                <Empty v-if="!hasResults && canReview" class="min-h-64 border">
                    <EmptyContent>
                        <Button
                            type="button"
                            :disabled="requestingReview || saving"
                            @click="requestReview"
                        >
                            <Spinner
                                v-if="requestingReview"
                                data-icon="inline-start"
                            />
                            <Sparkles
                                v-else
                                data-icon="inline-start"
                                aria-hidden="true"
                            />
                            Revisar sílabo
                        </Button>
                    </EmptyContent>
                </Empty>

                <Message
                    v-for="execution in assistance.executions"
                    v-else
                    :key="execution.id"
                    from="assistant"
                    class="max-w-full"
                >
                    <MessageContent class="w-full">
                        <Card>
                            <CardHeader>
                                <div
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div class="flex min-w-0 flex-col gap-1">
                                        <button
                                            type="button"
                                            class="flex items-center gap-1 text-left text-sm font-medium hover:underline"
                                            @click="
                                                goToSection(
                                                    execution.section.id,
                                                )
                                            "
                                        >
                                            {{ execution.section.title }}
                                            <ChevronRight aria-hidden="true" />
                                        </button>
                                        <CardTitle class="text-base">
                                            {{ execution.field.label }}
                                        </CardTitle>
                                    </div>
                                    <Badge :variant="statusVariant(execution)">
                                        <Spinner
                                            v-if="
                                                execution.status ===
                                                    'pendiente' ||
                                                execution.status ===
                                                    'en_ejecucion'
                                            "
                                            data-icon="inline-start"
                                        />
                                        {{ statusLabel(execution) }}
                                    </Badge>
                                </div>
                                <CardDescription v-if="execution.stale">
                                    El borrador cambió después de este análisis
                                </CardDescription>
                            </CardHeader>

                            <CardContent class="flex flex-col gap-4">
                                <Alert
                                    v-if="
                                        execution.status === 'pendiente' ||
                                        execution.status === 'en_ejecucion'
                                    "
                                >
                                    <Clock3 aria-hidden="true" />
                                    <AlertTitle>Revisión en curso</AlertTitle>
                                    <AlertDescription>
                                        Puedes continuar editando mientras
                                        termina
                                    </AlertDescription>
                                </Alert>

                                <Alert
                                    v-else-if="execution.status === 'fallida'"
                                    variant="destructive"
                                >
                                    <CircleAlert aria-hidden="true" />
                                    <AlertTitle
                                        >No se pudo revisar este
                                        campo</AlertTitle
                                    >
                                    <AlertDescription>
                                        {{ execution.error_message }} El sílabo
                                        sigue disponible
                                    </AlertDescription>
                                </Alert>

                                <Alert
                                    v-else-if="
                                        execution.status === 'no_concluyente'
                                    "
                                >
                                    <FileText aria-hidden="true" />
                                    <AlertTitle>Sin recomendación</AlertTitle>
                                    <AlertDescription>
                                        {{ execution.reason }}
                                    </AlertDescription>
                                </Alert>

                                <article
                                    v-for="recommendation in execution.recommendations"
                                    :key="recommendation.id"
                                    class="flex flex-col gap-3 rounded-md border p-3"
                                >
                                    <div
                                        class="flex items-start justify-between gap-3"
                                    >
                                        <div
                                            class="flex min-w-0 flex-col gap-1"
                                        >
                                            <h3 class="font-medium">
                                                {{ recommendation.title }}
                                            </h3>
                                            <p
                                                class="text-sm text-muted-foreground"
                                            >
                                                {{ recommendation.explanation }}
                                            </p>
                                        </div>
                                        <Badge
                                            v-if="recommendation.applied"
                                            variant="secondary"
                                        >
                                            <Check
                                                data-icon="inline-start"
                                                aria-hidden="true"
                                            />
                                            Aplicada
                                        </Badge>
                                    </div>

                                    <div
                                        class="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap"
                                    >
                                        {{ recommendation.suggested_text }}
                                    </div>

                                    <InlineCitation
                                        v-if="
                                            citedEvidence(
                                                execution,
                                                recommendation,
                                            ).length > 0
                                        "
                                    >
                                        <InlineCitationText
                                            class="text-xs text-muted-foreground"
                                        >
                                            Basado en las fuentes seleccionadas
                                        </InlineCitationText>
                                        <InlineCitationCard>
                                            <InlineCitationCardTrigger
                                                :sources="
                                                    citedEvidence(
                                                        execution,
                                                        recommendation,
                                                    ).map(
                                                        (evidence) =>
                                                            evidence.source,
                                                    )
                                                "
                                            />
                                            <InlineCitationCardBody>
                                                <div
                                                    class="flex flex-col gap-3 p-3"
                                                >
                                                    <InlineCitationSource
                                                        v-for="evidence in citedEvidence(
                                                            execution,
                                                            recommendation,
                                                        )"
                                                        :key="evidence.id"
                                                        :title="evidence.source"
                                                        :description="
                                                            evidence.excerpt
                                                        "
                                                    />
                                                </div>
                                            </InlineCitationCardBody>
                                        </InlineCitationCard>
                                    </InlineCitation>

                                    <div
                                        v-if="!recommendation.applied"
                                        class="flex flex-wrap gap-2"
                                    >
                                        <Button
                                            type="button"
                                            size="sm"
                                            :disabled="
                                                execution.stale ||
                                                decidingId === recommendation.id
                                            "
                                            @click="
                                                reviewChange(
                                                    execution,
                                                    recommendation,
                                                )
                                            "
                                        >
                                            Revisar cambio
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            :disabled="
                                                decidingId ===
                                                    recommendation.id ||
                                                recommendation.my_decisions.includes(
                                                    'ignorada',
                                                )
                                            "
                                            @click="
                                                recordDecision(
                                                    execution,
                                                    recommendation,
                                                    'ignorada',
                                                )
                                            "
                                        >
                                            Ignorar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            :disabled="
                                                decidingId ===
                                                    recommendation.id ||
                                                recommendation.my_decisions.includes(
                                                    'no_util',
                                                )
                                            "
                                            @click="
                                                recordDecision(
                                                    execution,
                                                    recommendation,
                                                    'no_util',
                                                )
                                            "
                                        >
                                            No es útil
                                        </Button>
                                    </div>
                                </article>
                            </CardContent>
                        </Card>
                    </MessageContent>
                </Message>
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>

        <Separator v-if="hasResults && canReview" />

        <CardFooter v-if="hasResults && canReview" class="shrink-0 justify-end gap-3 px-4 py-3">
            <Button
                type="button"
                :disabled="requestingReview || saving || hasProcessing"
                @click="requestReview"
            >
                <Spinner
                    v-if="requestingReview || hasProcessing"
                    data-icon="inline-start"
                />
                <Sparkles v-else data-icon="inline-start" aria-hidden="true" />
                {{ hasProcessing ? 'Revisión en curso' : 'Revisar nuevamente' }}
            </Button>
        </CardFooter>
    </Card>

    <Dialog v-model:open="applyOpen">
        <DialogContent v-if="activeRecommendation" class="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>
                    Aplicar cambio en
                    {{ activeRecommendation.execution.field.label }}
                </DialogTitle>
                <DialogDescription>
                    Compara el contenido analizado con la propuesta antes de
                    modificar el borrador
                </DialogDescription>
            </DialogHeader>

            <div class="grid max-h-[55vh] gap-4 overflow-y-auto md:grid-cols-2">
                <section class="flex flex-col gap-2 rounded-md bg-muted/50 p-3">
                    <h3 class="text-sm font-medium">Antes</h3>
                    <p class="text-sm whitespace-pre-wrap">
                        {{ activeRecommendation.execution.input_content }}
                    </p>
                </section>
                <section class="flex flex-col gap-2 rounded-md border p-3">
                    <h3 class="text-sm font-medium">Después</h3>
                    <p class="text-sm whitespace-pre-wrap">
                        {{ activeRecommendation.recommendation.suggested_text }}
                    </p>
                </section>
            </div>

            <DialogFooter>
                <DialogClose :as-child="true">
                    <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button
                    type="button"
                    :disabled="
                        decidingId === activeRecommendation.recommendation.id
                    "
                    @click="applyRecommendation"
                >
                    <Spinner
                        v-if="
                            decidingId ===
                            activeRecommendation.recommendation.id
                        "
                        data-icon="inline-start"
                    />
                    <Check v-else data-icon="inline-start" aria-hidden="true" />
                    Aplicar cambio
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
