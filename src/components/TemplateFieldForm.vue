<script setup lang="ts">
import type {
  TemplateContentType,
  TemplateFieldDraft,
} from "@/api/template";

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
  <div class="template-field-form">
    <label>
      Nombre <span aria-label="obligatorio">*</span>
      <input
        :value="modelValue.label"
        required
        maxlength="180"
        :disabled="disabled"
        @input="update('label', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <label v-if="showKey !== false">
      Clave <span aria-label="obligatorio">*</span>
      <input
        :value="modelValue.key"
        required
        maxlength="100"
        pattern="[a-z][a-z0-9_]*"
        :disabled="disabled || typeLocked"
        @input="update('key', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <label>
      Tipo de contenido <span aria-label="obligatorio">*</span>
      <select
        :value="modelValue.content_type"
        :disabled="disabled || typeLocked"
        @change="changeType(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="type in contentTypes"
          :key="type.value"
          :value="type.value"
        >
          {{ type.label }}
        </option>
      </select>
    </label>
    <label>
      Ayuda para el docente
      <textarea
        :value="modelValue.help"
        maxlength="2000"
        :disabled="disabled"
        @input="update('help', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>
    <fieldset v-if="modelValue.content_type === 'multiple_choice'">
      <legend>Opciones de respuesta</legend>
      <div
        v-for="(option, index) in modelValue.options"
        :key="index"
        class="template-choice-row"
      >
        <input
          :value="option.label"
          aria-label="Etiqueta de la opción"
          required
          :disabled="disabled"
          @input="
            updateOption(index, 'label', ($event.target as HTMLInputElement).value)
          "
        />
        <input
          :value="option.value"
          aria-label="Valor de la opción"
          required
          pattern="[a-zA-Z0-9_-]+"
          :disabled="disabled"
          @input="
            updateOption(index, 'value', ($event.target as HTMLInputElement).value)
          "
        />
        <button
          type="button"
          :disabled="disabled || modelValue.options.length <= 2"
          @click="removeOption(index)"
        >
          Quitar
        </button>
      </div>
      <button type="button" :disabled="disabled" @click="addOption">
        Agregar opción
      </button>
    </fieldset>
    <label v-if="aiAvailable !== false" class="checkbox-row">
      <input
        :checked="modelValue.ai_enabled"
        type="checkbox"
        :disabled="disabled"
        @change="update('ai_enabled', ($event.target as HTMLInputElement).checked)"
      />
      Usar este campo como contexto de IA
    </label>
    <label v-if="aiAvailable !== false" class="checkbox-row">
      <input
        :checked="modelValue.ai_coordinator_configurable"
        type="checkbox"
        :disabled="disabled"
        @change="
          update(
            'ai_coordinator_configurable',
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
      Permitir que Coordinación cambie el uso de IA
    </label>
  </div>
</template>
