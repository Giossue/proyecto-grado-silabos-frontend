<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { Curriculum } from "@/api/career-academics";

type Subject = Curriculum["subjects"][number];
type LayoutValue = { cycle: number; position: number };

const props = defineProps<{
  subjects: Subject[];
  cycleCount: number;
  disabled?: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  edit: [subject: Subject];
  status: [subject: Subject];
  remove: [subject: Subject];
  layout: [payload: { subject_id: string; cycle: number; position: number }];
}>();

const layout = reactive<Record<string, LayoutValue>>({});

const resetLayout = (): void => {
  for (const key of Object.keys(layout)) delete layout[key];
  props.subjects.forEach((subject) => {
    layout[subject.id] = {
      cycle: subject.cycle,
      position: subject.position ?? 0,
    };
  });
};

watch(() => props.subjects, resetLayout, { deep: true, immediate: true });

const cycles = computed(() =>
  Array.from({ length: props.cycleCount }, (_, index) => ({
    number: index + 1,
    subjects: props.subjects
      .filter((subject) => subject.cycle === index + 1)
      .sort(
        (left, right) =>
          (left.position ?? 0) - (right.position ?? 0) ||
          left.name.localeCompare(right.name),
      ),
  })),
);

const saveLayout = (subject: Subject): void => {
  const value = layout[subject.id];
  if (!value) return;
  emit("layout", {
    subject_id: subject.id,
    cycle: value.cycle,
    position: value.position,
  });
};
</script>

<template>
  <section class="curriculum-board" aria-label="Materias organizadas por ciclo">
    <article v-for="cycle in cycles" :key="cycle.number" class="curriculum-cycle">
      <header>
        <h3>Ciclo {{ cycle.number }}</h3>
        <span>{{ cycle.subjects.length }} materia{{ cycle.subjects.length === 1 ? "" : "s" }}</span>
      </header>
      <p v-if="cycle.subjects.length === 0" class="cycle-empty">Sin materias.</p>
      <div v-else class="cycle-subjects">
        <article v-for="subject in cycle.subjects" :key="subject.id" class="curriculum-subject">
          <header>
            <div>
              <strong>{{ subject.code }}</strong>
              <span>{{ subject.name }}</span>
            </div>
            <span class="role-badge">{{ subject.active ? "Activa" : "Inactiva" }}</span>
          </header>
          <dl>
            <div><dt>Unidad</dt><dd>{{ subject.organization_unit }}</dd></div>
            <div><dt>Créditos</dt><dd>{{ subject.credits }}</dd></div>
            <div><dt>Horas</dt><dd>{{ subject.total_hours }}</dd></div>
          </dl>
          <form class="subject-layout" @submit.prevent="saveLayout(subject)">
            <label>
              Ciclo
              <select v-model.number="layout[subject.id].cycle" :disabled="disabled">
                <option v-for="number in cycleCount" :key="number" :value="number">{{ number }}</option>
              </select>
            </label>
            <label>
              Orden
              <input v-model.number="layout[subject.id].position" type="number" min="0" max="999" :disabled="disabled" />
            </label>
            <button type="submit" :disabled="disabled || saving">Guardar posición</button>
          </form>
          <div class="subject-actions">
            <button type="button" :disabled="disabled" @click="emit('edit', subject)">Editar</button>
            <button type="button" :disabled="disabled" @click="emit('status', subject)">{{ subject.active ? "Desactivar" : "Activar" }}</button>
            <button type="button" :disabled="disabled" @click="emit('remove', subject)">Eliminar</button>
          </div>
        </article>
      </div>
    </article>
  </section>
</template>
