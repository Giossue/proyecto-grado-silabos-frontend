<script setup lang="ts">
import { Check, MessageSquarePlus, Send, Trash2 } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { clearTemplateAssistant, getTemplateAssistant, sendTemplateAssistantMessage, type TemplateAssistantChat, type TemplateAssistantDraft, type TemplateAssistantMessage, type TemplateProposalStatus } from '@/api/templateAssistant';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import RobotAvatar from '@/components/domain/ai/avatar/RobotAvatar.vue';
import { useAvatarController } from '@/components/domain/ai/avatar/useAvatarController';
import { renderChatMarkdown } from '@/components/domain/ai/chatMarkdown';
import { attemptKey } from '@/lib/attemptKey';
import { VALIDATION_LIMITS } from '@/lib/validationLimits';

const props = defineProps<{ refresh: number; draftVersion: string; snapshot: () => TemplateAssistantDraft; busy: string | null }>();
const emit = defineEmits<{ apply: [proposalId: string]; discard: [proposalId: string] }>();

const STATUS_LABELS: Record<Exclude<TemplateProposalStatus, 'pendiente'>, string> = {
    aplicada: 'Aplicada',
    descartada: 'Descartada',
    vencida: 'Vencida: el borrador cambió',
    reemplazada: 'Reemplazada por otra propuesta',
};

const chat = ref<TemplateAssistantChat | null>(null);
const message = ref('');
const loading = ref(false);
const sending = ref(false);
const error = ref<string | null>(null);
const engaged = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
const messages = computed(() => chat.value?.messages ?? []);
const pending = computed(() => messages.value.some((item) => item.status === 'pendiente' || item.status === 'en_ejecucion'));
const waiting = computed(() => sending.value || pending.value);
const received = computed(() => messages.value.filter((item) => item.role === 'asistente' && item.status === 'completado').length);
const avatar = useAvatarController({ userEngaged: engaged, awaitingModel: waiting, receivedCount: received });
const canSend = computed(() => chat.value?.available === true && !loading.value && !waiting.value && message.value.trim().length > 0 && message.value.trim().length <= VALIDATION_LIMITS.longText);
const canRestart = computed(() => !waiting.value && messages.value.length > 0);
const messageKey = attemptKey();
const proposalStatus = (proposal: NonNullable<TemplateAssistantMessage['proposal']>): TemplateProposalStatus =>
    proposal.status === 'pendiente' && proposal.draft_version !== props.draftVersion ? 'vencida' : proposal.status;

const stop = (): void => {
    if (timer) clearTimeout(timer);
    timer = null;
};
const failure = (reason: unknown, fallback: string): string => reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : fallback;
const load = async (): Promise<void> => {
    stop();
    const request = generation;
    loading.value = true;
    error.value = null;
    try {
        const result = await getTemplateAssistant();
        if (request !== generation) return;
        chat.value = result;
        if (pending.value) timer = setTimeout(() => { void load(); }, 2500);
    } catch (reason) {
        if (request === generation) error.value = failure(reason, 'No se pudo cargar la conversación');
    } finally {
        if (request === generation) loading.value = false;
    }
};
const send = async (): Promise<void> => {
    if (!canSend.value) return;
    stop();
    const request = generation;
    sending.value = true;
    error.value = null;
    try {
        const text = message.value.trim();
        await sendTemplateAssistantMessage(text, props.snapshot(), messageKey.use(text));
        messageKey.reset();
        if (request !== generation) return;
        message.value = '';
        await load();
    } catch (reason) {
        if (request === generation) error.value = failure(reason, 'No se pudo enviar el pedido');
    } finally {
        if (request === generation) sending.value = false;
    }
};
const restart = async (): Promise<void> => {
    if (!canRestart.value) return;
    error.value = null;
    try {
        await clearTemplateAssistant();
        await load();
    } catch (reason) {
        error.value = failure(reason, 'No se pudo iniciar un nuevo chat');
    }
};
const ChatMarkdown = (markdown: { text: string }) => renderChatMarkdown(markdown.text);

watch(() => props.refresh, () => { void load(); }, { immediate: true });
onBeforeUnmount(() => {
    generation += 1;
    stop();
});
</script>

