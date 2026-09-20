<script setup lang="ts">
import { Save } from "@lucide/vue";
import { ref } from "vue";
import { ApiError } from "@/api/client";
import { uploadFacultyLogo } from "@/api/career-academics";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

defineProps<{
  facultyName: string;
  currentUrl: string;
  configured: boolean;
  size: { width: number; height: number };
}>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>("open", { default: false });
const file = ref<File | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);
const choose = (event: Event) => { file.value = (event.target as HTMLInputElement).files?.[0] ?? null; };
const submit = async () => {
  if (!file.value) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await uploadFacultyLogo(file.value);
    emit("saved", result.message);
    open.value = false;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo guardar el logo.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Logo de la facultad</DialogTitle>
        <DialogDescription>Configure el encabezado de los sílabos de {{ facultyName }}. Este paso es obligatorio antes de abrir la convocatoria.</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <div class="rounded-md border bg-background p-4"><img :src="currentUrl" :alt="configured ? `Logo actual de ${facultyName}` : 'Ejemplo del logo de facultad'" class="mx-auto max-h-28 max-w-full object-contain" /></div>
          <Field :data-invalid="Boolean(error)">
            <FieldLabel for="coordinator-faculty-logo" required>Logo (PNG sin fondo)</FieldLabel>
            <Input id="coordinator-faculty-logo" type="file" accept="image/png" required :disabled="saving" :aria-invalid="Boolean(error)" @change="choose" />
            <FieldDescription>Se ajustará a {{ size.width }} × {{ size.height }} px conservando su proporción.</FieldDescription>
            <FieldError v-if="error" :errors="[error]" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving || !file"><Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar logo</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
