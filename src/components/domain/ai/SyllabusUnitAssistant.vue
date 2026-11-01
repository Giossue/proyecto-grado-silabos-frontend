<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import EvidenceDisclosure from '@/components/domain/EvidenceDisclosure.vue';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { MessageSquarePlus, Send } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { clearAiChat, getAiChat, sendAiChatMessage, type AiChat } from '@/api/syllabi';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import RobotAvatar from '@/components/domain/ai/avatar/RobotAvatar.vue';
import { useAvatarController } from '@/components/domain/ai/avatar/useAvatarController';
import { renderChatMarkdown } from '@/components/domain/ai/chatMarkdown';
import { attemptKey } from '@/lib/attemptKey';

const props = defineProps<{ syllabusId: string; enabled: boolean; saving: boolean }>();
const chat = ref<AiChat | null>(null);
const message = ref('');
const loading = ref(false);
const sending = ref(false);
const error = ref<string | null>(null);
const engaged = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let generation = 0;
const messages = computed(() => chat.value?.conversation?.messages ?? []);
const pending = computed(() => messages.value.some((item) => ['pendiente', 'en_ejecucion'].includes(item.status)));
const waiting = computed(() => sending.value || pending.value);
const received = computed(() => messages.value.filter((item) => item.role === 'asistente' && item.status === 'completado').length);
const avatar = useAvatarController({ userEngaged: engaged, awaitingModel: waiting, receivedCount: received });
watch(() => [...messages.value].reverse().find((item) => item.role === 'asistente' && item.status === 'completado')?.avatar, (hint) => avatar.applyAgentHint(hint));
const limits = computed(() => chat.value?.limits ?? null);
const outOfMessages = computed(() => limits.value !== null && limits.value.messages_used >= limits.value.messages_max);
const canRestart = computed(() => props.enabled && !waiting.value && messages.value.length > 0 && limits.value !== null && limits.value.sessions_used < limits.value.sessions_max);
const canSend = computed(() => props.enabled && !props.saving && chat.value?.available && !outOfMessages.value && !loading.value && !waiting.value && message.value.trim().length > 0 && message.value.trim().length <= VALIDATION_LIMITS.longText);
const restart = async (): Promise<void> => {
    if (!canRestart.value) return;
    error.value = null;
    try { await clearAiChat(props.syllabusId); await load(); }
    catch (reason) { error.value = reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : 'No se pudo iniciar un nuevo chat.'; }
};
const stop = () => { if (timer) clearTimeout(timer); timer = null; };
const load = async (): Promise<void> => {
    stop();
    const request = generation;
    loading.value = true;
    error.value = null;
    try {
        const result = await getAiChat(props.syllabusId);
        if (request !== generation) return;
        chat.value = result;
        if (pending.value) timer = setTimeout(() => { void load(); }, 2500);
    } catch (reason) {
        if (request === generation) error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la conversación.';
    } finally { if (request === generation) loading.value = false; }
};
const messageKey = attemptKey();
const send = async (): Promise<void> => {
    if (!canSend.value) return;
    stop();
    const request = generation;
    sending.value = true;
    error.value = null;
    try {
        const text = message.value.trim();
        await sendAiChatMessage(props.syllabusId, text, messageKey.use(`${props.syllabusId}:${text}`));
        messageKey.reset();
        if (request !== generation) return;
        message.value = '';
        await load();
    } catch (reason) {
        if (request === generation) error.value = reason instanceof ApiError ? reason.message : 'No se pudo enviar la consulta. Puedes volver a intentarlo.';
    } finally { if (request === generation) sending.value = false; }
};
const ChatMarkdown = (props: { text: string }) => renderChatMarkdown(props.text);
watch(() => props.syllabusId, () => {
    generation += 1;
    stop();
    chat.value = null;
    message.value = '';
    sending.value = false;
    void load();
}, { immediate: true });
onBeforeUnmount(() => { generation += 1; stop(); });
</script>

