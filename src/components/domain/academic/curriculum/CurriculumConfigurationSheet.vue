<script setup lang="ts">
import { Settings2 } from "@lucide/vue";
import { reactive, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { updateCurriculumConfiguration, type Curriculum } from "@/api/career-academics";
import FormSheet from "@/components/domain/FormSheet.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const props = defineProps<{ curriculum: Curriculum["curriculum"] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const form = reactive({ code: "", cycle_count: 1 });
const saving = ref(false);
const error = ref<string | null>(null);
watch(open, (value) => { if (value) { form.code = props.curriculum.code; form.cycle_count = props.curriculum.cycle_count; error.value = null; } });
const submit = async (close: () => void) => {
  saving.value = true;
  error.value = null;
  try {
    const result = await updateCurriculumConfiguration(props.curriculum.id, { ...form });
    emit("saved", result.message);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo configurar la malla.";
  } finally { saving.value = false; }
};
</script>
<template>
  <FormSheet v-model:open="open" trigger-label="Configurar malla" title="Configurar la malla" description="El cambio de código queda en auditoría. Los ciclos pueden variar entre carreras." :show-trigger="false">
    <template #default="{ close }"><form class="contents" @submit.prevent="submit(close)"><FieldGroup>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <Field><FieldLabel for="curriculum-code" required>Código</FieldLabel><Input id="curriculum-code" v-model="form.code" placeholder="Ej. MALLA-SW-2026" required /></Field>
      <Field><FieldLabel for="curriculum-cycle-count" required>Cantidad de ciclos</FieldLabel><Input id="curriculum-cycle-count" v-model.number="form.cycle_count" type="number" min="1" max="30" required /></Field>
      <FormSheetActions :close="close" :processing="saving" :icon="Settings2" label="Guardar configuración" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
