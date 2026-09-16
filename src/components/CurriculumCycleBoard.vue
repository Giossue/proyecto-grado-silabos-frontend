<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import type { Curriculum } from "@/api/career-academics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
      cycle: subject.cycle ?? 1,
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
  <section class="grid gap-5" aria-label="Materias organizadas por ciclo">
    <Card v-for="cycle in cycles" :key="cycle.number">
      <CardHeader class="flex-row items-center justify-between border-b">
        <CardTitle>Ciclo {{ cycle.number }}</CardTitle>
        <Badge variant="secondary">{{ cycle.subjects.length }} materia{{ cycle.subjects.length === 1 ? "" : "s" }}</Badge>
      </CardHeader>
      <CardContent class="pt-6">
        <p v-if="cycle.subjects.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Sin materias.</p>
        <div v-else class="grid gap-4 lg:grid-cols-2">
          <article v-for="subject in cycle.subjects" :key="subject.id" class="grid gap-4 rounded-lg border p-4">
            <header class="flex items-start justify-between gap-3">
              <div class="grid gap-1"><strong>{{ subject.code }}</strong><span class="text-sm text-muted-foreground">{{ subject.name }}</span></div>
              <Badge :variant="subject.active ? 'default' : 'secondary'">{{ subject.active ? "Activa" : "Inactiva" }}</Badge>
            </header>
            <dl class="grid grid-cols-3 gap-3 text-sm">
              <div class="grid gap-1"><dt class="text-muted-foreground">Unidad</dt><dd>{{ subject.organization_unit }}</dd></div>
              <div class="grid gap-1"><dt class="text-muted-foreground">Créditos</dt><dd>{{ subject.credits }}</dd></div>
              <div class="grid gap-1"><dt class="text-muted-foreground">Horas</dt><dd>{{ subject.total_hours }}</dd></div>
            </dl>
            <form class="grid grid-cols-[1fr_1fr_auto] items-end gap-3" @submit.prevent="saveLayout(subject)">
              <Field><FieldLabel :for="`cycle-${subject.id}`">Ciclo</FieldLabel><NativeSelect :id="`cycle-${subject.id}`" v-model="layout[subject.id]!.cycle" class="w-full" :disabled="disabled"><NativeSelectOption v-for="number in cycleCount" :key="number" :value="number">{{ number }}</NativeSelectOption></NativeSelect></Field>
              <Field><FieldLabel :for="`position-${subject.id}`">Orden</FieldLabel><Input :id="`position-${subject.id}`" v-model.number="layout[subject.id]!.position" type="number" min="0" max="999" :disabled="disabled" /></Field>
              <Button type="submit" variant="outline" :disabled="disabled || saving">Guardar</Button>
            </form>
            <footer class="subject-actions flex flex-wrap justify-end gap-2 border-t pt-3">
              <Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="emit('edit', subject)">Editar</Button>
              <Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="emit('status', subject)">{{ subject.active ? "Desactivar" : "Activar" }}</Button>
              <Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="emit('remove', subject)">Eliminar</Button>
            </footer>
          </article>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
