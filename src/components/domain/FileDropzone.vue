<script setup lang="ts">
import { FileText, ImageIcon, Upload, X } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle } from '@/components/ui/attachment';
import { cn } from '@/lib/utils';

type FileKind = 'pdf' | 'png';

const props = withDefaults(defineProps<{
  modelValue: File | null;
  inputId: string;
  disabled?: boolean;
  invalid?: boolean;
  maxBytes?: number;
  kind?: FileKind;
  state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done';
}>(), {
  disabled: false,
  invalid: false,
  maxBytes: 50 * 1024 * 1024,
  kind: 'pdf' as FileKind,
  state: 'idle',
});
const emit = defineEmits<{
  'update:modelValue': [file: File | null];
  'validation-error': [message: string | null];
}>();

const input = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const dragDepth = ref(0);
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatLimit = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes) ? `${megabytes} MB` : formatBytes(bytes);
};

const copy = computed(() => props.kind === 'png' ? {
  accept: 'image/png,.png',
  label: 'PNG',
  invalid: 'Seleccione un archivo PNG.',
  maxError: `El PNG no puede superar los ${formatLimit(props.maxBytes)}.`,
  emptyTitle: 'Arrastra tu PNG aquí',
  selectedTitle: 'PNG seleccionado',
  selectedDescription: 'Arrastra otro PNG o haz clic para reemplazarlo',
  replaceLabel: 'Reemplazar PNG seleccionado',
  chooseLabel: 'Cargar archivo PNG',
  removeLabel: 'Quitar PNG',
  dropAnnouncement: 'Suelta el PNG para seleccionarlo.',
} : {
  accept: 'application/pdf,.pdf',
  label: 'PDF',
  invalid: 'Seleccione un archivo PDF.',
  maxError: `El PDF no puede superar los ${formatLimit(props.maxBytes)}.`,
  emptyTitle: 'Arrastra tu PDF aquí',
  selectedTitle: 'PDF seleccionado',
  selectedDescription: 'Arrastra otro PDF o haz clic para reemplazarlo',
  replaceLabel: 'Reemplazar PDF seleccionado',
  chooseLabel: 'Cargar archivo PDF',
  removeLabel: 'Quitar PDF',
  dropAnnouncement: 'Suelta el PDF para seleccionarlo.',
});
const fileDescription = computed(() => props.modelValue ? `${copy.value.label} · ${formatBytes(props.modelValue.size)}` : '');
const dropzoneClass = computed(() => cn(
  'flex min-h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors',
  props.disabled && 'cursor-not-allowed opacity-60',
  props.invalid && 'border-destructive/60 bg-destructive/5',
  !props.invalid && isDragging.value && 'border-primary bg-primary/5',
  !props.invalid && !isDragging.value && 'border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40',
));

const chooseFile = (): void => {
  if (!props.disabled) input.value?.click();
};

const setFile = (file: File | null): void => {
  if (!file) {
    emit('update:modelValue', null);
    emit('validation-error', null);
    return;
  }
  const isAccepted = props.kind === 'png'
    ? file.name.toLowerCase().endsWith('.png') || file.type === 'image/png'
    : file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  if (!isAccepted) {
    emit('update:modelValue', null);
    emit('validation-error', copy.value.invalid);
    return;
  }
  if (file.size > props.maxBytes) {
    emit('update:modelValue', null);
    emit('validation-error', copy.value.maxError);
    return;
  }
  emit('update:modelValue', file);
  emit('validation-error', null);
};

const selectFile = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  setFile(target.files?.[0] ?? null);
};

const clearFile = (): void => {
  if (props.disabled) return;
  setFile(null);
};

const handleDragEnter = (): void => {
  if (props.disabled) return;
  dragDepth.value += 1;
  isDragging.value = true;
};

const handleDragLeave = (): void => {
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (dragDepth.value === 0) isDragging.value = false;
};

const handleDrop = (event: DragEvent): void => {
  if (props.disabled) return;
  event.preventDefault();
  dragDepth.value = 0;
  isDragging.value = false;
  setFile(event.dataTransfer?.files[0] ?? null);
};

watch(() => props.modelValue, (file) => {
  if (file === null && input.value) input.value.value = '';
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      :class="dropzoneClass"
      role="button"
      :aria-disabled="props.disabled"
      :aria-label="modelValue ? copy.replaceLabel : copy.chooseLabel"
      tabindex="0"
      @click="chooseFile"
      @keydown.enter.prevent="chooseFile"
      @keydown.space.prevent="chooseFile"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent
      @dragleave.prevent="handleDragLeave"
      @drop="handleDrop"
    >
      <input ref="input" :id="inputId" class="sr-only" type="file" :accept="copy.accept" :disabled="props.disabled" :aria-invalid="props.invalid" tabindex="-1" @click.stop @change="selectFile" />
      <div v-if="!modelValue" class="flex flex-col items-center gap-2 text-center">
        <Upload class="size-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <p class="font-medium">{{ copy.emptyTitle }}</p>
          <p class="text-sm text-muted-foreground">o haz clic para seleccionarlo</p>
        </div>
      </div>
      <div v-else class="flex flex-col items-center gap-1 text-center">
        <Upload class="size-6 text-muted-foreground" aria-hidden="true" />
        <p class="font-medium">{{ copy.selectedTitle }}</p>
        <p class="text-sm text-muted-foreground">{{ copy.selectedDescription }}</p>
      </div>
    </div>
    <Attachment v-if="modelValue" class="w-full" :state="props.invalid ? 'error' : props.state">
      <AttachmentMedia><ImageIcon v-if="props.kind === 'png'" aria-hidden="true" /><FileText v-else aria-hidden="true" /></AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{{ modelValue.name }}</AttachmentTitle>
        <AttachmentDescription>{{ fileDescription }}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction type="button" :aria-label="copy.removeLabel" :disabled="props.disabled" @click.stop="clearFile"><X aria-hidden="true" /></AttachmentAction>
      </AttachmentActions>
    </Attachment>
  </div>
  <p v-if="isDragging" class="sr-only" aria-live="polite">{{ copy.dropAnnouncement }}</p>
</template>
