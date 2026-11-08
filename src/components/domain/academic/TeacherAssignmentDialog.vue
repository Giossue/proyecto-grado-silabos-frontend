<script setup lang="ts">
import { UserPlus } from "@lucide/vue";
import { ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createCareerRecord, type TeacherAssignments } from "@/api/career-academics";
import FormModal from "@/components/domain/FormModal.vue";
import FormDialogActions from "@/components/domain/FormDialogActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const props = withDefaults(defineProps<{ options: TeacherAssignments["options"]; showTrigger?: boolean; disabled?: boolean }>(), { showTrigger: true, disabled: false });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const userId = ref("");
const parallelId = ref("");
const saving = ref(false);
const error = ref<string | null>(null);
const reset = () => { userId.value = ""; parallelId.value = ""; error.value = null; };
const submit = async (close: () => void) => {
  if (props.disabled) return;
  if (!userId.value || !parallelId.value) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await createCareerRecord("asignacion_docente", { user_id: userId.value, parallel_id: parallelId.value });
    emit("saved", result.message);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo asignar el docente";
  } finally { saving.value = false; }
};
watch(open, (value) => value && reset());
</script>

<template>
  <FormModal v-model:open="open" :disabled="props.disabled" trigger-label="Asignar docente" title="Asignar docente" description="Elija quién elabora el sílabo del paralelo" :show-trigger="showTrigger">
    <template #default="{ close }"><form class="contents" @submit.prevent="submit(close)"><FieldGroup>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <Field><FieldLabel for="teacher-user" required>Docente</FieldLabel><Select v-model="userId" required><SelectTrigger id="teacher-user"><SelectValue placeholder="Seleccione un docente" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="teacher in props.options.teacherUsers" :key="teacher.id" :value="teacher.id">{{ teacher.name }} · {{ teacher.email }}</SelectItem></SelectGroup></SelectContent></Select></Field>
      <Field><FieldLabel for="teacher-parallel" required>Materia y paralelo</FieldLabel><Select v-model="parallelId" required><SelectTrigger id="teacher-parallel"><SelectValue placeholder="Seleccione un paralelo" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="parallel in props.options.parallels" :key="parallel.id" :value="parallel.id">{{ parallel.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldDescription>Si el paralelo ya tenía sílabo, se borra y el docente empieza de cero</FieldDescription></Field>
      <FormDialogActions :close="close" :processing="saving" :disabled="!userId || !parallelId" :icon="UserPlus" label="Asignar docencia" />
    </FieldGroup></form></template>
  </FormModal>
</template>
