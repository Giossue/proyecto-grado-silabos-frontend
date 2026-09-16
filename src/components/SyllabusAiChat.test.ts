import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SyllabusAiChat from "@/components/SyllabusAiChat.vue";
import {
  applyAiRecommendation,
  clearAiChat,
  decideAiRecommendation,
  getAiChat,
  sendAiChatMessage,
} from "@/api/syllabi";

vi.mock("@/api/syllabi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/syllabi")>();

  return {
    ...actual,
    getAiChat: vi.fn(),
    sendAiChatMessage: vi.fn(),
    clearAiChat: vi.fn(),
    decideAiRecommendation: vi.fn(),
    applyAiRecommendation: vi.fn(),
  };
});

const emptyChat = {
  conversation: null,
  suggested_questions: ["¿Qué debo revisar?"],
  available: true,
  review: null,
  review_results: [],
};

describe("SyllabusAiChat", () => {
  beforeEach(() => {
    vi.mocked(getAiChat).mockResolvedValue(emptyChat);
    vi.mocked(sendAiChatMessage).mockResolvedValue({
      message: "Registrada",
      assistant_message_id: "answer-1",
    });
    vi.mocked(clearAiChat).mockResolvedValue({ message: "Oculta" });
    vi.mocked(decideAiRecommendation).mockResolvedValue({ message: "Registrada" });
    vi.mocked(applyAiRecommendation).mockResolvedValue({
      message: "Aplicada",
      version_bloqueo: 3,
      completion: 100,
      value: "Texto recomendado",
    });
  });

  it("envía una pregunta sugerida y vuelve a consultar la conversación", async () => {
    const wrapper = mount(SyllabusAiChat, {
      props: { syllabusId: "syllabus-1", draftVersion: 2 },
    });
    await flushPromises();

    await wrapper.get(".ai-chat-suggestion").trigger("click");
    await flushPromises();

    expect(sendAiChatMessage).toHaveBeenCalledWith(
      "syllabus-1",
      "¿Qué debo revisar?",
    );
    expect(getAiChat).toHaveBeenCalledTimes(2);
  });

  it("emite navegación al seleccionar una cita de una sección", async () => {
    vi.mocked(getAiChat).mockResolvedValue({
      ...emptyChat,
      conversation: {
        id: "conversation-1",
        hidden: false,
        messages: [
          {
            id: "message-1",
            role: "asistente",
            status: "completado",
            content: "Revisa el objetivo.",
            draft_version: 2,
            error: null,
            created_at: "2026-09-16T00:00:00Z",
            citations: [
              {
                id: "evidence-1",
                type: "seccion_silabo",
                field_id: "field-1",
                source_id: null,
                label: "Objetivos",
                excerpt: "Contenido",
              },
            ],
          },
        ],
      },
    });
    const wrapper = mount(SyllabusAiChat, {
      props: { syllabusId: "syllabus-1", draftVersion: 2 },
    });
    await flushPromises();

    await wrapper.get(".ai-chat-message details button").trigger("click");

    expect(wrapper.emitted("navigateToField")).toEqual([["field-1"]]);
  });

  it("muestra el progreso agregado de la revisión integral", async () => {
    vi.mocked(getAiChat).mockResolvedValue({
      ...emptyChat,
      review: {
        id: "review-1",
        status: "completada",
        draft_version: 2,
        stale: false,
        total_fields: 2,
        completed_fields: 2,
        fields_with_recommendations: 1,
        failed_fields: 0,
        progress: 100,
        requested_at: "2026-09-16T00:00:00Z",
        completed_at: "2026-09-16T00:00:03Z",
      },
    });
    const wrapper = mount(SyllabusAiChat, {
      props: { syllabusId: "syllabus-1", draftVersion: 2 },
    });
    await flushPromises();

    expect(wrapper.get(".ai-review-progress").text()).toContain("100%");
    expect(wrapper.get(".ai-review-progress").text()).toContain(
      "2 de 2 campos",
    );
  });

  it("registra la decisión humana y aplica una recomendación explícitamente", async () => {
    vi.mocked(getAiChat).mockResolvedValue({
      ...emptyChat,
      review_results: [{
        id: "result-1",
        field_id: "field-1",
        field_label: "Objetivo general",
        section: { id: "section-1", title: "Objetivos" },
        status: "completado",
        stale: false,
        reason: null,
        error: null,
        recommendations: [{
          id: "recommendation-1",
          title: "Precise el verbo",
          explanation: "La acción puede medirse mejor.",
          suggested_text: "Evaluar soluciones de IA.",
          applied: false,
          decisions: [],
          citations: [],
        }],
      }],
    });
    const wrapper = mount(SyllabusAiChat, {
      props: { syllabusId: "syllabus-1", draftVersion: 2 },
    });
    await flushPromises();

    const buttons = wrapper.findAll(".ai-review-actions button");
    await buttons[0]!.trigger("click");
    await flushPromises();
    expect(decideAiRecommendation).toHaveBeenCalledWith(
      "syllabus-1",
      "field-1",
      "recommendation-1",
      "aceptada",
    );

    await buttons[2]!.trigger("click");
    await flushPromises();
    expect(applyAiRecommendation).toHaveBeenCalledWith(
      "syllabus-1",
      "field-1",
      "recommendation-1",
      2,
    );
    expect(wrapper.emitted("recommendationApplied")).toEqual([[
      {
        fieldId: "field-1",
        value: "Texto recomendado",
        version: 3,
        completion: 100,
      },
    ]]);
  });
});
