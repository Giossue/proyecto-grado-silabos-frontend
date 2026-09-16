<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ApiError } from "@/api/client";
import {
  applyAiRecommendation,
  clearAiChat,
  decideAiRecommendation,
  getAiChat,
  sendAiChatMessage,
  type AiChat,
} from "@/api/syllabi";
import { Bot, Send, Trash2, X } from '@lucide/vue';
import Conversation from '@/components/ai-elements/conversation/Conversation.vue';
import ConversationContent from '@/components/ai-elements/conversation/ConversationContent.vue';
import ConversationScrollButton from '@/components/ai-elements/conversation/ConversationScrollButton.vue';
import Message from '@/components/ai-elements/message/Message.vue';
import MessageContent from '@/components/ai-elements/message/MessageContent.vue';
import Sources from '@/components/ai-elements/sources/Sources.vue';
import SourcesContent from '@/components/ai-elements/sources/SourcesContent.vue';
import SourcesTrigger from '@/components/ai-elements/sources/SourcesTrigger.vue';
import Suggestion from '@/components/ai-elements/suggestion/Suggestion.vue';
import Suggestions from '@/components/ai-elements/suggestion/Suggestions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{ syllabusId: string; draftVersion: number }>();
const emit = defineEmits<{
  navigateToField: [fieldId: string];
  recommendationApplied: [
    payload: {
      fieldId: string;
      value: string;
      version: number;
      completion: number;
    },
  ];
}>();
const open = ref(true);
const chat = ref<AiChat | null>(null);
const draft = ref("");
const sending = ref(false);
const error = ref<string | null>(null);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const messages = computed(() =>
  chat.value?.conversation?.hidden
    ? []
    : (chat.value?.conversation?.messages ?? []),
);
const reviewSections = computed(() => {
  const sections = new Map<
    string,
    { id: string; title: string; results: AiChat["review_results"] }
  >();
  for (const result of chat.value?.review_results ?? []) {
    const section = sections.get(result.section.id) ?? {
      id: result.section.id,
      title: result.section.title,
      results: [],
    };
    section.results.push(result);
    sections.set(section.id, section);
  }

  return [...sections.values()];
});
const hasPending = computed(
  () =>
    ["pendiente", "en_ejecucion"].includes(chat.value?.review?.status ?? "") ||
    messages.value.some((message) =>
      ["pendiente", "en_ejecucion"].includes(message.status),
    ) ||
    (chat.value?.review_results ?? []).some((result) =>
      ["pendiente", "en_ejecucion"].includes(result.status),
    ),
);

const schedulePoll = (): void => {
  if (pollTimer) clearTimeout(pollTimer);
  if (hasPending.value) pollTimer = setTimeout(load, 1500);
};

const load = async (): Promise<void> => {
  try {
    chat.value = await getAiChat(props.syllabusId);
    schedulePoll();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo cargar el asistente.";
  }
};

const send = async (question?: string): Promise<void> => {
  const message = (question ?? draft.value).trim();
  if (!message || sending.value) return;
  sending.value = true;
  error.value = null;
  try {
    await sendAiChatMessage(props.syllabusId, message);
    draft.value = "";
    await load();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo enviar la pregunta.";
  } finally {
    sending.value = false;
  }
};

const clear = async (): Promise<void> => {
  error.value = null;
  try {
    await clearAiChat(props.syllabusId);
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError
      ? reason.message
      : "No se pudo limpiar la conversación.";
  }
};

const decide = async (
  fieldId: string,
  recommendationId: string,
  decision: "aceptada" | "ignorada" | "no_util",
): Promise<void> => {
  error.value = null;
  try {
    await decideAiRecommendation(
      props.syllabusId,
      fieldId,
      recommendationId,
      decision,
    );
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError
      ? reason.message
      : "No se pudo registrar la decisión.";
  }
};

const apply = async (
  fieldId: string,
  recommendationId: string,
): Promise<void> => {
  try {
    const result = await applyAiRecommendation(
      props.syllabusId,
      fieldId,
      recommendationId,
      props.draftVersion,
    );
    emit("recommendationApplied", {
      fieldId,
      value: result.value,
      version: result.version_bloqueo,
      completion: result.completion,
    });
    await load();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo aplicar la recomendación.";
  }
};

onMounted(load);
defineExpose({ reload: load });
onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer);
});
</script>

