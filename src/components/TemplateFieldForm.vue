<script setup lang="ts">
import type {
  TemplateContentType,
  TemplateFieldDraft,
} from "@/api/template";
import { Plus, Trash2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const props = defineProps<{
  modelValue: TemplateFieldDraft;
  contentTypes: Array<{ value: TemplateContentType; label: string }>;
  disabled?: boolean;
  showKey?: boolean;
  typeLocked?: boolean;
  aiAvailable?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TemplateFieldDraft];
}>();

const update = <K extends keyof TemplateFieldDraft>(
  key: K,
  value: TemplateFieldDraft[K],
): void => {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
};

const updateOption = (
  index: number,
  key: "value" | "label",
  value: string,
): void => {
  const options = props.modelValue.options.map((option, current) =>
    current === index ? { ...option, [key]: value } : option,
  );
  update("options", options);
};

const addOption = (): void => {
  const number = props.modelValue.options.length + 1;
  update("options", [
    ...props.modelValue.options,
    { value: `opcion_${number}`, label: `Opción ${number}` },
  ]);
};

const removeOption = (index: number): void => {
  update(
    "options",
    props.modelValue.options.filter((_, current) => current !== index),
  );
};

const changeType = (value: string): void => {
  const contentType = value as TemplateContentType;
  update("content_type", contentType);
  if (contentType === "multiple_choice" && props.modelValue.options.length < 2) {
    update("options", [
      { value: "opcion_1", label: "Opción 1" },
      { value: "opcion_2", label: "Opción 2" },
    ]);
  }
};
</script>

<template>
  <FieldGroup class="grid gap-5">
    <Field>
      <FieldLabel required>Nombre</FieldLabel>
      <Input
        :value="modelValue.label"
        required
        maxlength="180"
        :disabled="disabled"
        @input="update('label', ($event.target as HTMLInputElement).value)"
      />
    </Field>
    <Field v-if="showKey !== false">
      <FieldLabel required>Clave</FieldLabel>
      <Input
        :value="modelValue.key"
        required
        maxlength="100"
        pattern="[a-z][a-z0-9_]*"
        :disabled="disabled || typeLocked"
        @input="update('key', ($event.target as HTMLInputElement).value)"
      />
    </Field>
    <Field>
      <FieldLabel required>Tipo de contenido</FieldLabel>
      <NativeSelect
        :model-value="modelValue.content_type"
        class="w-full"
        :disabled="disabled || typeLocked"
        @update:model-value="changeType(String($event))"
      >
        <NativeSelectOption
          v-for="type in contentTypes"
          :key="type.value"
          :value="type.value"
        >{{ type.label }}</NativeSelectOption>
      </NativeSelect>
    </Field>
    <Field>
      <FieldLabel>Ayuda para el docente</FieldLabel>
      <Textarea
        :value="modelValue.help"
        maxlength="2000"
        :disabled="disabled"
        @input="update('help', ($event.target as HTMLTextAreaElement).value)"
      />
    </Field>
    <fieldset v-if="modelValue.content_type === 'multiple_choice'" class="grid gap-3 rounded-lg border p-4">
      <legend class="px-1 text-sm font-medium">Opciones de respuesta</legend>
      <div
        v-for="(option, index) in modelValue.options"
        :key="index"
        class="template-choice-row grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <Input
          :value="option.label"
          aria-label="Etiqueta de la opción"
          required
          :disabled="disabled"
          @input="
            updateOption(index, 'label', ($event.target as HTMLInputElement).value)
          "
        />
        <Input
          :value="option.value"
          aria-label="Valor de la opción"
          required
          pattern="[a-zA-Z0-9_-]+"
          :disabled="disabled"
          @input="
            updateOption(index, 'value', ($event.target as HTMLInputElement).value)
          "
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Quitar opción"
          :disabled="disabled || modelValue.options.length <= 2"
          @click="removeOption(index)"
        ><Trash2 aria-hidden="true" /></Button>
      </div>
      <Button class="w-fit" type="button" variant="outline" :disabled="disabled" @click="addOption"><Plus aria-hidden="true" />Agregar opción</Button>
    </fieldset>
    <Field v-if="aiAvailable !== false" orientation="horizontal" class="checkbox-row items-center">
      <Checkbox
        :model-value="modelValue.ai_enabled"
        id="field-ai-enabled"
        :disabled="disabled"
        @update:model-value="update('ai_enabled', Boolean($event))"
      />
      <FieldLabel for="field-ai-enabled">Usar este campo como contexto de IA</FieldLabel>
    </Field>
    <Field v-if="aiAvailable !== false" orientation="horizontal" class="checkbox-row items-center">
      <Checkbox
        :model-value="modelValue.ai_coordinator_configurable"
        id="field-ai-coordinator-configurable"
        :disabled="disabled"
        @update:model-value="update('ai_coordinator_configurable', Boolean($event))"
      />
      <FieldLabel for="field-ai-coordinator-configurable">Permitir que Coordinación cambie el uso de IA</FieldLabel>
    </Field>
  </FieldGroup>
</template>
