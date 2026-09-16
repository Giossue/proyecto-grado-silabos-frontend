<script setup lang="ts">
import { Check, Plus } from "@lucide/vue";
import { computed, reactive, ref, toRaw, watch } from "vue";
import { ApiError } from "@/api/client";
import { createCareerRecord, updateCareerRecord, type Curriculum } from "@/api/career-academics";
import CurriculumSubjectFieldInput from "@/components/domain/academic/curriculum/CurriculumSubjectFieldInput.vue";
import OrganizationUnitInput from "@/components/domain/academic/curriculum/OrganizationUnitInput.vue";
import FormSheet from "@/components/domain/FormSheet.vue";
import FormSheetActions from "@/components/domain/FormSheetActions.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurriculumSubjectFieldValues } from "@/composables/useCurriculumSubjectFieldValues";
import { INHERITED_MODALITY } from "@/lib/studyModalities";

const props = defineProps<{
  career: Curriculum["career"];
  curriculum: Curriculum["curriculum"];
  fixedFields: Curriculum["fixedFields"];
  subject: Curriculum["subjects"][number] | null;
  organizationUnits: string[];
  modalityOptions: Curriculum["modalityOptions"];
}>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const form = reactive({ code: "", nombre: "", cycle: 1, position: 0, organization_unit: "", modality: INHERITED_MODALITY });
const saving = ref(false);
const error = ref<string | null>(null);
const title = computed(() => props.subject ? `Editar ${props.subject.name}` : "Agregar materia");
const { reset: resetValues, updateValue, valueFor } = useCurriculumSubjectFieldValues(() => props.subject, () => props.fixedFields);
const reset = () => {
  form.code = props.subject?.code ?? "";
  form.nombre = props.subject?.name ?? "";
  form.cycle = props.subject?.cycle ?? 1;
  form.position = props.subject?.position ?? 0;
  form.organization_unit = props.subject?.organization_unit ?? "";
  form.modality = props.subject?.modality ?? INHERITED_MODALITY;
  error.value = null;
  resetValues();
};
watch(open, (value) => value && reset());
const submit = async (close: () => void) => {
  saving.value = true;
  error.value = null;
  const values = Object.fromEntries(props.fixedFields.map((field) => [field.system_key, valueFor(field)]));
  const payload = { ...toRaw(form), modality: form.modality === INHERITED_MODALITY ? null : form.modality, ...values };
  try {
    const result = props.subject
      ? await updateCareerRecord("asignatura", props.subject.id, payload)
      : await createCareerRecord("asignatura", payload);
    emit("saved", result.message);
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo guardar la materia.";
  } finally { saving.value = false; }
};
</script>
<template>
  <FormSheet v-model:open="open" trigger-label="Agregar materia" :title="title" description="La tarjeta y la vista formulario guardan exactamente la misma información académica." :show-trigger="false">
    <template #default="{ close }"><form class="contents" @submit.prevent="submit(close)"><FieldGroup>
      <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
      <Field><FieldLabel for="builder-subject-code" required>Código</FieldLabel><Input id="builder-subject-code" v-model="form.code" placeholder="Ej. SW-601" required /></Field>
      <Field><FieldLabel for="builder-subject-name" required>Nombre</FieldLabel><Input id="builder-subject-name" v-model="form.nombre" placeholder="Ej. Ingeniería de requisitos" required /></Field>
      <Field><FieldLabel for="builder-subject-cycle" required>Ciclo</FieldLabel><Input id="builder-subject-cycle" v-model.number="form.cycle" type="number" min="1" :max="curriculum.cycle_count" required /></Field>
      <Field><FieldLabel for="builder-subject-unit" required>Unidad de organización curricular</FieldLabel><OrganizationUnitInput id="builder-subject-unit" name="organization_unit" v-model="form.organization_unit" :options="organizationUnits" /></Field>
      <Field><FieldLabel for="builder-subject-modality">Modalidad</FieldLabel><Select v-model="form.modality"><SelectTrigger id="builder-subject-modality"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem :value="INHERITED_MODALITY">Igual que la carrera ({{ career.modality?.label ?? "sin modalidad" }})</SelectItem><SelectItem v-for="item in modalityOptions" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select></Field>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-5"><CurriculumSubjectFieldInput v-for="field in fixedFields" :key="field.id" :class="field.type === 'texto' ? 'col-span-2 sm:col-span-5' : undefined" :field="field" :input-id="`builder-field-${field.id}`" :value="valueFor(field)" @update:value="updateValue(field, $event)" /></div>
      <FormSheetActions :close="close" :processing="saving" :icon="subject ? Check : Plus" :label="subject ? 'Guardar materia' : 'Agregar materia'" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
