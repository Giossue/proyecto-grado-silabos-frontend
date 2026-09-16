<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { ApiError } from "@/api/client";
import {
  applyAiRecommendation,
  clearAiChat,
  decideAiRecommendation,
  getAiChat,
  sendAiChatMessage,
  type AiChat,
} from "@/api/syllabi";

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
const messagesElement = ref<HTMLElement | null>(null);
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
    await nextTick();
    messagesElement.value?.scrollTo({
      top: messagesElement.value.scrollHeight,
      behavior: "smooth",
    });
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
  <button
    v-if="!open"
    class="ai-chat-launcher"
    type="button"
    @click="open = true"
  >
    Asistente IA
  </button>
  <aside v-else class="ai-chat-panel" aria-label="Asistente de IA del sílabo">
    <header>
      <div>
        <strong>Asistente IA</strong><small>Pregunta sobre este sílabo</small>
      </div>
      <div class="ai-chat-header-actions">
        <button type="button" title="Limpiar conversación" @click="clear">
          Limpiar
        </button>
        <button
          type="button"
          aria-label="Cerrar asistente"
          @click="open = false"
        >
          ×
        </button>
      </div>
    </header>
    <div ref="messagesElement" class="ai-chat-messages" aria-live="polite">
      <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
      <template v-if="!messages.length">
        <div class="ai-chat-empty">
          <strong>¿En qué te ayudo?</strong>
          <p>
            Responderé usando únicamente las secciones habilitadas y las fuentes
            seleccionadas.
          </p>
        </div>
        <button
          v-for="question in chat?.suggested_questions ?? []"
          :key="question"
          class="ai-chat-suggestion"
          type="button"
          @click="send(question)"
        >
          {{ question }}
        </button>
      </template>
      <article
        v-for="message in messages"
        :key="message.id"
        :class="['ai-chat-message', message.role]"
      >
        <p
          v-if="
            message.status === 'pendiente' || message.status === 'en_ejecucion'
          "
        >
          Revisando el sílabo…
        </p>
        <p v-else-if="message.status === 'fallido'">{{ message.error }}</p>
        <p v-else>{{ message.content }}</p>
        <details v-if="message.citations.length">
          <summary>{{ message.citations.length }} fuente(s)</summary>
          <button
            v-for="citation in message.citations"
            :key="citation.id"
            type="button"
            @click="
              citation.field_id
                ? emit('navigateToField', citation.field_id)
                : undefined
            "
          >
            <strong>{{ citation.label }}</strong
            ><span>{{ citation.excerpt }}</span>
          </button>
        </details>
      </article>
      <section
        v-if="chat?.review || chat?.review_results.length"
        class="ai-review-results"
      >
        <h3>Revisión del sílabo</h3>
        <div v-if="chat.review" class="ai-review-progress" aria-live="polite">
          <div>
            <strong>{{ chat.review.progress }}%</strong>
            <span>
              {{ chat.review.completed_fields }} de
              {{ chat.review.total_fields }} campos
            </span>
          </div>
          <progress
            :value="chat.review.completed_fields"
            :max="chat.review.total_fields"
          />
          <p v-if="chat.review.stale" class="save-status">
            Esta revisión corresponde a una versión anterior del borrador.
          </p>
          <p v-else-if="chat.review.status === 'fallida'" class="feedback error">
            La ayuda no estuvo disponible. Puede continuar y volver a intentarlo tras
            editar el borrador.
          </p>
          <p v-else-if="chat.review.status === 'parcial'" class="save-status">
            La revisión terminó parcialmente; los resultados disponibles siguen siendo
            opcionales.
          </p>
        </div>
        <section
          v-for="section in reviewSections"
          :key="section.id"
          class="ai-review-section"
        >
          <h4>{{ section.title }}</h4>
          <article
            v-for="result in section.results"
            :key="result.id"
            class="ai-review-card"
          >
          <button
            class="ai-review-field"
            type="button"
            @click="emit('navigateToField', result.field_id)"
          >
            {{ result.field_label }}
          </button>
          <p v-if="result.stale" class="save-status">
            Resultado de una versión anterior.
          </p>
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
            class="ai-review-recommendation"
          >
            <strong>{{ recommendation.title }}</strong>
            <p>{{ recommendation.explanation }}</p>
            <blockquote>{{ recommendation.suggested_text }}</blockquote>
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
            <div class="ai-review-actions">
              <button
                type="button"
                @click="decide(result.field_id, recommendation.id, 'aceptada')"
              >
                Útil
              </button>
              <button
                type="button"
                @click="decide(result.field_id, recommendation.id, 'ignorada')"
              >
                Ignorar
              </button>
              <button
                type="button"
                :disabled="recommendation.applied || result.stale"
                @click="apply(result.field_id, recommendation.id)"
              >
                Aplicar
              </button>
            </div>
          </article>
          </article>
        </section>
      </section>
    </div>
    <form class="ai-chat-input" @submit.prevent="send()">
      <textarea
        v-model="draft"
        maxlength="4000"
        :disabled="sending || chat?.available === false"
        placeholder="Pregunta sobre tu sílabo…"
        aria-label="Pregunta para el asistente"
      />
      <button
        type="submit"
        :disabled="sending || !draft.trim() || chat?.available === false"
      >
        Enviar
      </button>
    </form>
    <small v-if="chat?.available === false" class="ai-chat-disabled"
      >La IA está deshabilitada en este entorno.</small
    >
  </aside>
</template>
