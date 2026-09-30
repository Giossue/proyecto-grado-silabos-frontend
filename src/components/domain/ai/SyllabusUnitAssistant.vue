<script setup lang="ts">
import EvidenceDisclosure from '@/components/domain/EvidenceDisclosure.vue';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Send } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getAiChat, sendAiChatMessage, type AiChat } from '@/api/syllabi';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupTextarea } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import RobotAvatar from '@/components/domain/ai/avatar/RobotAvatar.vue';
import { useAvatarController } from '@/components/domain/ai/avatar/useAvatarController';
import { toast } from '@/lib/toast';

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
const canSend = computed(() => props.enabled && !props.saving && chat.value?.available && !loading.value && !waiting.value && message.value.trim().length > 0 && message.value.trim().length <= 4000);
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
const send = async (): Promise<void> => {
    if (!canSend.value) return;
    stop();
    const request = generation;
    sending.value = true;
    error.value = null;
    try {
        await sendAiChatMessage(props.syllabusId, message.value.trim());
        if (request !== generation) return;
        message.value = '';
        await load();
    } catch (reason) {
        if (request === generation) error.value = reason instanceof ApiError ? reason.message : 'No se pudo enviar la consulta. Puedes volver a intentarlo.';
    } finally { if (request === generation) sending.value = false; }
};
const copy = async (content: string): Promise<void> => {
    try { await navigator.clipboard.writeText(content); toast.success('Respuesta copiada.'); }
    catch { toast.error('No se pudo copiar. Selecciona el texto de la respuesta para copiarlo.'); }
};
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
    <Card class="h-[38rem] min-h-[30rem] gap-0 overflow-hidden py-0 xl:h-full xl:min-h-0">
        <CardHeader class="shrink-0 py-4">
            <CardTitle>Asistente de unidades</CardTitle>
        </CardHeader>
        <Separator />
        <Conversation aria-label="Conversación para generar contenido de las unidades" class="min-h-0 flex-1">
            <ConversationContent class="gap-5 px-4 py-4">
                <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}<Button type="button" variant="outline" size="sm" :disabled="loading || sending" @click="load">Consultar de nuevo</Button></AlertDescription></Alert>
                <p v-if="loading && !chat" role="status" class="text-sm text-muted-foreground">Cargando conversación…</p>
                <Alert v-else-if="chat && !chat.available"><AlertDescription>El asistente no está disponible en este momento. Puedes continuar elaborando tu sílabo.</AlertDescription></Alert>
                <Empty v-if="chat && !messages.length"><EmptyHeader><EmptyMedia><RobotAvatar v-bind="avatar.state.value" class="h-28 w-36" /></EmptyMedia><EmptyTitle>Comienza una conversación</EmptyTitle></EmptyHeader>
                    <EmptyContent v-if="chat.available && chat.suggested_questions.length">
                        <Button v-for="question in chat.suggested_questions" :key="question" type="button" variant="outline" class="h-auto whitespace-normal text-left" :disabled="!enabled || saving || waiting" @click="message = question">{{ question }}</Button>
                    </EmptyContent>
                </Empty>
                <Message v-for="item in messages" :key="item.id" :from="item.role === 'usuario' ? 'user' : 'assistant'" class="min-w-0 max-w-full">
                    <MessageContent class="min-w-0 max-w-full">
                        <p class="text-xs font-medium text-muted-foreground">{{ item.role === 'usuario' ? 'Tú' : 'Asistente' }}</p>
                        <p v-if="item.content" class="whitespace-pre-wrap break-words">{{ item.content }}</p>
                        <p v-if="['pendiente', 'en_ejecucion'].includes(item.status)" role="status" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Preparando una propuesta…</p>
                        <Alert v-if="item.status === 'fallido'" variant="destructive"><AlertDescription>{{ item.error ?? 'No se pudo generar una respuesta. Envía la consulta otra vez.' }}</AlertDescription></Alert>
                        <EvidenceDisclosure v-for="citation in item.citations" :key="citation.id" :label="citation.label" :excerpt="citation.excerpt" />
                        <Button v-if="item.role === 'asistente' && item.status === 'completado' && item.content" type="button" variant="outline" size="sm" class="self-start" @click="copy(item.content)">Copiar respuesta</Button>
                    </MessageContent>
                </Message>
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
        <Separator />
        <CardContent class="shrink-0 px-4 pt-4">
            <form @submit.prevent="send">
                <Field>
                    <FieldLabel :for="`unit-assistant-${syllabusId}`" class="sr-only">Consulta sobre una unidad</FieldLabel>
                    <InputGroup>
                        <InputGroupTextarea :id="`unit-assistant-${syllabusId}`" v-model="message" maxlength="4000" rows="3" :disabled="!enabled || !chat?.available || waiting" placeholder="Escribe la unidad o el tema…" @focus="engaged = true" @blur="engaged = false" />
                        <InputGroupAddon align="block-end" class="justify-end"><Button type="submit" size="sm" :disabled="!canSend"><Spinner v-if="waiting" data-icon="inline-start" /><Send v-else data-icon="inline-start" aria-hidden="true" />Enviar</Button></InputGroupAddon>
                    </InputGroup>
                    <FieldDescription v-if="saving">Espera a que se guarden los cambios del sílabo antes de consultar.</FieldDescription>
                    <FieldDescription v-else-if="!enabled">La generación está disponible mientras puedes editar este sílabo.</FieldDescription>
                </Field>
            </form>
        </CardContent>
    </Card>
</template>