<template>
  <Button v-if="!open" class="w-full" type="button" variant="outline" @click="open = true"><Bot aria-hidden="true" />Abrir asistente IA</Button>
  <Card v-else class="max-h-[calc(100dvh-8rem)] overflow-hidden" aria-label="Asistente de IA del sílabo">
    <CardHeader class="border-b">
      <div class="flex items-start justify-between gap-3">
        <div><CardTitle class="flex items-center gap-2"><Bot class="size-4" aria-hidden="true" />Asistente IA</CardTitle><CardDescription>Pregunta sobre este sílabo</CardDescription></div>
        <div class="flex gap-1"><Button type="button" size="icon-sm" variant="ghost" aria-label="Limpiar conversación" @click="clear"><Trash2 aria-hidden="true" /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Cerrar asistente" @click="open = false"><X aria-hidden="true" /></Button></div>
      </div>
    </CardHeader>
    <CardContent class="min-h-0 p-0">
      <Conversation
        aria-label="Conversación con el asistente IA"
        class="max-h-[calc(100dvh-22rem)] min-h-64"
      >
      <ConversationContent class="gap-4 px-6 py-4" aria-live="polite">
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <template v-if="!messages.length">
        <div class="rounded-md border border-dashed p-4 text-center"><strong class="text-sm">¿En qué te ayudo?</strong><p class="mt-1 text-sm text-muted-foreground">Responderé usando únicamente las secciones habilitadas y las fuentes seleccionadas.</p></div>
        <Suggestions class="py-1" aria-label="Preguntas sugeridas">
        <Suggestion
          v-for="question in chat?.suggested_questions ?? []"
          :key="question"
          :suggestion="question"
          class="ai-chat-suggestion h-auto justify-start whitespace-normal text-left"
          @click="send(question)"
        >
          {{ question }}
        </Suggestion>
        </Suggestions>
      </template>
      <Message
        v-for="message in messages"
        :key="message.id"
        :from="message.role === 'usuario' ? 'user' : 'assistant'"
        class="ai-chat-message max-w-[92%]"
      >
        <MessageContent>
        <p
          v-if="
            message.status === 'pendiente' || message.status === 'en_ejecucion'
          "
        >
          Revisando el sílabo…
        </p>
        <p v-else-if="message.status === 'fallido'">{{ message.error }}</p>
        <p v-else>{{ message.content }}</p>
        <Sources v-if="message.citations.length" class="mt-3 border-t pt-2">
          <SourcesTrigger :count="message.citations.length">
            <span class="text-xs font-medium">{{ message.citations.length }} fuente(s)</span>
          </SourcesTrigger>
          <SourcesContent class="w-full">
          <Button
            v-for="citation in message.citations"
            :key="citation.id"
            type="button"
            variant="ghost"
            class="mt-2 h-auto w-full flex-col items-start whitespace-normal px-2 text-left"
            @click="
              citation.field_id
                ? emit('navigateToField', citation.field_id)
                : undefined
            "
          >
            <strong>{{ citation.label }}</strong><span class="text-xs opacity-80">{{ citation.excerpt }}</span>
          </Button>
          </SourcesContent>
        </Sources>
        </MessageContent>
      </Message>
      <section
        v-if="chat?.review || chat?.review_results.length"
        class="flex flex-col gap-4 border-t pt-4"
      >
        <h3 class="font-medium">Revisión del sílabo</h3>
        <div v-if="chat.review" class="ai-review-progress space-y-2 rounded-md border p-3" aria-live="polite">
          <div class="flex justify-between text-sm"><strong>{{ chat.review.progress }}%</strong><span class="text-muted-foreground">{{ chat.review.completed_fields }} de {{ chat.review.total_fields }} campos</span></div>
          <progress class="h-2 w-full accent-primary" :value="chat.review.completed_fields" :max="chat.review.total_fields" />
          <p v-if="chat.review.stale" class="text-xs text-muted-foreground">Esta revisión corresponde a una versión anterior del borrador.</p>
          <p v-else-if="chat.review.status === 'fallida'" class="text-xs text-destructive">La ayuda no estuvo disponible. Puede continuar sin IA.</p>
          <p v-else-if="chat.review.status === 'parcial'" class="text-xs text-muted-foreground">La revisión terminó parcialmente; las sugerencias siguen siendo opcionales.</p>
        </div>
        <section
          v-for="section in reviewSections"
          :key="section.id"
          class="space-y-3"
        >
          <h4 class="text-sm font-medium">{{ section.title }}</h4>
          <article
            v-for="result in section.results"
            :key="result.id"
            class="space-y-3 rounded-md border p-3"
          >
          <Button
            type="button"
            variant="link"
            class="h-auto p-0"
            @click="emit('navigateToField', result.field_id)"
          >
            {{ result.field_label }}
          </Button>
          <Badge v-if="result.stale" variant="outline">
            Resultado de una versión anterior.
          </Badge>
          <p
            v-if="
              result.status === 'pendiente' || result.status === 'en_ejecucion'
            "
          >
            Analizando…
          </p>
          <p v-if="result.reason">{{ result.reason }}</p>
          <p v-if="result.error">{{ result.error }}</p>
          <article
            v-for="recommendation in result.recommendations"
            :key="recommendation.id"
            class="space-y-2 rounded bg-muted/60 p-3"
          >
            <strong>{{ recommendation.title }}</strong>
            <p>{{ recommendation.explanation }}</p>
            <blockquote class="border-l-2 pl-3 text-sm">{{ recommendation.suggested_text }}</blockquote>
            <details v-if="recommendation.citations.length">
              <summary>Fuentes</summary>
              <p
                v-for="citation in recommendation.citations"
                :key="citation.id"
              >
                <strong>{{ citation.label }}</strong
                ><br />{{ citation.excerpt }}
              </p>
            </details>
            <div class="ai-review-actions flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                @click="decide(result.field_id, recommendation.id, 'aceptada')"
              >
                Útil
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                @click="decide(result.field_id, recommendation.id, 'ignorada')"
              >
                Ignorar
              </Button>
              <Button
                type="button"
                size="sm"
                :disabled="recommendation.applied || result.stale"
                @click="apply(result.field_id, recommendation.id)"
              >
                Aplicar
              </Button>
            </div>
          </article>
          </article>
        </section>
      </section>
      </ConversationContent>
      <ConversationScrollButton />
      </Conversation>
    </CardContent>
    <CardFooter class="flex-col gap-2 border-t">
    <form class="flex w-full items-end gap-2" @submit.prevent="send()">
      <Textarea
        v-model="draft"
        maxlength="4000"
        :disabled="sending || chat?.available === false"
        placeholder="Pregunta sobre tu sílabo…"
        aria-label="Pregunta para el asistente"
        class="min-h-20"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Enviar pregunta"
        :disabled="sending || !draft.trim() || chat?.available === false"
      >
        <Send aria-hidden="true" />
      </Button>
    </form>
    <small v-if="chat?.available === false" class="text-muted-foreground">La IA está deshabilitada en este entorno.</small>
    </CardFooter>
  </Card>
</template>
