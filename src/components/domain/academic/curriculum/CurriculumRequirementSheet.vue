<script setup lang="ts">
import { Link2 } from "@lucide/vue";
import { computed, reactive, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createSubjectRequirement, type Curriculum } from "@/api/career-academics";
import FormSheet from "@/components/domain/FormSheet.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const props = defineProps<{ curriculum: Curriculum["curriculum"]; subjects: Curriculum["subjects"] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const form = reactive<{
  subject_id: string;
  requirement_id: string;
  type: "prerrequisito" | "correquisito";
}>({ subject_id: "", requirement_id: "", type: "prerrequisito" });
const saving = ref(false);
const error = ref<string | null>(null);
const requirementOptions = computed(() => props.subjects.filter((item) => item.id !== form.subject_id));
watch(open, (value) => { if (value) { form.subject_id = ""; form.requirement_id = ""; form.type = "prerrequisito"; error.value = null; } });
const submit = async (close: () => void) => {
  if (!form.subject_id || !form.requirement_id) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await createSubjectRequirement(props.curriculum.id, { ...form });
    emit("saved", result.message);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo agregar la relación.";
  } finally { saving.value = false; }
};
</script>
<template>
  <FormSheet v-model:open="open" trigger-label="Agregar relación" title="Agregar relación académica" description="Defina un prerrequisito o correquisito entre dos materias de la malla." :show-trigger="false">
    <template #default="{ close }"><form class="contents" @submit.prevent="submit(close)"><FieldGroup>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <Field><FieldLabel for="requirement-subject" required>Materia destino</FieldLabel><Select v-model="form.subject_id"><SelectTrigger id="requirement-subject"><SelectValue placeholder="Seleccione una materia" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in subjects" :key="item.id" :value="item.id">{{ item.code }} · {{ item.name }}</SelectItem></SelectGroup></SelectContent></Select></Field>
      <Field><FieldLabel for="requirement-source" required>Materia requerida</FieldLabel><Select v-model="form.requirement_id"><SelectTrigger id="requirement-source"><SelectValue placeholder="Seleccione una materia" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in requirementOptions" :key="item.id" :value="item.id">{{ item.code }} · {{ item.name }}</SelectItem></SelectGroup></SelectContent></Select></Field>
      <Field><FieldLabel for="requirement-type" required>Tipo</FieldLabel><Select v-model="form.type"><SelectTrigger id="requirement-type"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="prerrequisito">Prerrequisito</SelectItem><SelectItem value="correquisito">Correquisito</SelectItem></SelectGroup></SelectContent></Select></Field>
      <FormSheetActions :close="close" :processing="saving" :disabled="!form.subject_id || !form.requirement_id" :icon="Link2" label="Agregar relación" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
