<script setup lang="ts">
import { Save } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createField, updateField } from '@/api/template-structure';
import type { TemplateField } from '@/api/template';
import TemplateFieldForm from '@/components/domain/configuration/TemplateFieldForm.vue';
import { apiMessage, fieldFormError, fieldInput, formFromField, newFieldForm, uniqueKey, type FieldForm } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

/** «Agregar campo» (sin `field`) y «Propiedades del campo» (con `field`). */
const props = defineProps<{ templateId: string; sectionId: string; field?: TemplateField | null; usedKeys: string[] }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { required: true });

const form = ref<FieldForm>(newFieldForm());
const error = ref<string | null>(null);
const saving = ref(false);

watch(open, (value) => {
    if (!value) return;
    error.value = null;
    form.value = props.field ? formFromField(props.field) : newFieldForm();
});

const save = async (): Promise<void> => {
    error.value = fieldFormError(form.value);
    if (error.value || saving.value) return;
    saving.value = true;
    try {
        if (props.field) {
            await updateField(props.templateId, props.field.id, fieldInput(form.value));
        } else {
            await createField(props.templateId, props.sectionId, { ...fieldInput(form.value), type: form.value.type, key: uniqueKey(form.value.label, 'campo', props.usedKeys) });
        }
        toast.success(props.field ? 'Campo guardado.' : 'Campo agregado.');
        open.value = false;
        emit('saved');
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar el campo.');
    } finally {
        saving.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-dvh overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ field ? 'Propiedades del campo' : 'Agregar campo' }}</DialogTitle>
        <DialogDescription>{{ field ? 'Cambie el nombre y las opciones de este campo.' : 'Elija quién lo escribe y complete sus opciones.' }}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="save">
        <TemplateFieldForm v-model="form" id-prefix="template-field" :lock-type="Boolean(field)" />
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />
            {{ field ? 'Guardar campo' : 'Agregar campo' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