<template>
    <Card class="assistant-panel gap-0 overflow-hidden py-0">
        <CardHeader class="flex shrink-0 flex-row items-center gap-3 py-3">
            <RobotAvatar v-if="messages.length" v-bind="avatar.state.value" class="h-10 w-12 shrink-0" />
            <CardTitle class="min-w-0 flex-1">Asistente de plantilla</CardTitle>
            <Button type="button" variant="outline" size="sm" :disabled="!canRestart" @click="restart"><MessageSquarePlus data-icon="inline-start" aria-hidden="true" />Nuevo chat</Button>
        </CardHeader>
        <Separator />
        <Conversation aria-label="Conversación con el asistente de plantilla" class="min-h-0 flex-1">
            <ConversationContent class="gap-5 px-4 py-4">
                <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
                <div v-if="loading && !chat" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando conversación">
                    <span class="sr-only">Cargando conversación…</span>
                    <Empty aria-hidden="true">
                        <EmptyHeader>
                            <Skeleton class="h-28 w-36 rounded-full" />
                            <Skeleton class="h-6 w-56 max-w-full" />
                        </EmptyHeader>
                    </Empty>
                </div>
                <Alert v-else-if="chat && !chat.available"><AlertDescription>El asistente no está disponible por ahora</AlertDescription></Alert>
                <Alert v-else-if="chat?.locked"><AlertDescription>Con la convocatoria abierta solo puede hacer consultas</AlertDescription></Alert>
                <Empty v-if="chat && !messages.length">
                    <EmptyHeader><EmptyMedia><RobotAvatar v-bind="avatar.state.value" class="h-28 w-36" /></EmptyMedia><EmptyTitle>Pida un cambio a la plantilla</EmptyTitle></EmptyHeader>
                    <EmptyContent v-if="chat.available">
                        <Button v-for="suggestion in chat.suggestions" :key="suggestion" type="button" variant="outline" class="h-auto whitespace-normal text-left" :disabled="waiting" @click="message = suggestion">{{ suggestion }}</Button>
                    </EmptyContent>
                </Empty>
                <Message v-for="item in messages" :key="item.id" :from="item.role === 'usuario' ? 'user' : 'assistant'" class="min-w-0 max-w-full">
                    <MessageContent class="min-w-0 max-w-full">
                        <p class="text-xs font-medium text-muted-foreground">{{ item.role === 'usuario' ? 'Tú' : 'Asistente' }}</p>
                        <div v-if="item.content && item.role === 'asistente'" class="flex flex-col gap-2 break-words"><ChatMarkdown :text="item.content" /></div>
                        <p v-else-if="item.content" class="whitespace-pre-wrap break-words">{{ item.content }}</p>
                        <p v-if="item.status === 'pendiente' || item.status === 'en_ejecucion'" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Preparando la propuesta…</p>
                        <Alert v-if="item.status === 'fallido'" variant="destructive"><AlertDescription>{{ item.error ?? 'No se pudo completar el pedido' }}</AlertDescription></Alert>
                        <div v-if="item.proposal" class="flex flex-col gap-2 rounded-md bg-muted/50 p-3 text-sm" data-proposal>
                            <p class="font-medium">Cambios propuestos</p>
                            <ul class="list-disc space-y-1 pl-5 text-muted-foreground">
                                <li v-for="change in item.proposal.changes" :key="change">{{ change.replace(/\.$/, '') }}</li>
                            </ul>
                            <div v-if="proposalStatus(item.proposal) === 'pendiente'" class="flex flex-wrap gap-2">
                                <Button type="button" size="sm" :disabled="busy !== null" @click="emit('apply', item.proposal.id)"><Spinner v-if="busy === item.proposal.id" data-icon="inline-start" /><Check v-else data-icon="inline-start" aria-hidden="true" />Aplicar</Button>
                                <Button type="button" size="sm" variant="outline" :disabled="busy !== null" @click="emit('discard', item.proposal.id)"><Trash2 data-icon="inline-start" aria-hidden="true" />Descartar</Button>
                            </div>
                            <Badge v-else variant="secondary" class="self-start">{{ STATUS_LABELS[proposalStatus(item.proposal) as Exclude<TemplateProposalStatus, 'pendiente'>] }}</Badge>
                        </div>
                    </MessageContent>
                </Message>
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
        <Separator />
        <CardContent class="min-w-0 shrink-0 px-4 py-4">
            <form @submit.prevent="send">
                <Field>
                    <FieldLabel for="template-assistant-message" class="sr-only">Pedido al asistente</FieldLabel>
                    <div class="flex items-end gap-2">
                        <Textarea id="template-assistant-message" v-model="message" :maxlength="VALIDATION_LIMITS.longText" rows="3" class="min-w-0 flex-1" :disabled="!chat?.available || waiting" placeholder="¿Qué cambio quiere en la plantilla?" @focus="engaged = true" @blur="engaged = false" />
                        <Button type="submit" size="icon" aria-label="Enviar" :disabled="!canSend"><Spinner v-if="waiting" /><Send v-else aria-hidden="true" /></Button>
                    </div>
                    <FieldDescription>Los cambios aplicados se guardan con «Guardar»</FieldDescription>
                </Field>
            </form>
        </CardContent>
    </Card>
</template>
