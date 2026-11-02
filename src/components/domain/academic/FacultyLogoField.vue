<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { loadLogo, prepareLogo, type LoadedLogo } from '@/lib/logoPrepare';

defineProps<{ inputId: string; disabled?: boolean; invalid?: boolean; required?: boolean }>();
const logo = defineModel<File | null>({ default: null });
const emit = defineEmits<{ 'validation-error': [message: string | null] }>();

const source = ref<File | null>(null);
const loaded = ref<LoadedLogo | null>(null);
const removeWhite = ref(true);
const tolerance = ref(18);
const previewUrl = ref<string | null>(null);
const message = ref<string | null>(null);
let run = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const releasePreview = (): void => {
  if (previewUrl.value !== null) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
};

const prepare = async (): Promise<void> => {
  const current = loaded.value;
  if (current === null) return;
  const turn = ++run;
  try {
    const file = await prepareLogo(current, { removeWhite: removeWhite.value, tolerance: tolerance.value });
    if (turn !== run) return;
    releasePreview();
    previewUrl.value = URL.createObjectURL(file);
    message.value = null;
    logo.value = file;
  } catch (reason) {
    if (turn !== run) return;
    message.value = reason instanceof Error ? reason.message : 'No se pudo preparar la imagen';
    logo.value = null;
  }
};

watch(source, async (file) => {
  run++;
  loaded.value = null;
  message.value = null;
  releasePreview();
  if (file === null) {
    logo.value = null;
    return;
  }
  try {
    loaded.value = await loadLogo(file);
  } catch (reason) {
    message.value = reason instanceof Error ? reason.message : 'No se pudo leer la imagen';
    logo.value = null;
    return;
  }
  removeWhite.value = !loaded.value.transparent;
  await prepare();
});

watch([removeWhite, tolerance], () => {
  clearTimeout(timer);
  timer = setTimeout(() => void prepare(), 120);
});

watch(logo, (file) => {
  if (file === null && source.value !== null && loaded.value === null) source.value = null;
});

onBeforeUnmount(() => {
  clearTimeout(timer);
  releasePreview();
});
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <FileDropzone v-model="source" :input-id="inputId" kind="image" :max-bytes="10 * 1024 * 1024" :disabled="disabled" :invalid="invalid || message !== null" :required="required && logo === null" @validation-error="emit('validation-error', $event)" />
    <p v-if="message" class="text-sm text-destructive" role="alert">{{ message }}</p>
    <template v-if="previewUrl && source">
      <div class="grid gap-2 sm:grid-cols-2">
        <figure class="flex flex-col gap-1">
          <div class="flex h-20 items-center justify-center rounded-md border bg-[var(--document-paper)] p-2">
            <img :src="previewUrl" alt="Así se verá el logo en el documento" class="h-12 w-auto max-w-full object-contain">
          </div>
          <figcaption class="text-xs text-muted-foreground">Así se verá en el documento</figcaption>
        </figure>
        <figure class="flex flex-col gap-1">
          <div class="flex h-20 items-center justify-center rounded-md border p-2 [background:repeating-conic-gradient(var(--color-muted)_0%_25%,var(--color-card)_0%_50%)_50%/16px_16px]">
            <img :src="previewUrl" alt="Logo con su fondo transparente" class="h-12 w-auto max-w-full object-contain">
          </div>
          <figcaption class="text-xs text-muted-foreground">Lo cuadriculado es transparente</figcaption>
        </figure>
      </div>
      <div class="flex flex-col gap-2 rounded-md border bg-field p-3">
        <label class="flex items-center justify-between gap-3 text-sm font-medium" :for="`${inputId}-white`">
          Quitar el fondo blanco
          <Switch :id="`${inputId}-white`" v-model="removeWhite" :disabled="disabled" />
        </label>
        <div v-if="removeWhite" class="flex items-center gap-3 text-sm text-muted-foreground">
          <span :id="`${inputId}-strength`" class="shrink-0">Intensidad</span>
          <Slider :model-value="[tolerance]" :min="0" :max="80" :step="1" :disabled="disabled" :aria-labelledby="`${inputId}-strength`" @update:model-value="(value) => { if (value?.[0] !== undefined) tolerance = value[0]; }" />
        </div>
      </div>
    </template>
  </div>
</template>
