<script setup lang="ts">
import { UserRoundCog } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { relieveCareerTeacher, type TeacherAssignments } from "@/api/career-academics";
import FormSheet from "@/components/domain/FormSheet.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const props = defineProps<{ outgoingTeacher: { id: string; name: string; parallelCount: number }; options: TeacherAssignments["options"] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const incomingId = ref("");
const idempotencyKey = ref("");
const saving = ref(false);
const error = ref<string | null>(null);
const replacements = computed(() => props.options.teacherUsers.filter((item) => item.id !== props.outgoingTeacher.id));
const impactLabel = computed(() => `${props.outgoingTeacher.parallelCount} ${props.outgoingTeacher.parallelCount === 1 ? "paralelo vigente" : "paralelos vigentes"}`);
watch(open, (value) => { if (value) { incomingId.value = ""; error.value = null; idempotencyKey.value = crypto.randomUUID(); } });
const submit = async (close: () => void) => {
  if (!incomingId.value) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await relieveCareerTeacher({ outgoing_user_id: props.outgoingTeacher.id, incoming_user_id: incomingId.value, idempotency_key: idempotencyKey.value });
    emit("saved", result.message);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo aplicar el relevo.";
  } finally { saving.value = false; }
};
</script>

<template>
  <FormSheet v-model:open="open" trigger-label="Relevar docente" :title="`Relevar a ${outgoingTeacher.name}`" :description="`Transfiera ${impactLabel} a otro docente de la carrera.`" :show-trigger="false">
    <template #default="{ close }"><form class="contents" @submit.prevent="submit(close)"><FieldGroup>
      <Alert><AlertDescription>Los sílabos relacionados también pasarán al docente entrante. Los borradores sin enviar empezarán de nuevo, los aprobados conservarán su revisión y el cambio se bloqueará si existe un sílabo en revisión.</AlertDescription></Alert>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <Field><FieldLabel for="relief-incoming" required>Docente entrante</FieldLabel><Select v-model="incomingId" required><SelectTrigger id="relief-incoming"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="teacher in replacements" :key="teacher.id" :value="teacher.id">{{ teacher.name }} · {{ teacher.email }}</SelectItem></SelectGroup></SelectContent></Select></Field>
      <FormSheetActions :close="close" :processing="saving" :disabled="!incomingId" :icon="UserRoundCog" label="Aplicar relevo" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
