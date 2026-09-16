<script setup lang="ts">
import { UserPlus } from "@lucide/vue";
import { reactive, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { createCareerTeacher } from "@/api/career-academics";
import FormSheet from "@/components/domain/FormSheet.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const form = reactive({ nombre: "", correo_electronico: "", password: "" });
const saving = ref(false);
const error = ref<string | null>(null);
watch(open, (value) => { if (value) { form.nombre = ""; form.correo_electronico = ""; form.password = ""; error.value = null; } });
const submit = async (close: () => void) => {
  saving.value = true;
  error.value = null;
  try {
    const result = await createCareerTeacher({ ...form });
    emit("saved", result.message);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo crear el docente.";
  } finally { saving.value = false; }
};
</script>
<template>
  <FormSheet v-model:open="open" trigger-label="Crear docente" title="Crear docente" description="Cree una cuenta nueva o incorpore una existente por su correo." :show-trigger="false">
    <template #default="{ close }"><form class="contents" @submit.prevent="submit(close)"><FieldGroup>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <Field><FieldLabel for="teacher-name" required>Nombre</FieldLabel><Input id="teacher-name" v-model="form.nombre" placeholder="Ej. Ana Pérez" required /></Field>
      <Field><FieldLabel for="teacher-email" required>Correo institucional</FieldLabel><Input id="teacher-email" v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" required /></Field>
      <Field><FieldLabel for="teacher-password" required>Contraseña temporal</FieldLabel><Input id="teacher-password" v-model="form.password" type="password" required /></Field>
      <FormSheetActions :close="close" :processing="saving" :icon="UserPlus" label="Guardar docente" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