<template>
    <Card class="assistant-panel gap-0 overflow-hidden py-0">
        <CardHeader class="flex shrink-0 flex-row items-center gap-3 py-3">
            <RobotAvatar v-if="messages.length" v-bind="avatar.state.value" class="h-10 w-12 shrink-0" />
            <div class="flex min-w-0 flex-1 flex-col">
                <CardTitle>Asistente de unidades</CardTitle>
                <p v-if="limits" class="text-xs text-muted-foreground">{{ limits.messages_used }} de {{ limits.messages_max }} preguntas · chat {{ Math.max(limits.sessions_used, 1) }} de {{ limits.sessions_max }}</p>
            </div>
            <Button type="button" variant="outline" size="sm" :disabled="!canRestart" @click="restart"><MessageSquarePlus data-icon="inline-start" aria-hidden="true" />Nuevo chat</Button>
        </CardHeader>
        <Separator />
        <Conversation aria-label="Conversación para generar contenido de las unidades" class="min-h-0 flex-1">
            <ConversationContent class="gap-5 px-4 py-4">
                <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}<Button type="button" variant="outline" size="sm" :disabled="loading || sending" @click="load">Consultar de nuevo</Button></AlertDescription></Alert>
                <div v-if="loading && !chat" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando conversación">
                    <span class="sr-only">Cargando conversación…</span>
                    <Empty aria-hidden="true">
                        <EmptyHeader>
                            <Skeleton class="h-28 w-36 rounded-full" />
                            <Skeleton class="h-6 w-56 max-w-full" />
                        </EmptyHeader>
                        <EmptyContent>
                            <Skeleton v-for="question in 3" :key="question" class="h-10 w-full" />
                        </EmptyContent>
                    </Empty>
                </div>
                <Alert v-else-if="chat && !chat.available"><AlertDescription>El asistente no está disponible en este momento. Puedes continuar elaborando tu sílabo.</AlertDescription></Alert>
                <Empty v-if="chat && !messages.length"><EmptyHeader><EmptyMedia><RobotAvatar v-bind="avatar.state.value" class="h-28 w-36" /></EmptyMedia><EmptyTitle>Comienza una conversación</EmptyTitle></EmptyHeader>
                    <EmptyContent v-if="chat.available && chat.suggested_questions.length">
                        <Button v-for="question in chat.suggested_questions" :key="question" type="button" variant="outline" class="h-auto whitespace-normal text-left" :disabled="!enabled || saving || waiting" @click="message = question">{{ question }}</Button>
                    </EmptyContent>
                </Empty>
                <Message v-for="item in messages" :key="item.id" :from="item.role === 'usuario' ? 'user' : 'assistant'" class="min-w-0 max-w-full">
                    <MessageContent class="min-w-0 max-w-full">
                        <p class="text-xs font-medium text-muted-foreground">{{ item.role === 'usuario' ? 'Tú' : 'Asistente' }}</p>
                        <div v-if="item.content && item.role === 'asistente'" class="flex flex-col gap-2 break-words"><ChatMarkdown :text="item.content" /></div>
                        <p v-else-if="item.content" class="whitespace-pre-wrap break-words">{{ item.content }}</p>
                        <p v-if="['pendiente', 'en_ejecucion'].includes(item.status)" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Preparando una propuesta…</p>
                        <Alert v-if="item.status === 'fallido'" variant="destructive"><AlertDescription>{{ item.error ?? 'No se pudo generar una respuesta. Envía la consulta otra vez.' }}</AlertDescription></Alert>
                        <EvidenceDisclosure v-for="citation in item.citations" :key="citation.id" :label="citation.label" :excerpt="citation.excerpt" />
                    </MessageContent>
                </Message>
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
        <Separator />
        <CardContent class="min-w-0 shrink-0 px-4 py-4">
            <form @submit.prevent="send">
                <Field>
                    <FieldLabel :for="`unit-assistant-${syllabusId}`" class="sr-only">Consulta sobre una unidad</FieldLabel>
                    <div class="flex items-end gap-2">
                        <Textarea :id="`unit-assistant-${syllabusId}`" v-model="message" :maxlength="VALIDATION_LIMITS.longText" rows="3" class="min-w-0 flex-1" :disabled="!enabled || !chat?.available || waiting" placeholder="Escribe la unidad o el tema…" @focus="engaged = true" @blur="engaged = false" />
                        <Button type="submit" size="icon" aria-label="Enviar" :disabled="!canSend"><Spinner v-if="waiting" /><Send v-else aria-hidden="true" /></Button>
                    </div>
                    <FieldDescription v-if="outOfMessages">Llegó al límite de {{ limits?.messages_max }} preguntas al asistente para este sílabo.</FieldDescription>
                    <FieldDescription v-else-if="saving">Espera a que se guarden los cambios del sílabo antes de consultar.</FieldDescription>
                    <FieldDescription v-else-if="!enabled">La generación está disponible mientras puedes editar este sílabo.</FieldDescription>
                </Field>
            </form>
        </CardContent>
    </Card>
</template>
