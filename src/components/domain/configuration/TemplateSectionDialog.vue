<script setup lang="ts">
import { ArrowLeft, Save } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createField, createSection, renameSection } from '@/api/template-structure';
import type { TemplateSectionPayload } from '@/api/template';
import TemplateFieldForm from '@/components/domain/configuration/TemplateFieldForm.vue';
import { apiMessage, fieldFormError, fieldInput, newFieldForm, uniqueKey, type FieldForm } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

/** «Nueva sección» en dos pasos (nombre y primer campo opcional) o «Renombrar sección» (con `section`). */
const props = defineProps<{ templateId: string; section?: TemplateSectionPayload | null; usedSectionKeys: string[]; usedFieldKeys: string[] }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { required: true });

const step = ref<1 | 2>(1);
const title = ref('');
const titleError = ref<string | null>(null);
const withField = ref<FieldForm>(newFieldForm());
const error = ref<string | null>(null);
const saving = ref(false);

watch(open, (value) => {
    if (!value) return;
    step.value = 1;
    title.value = props.section?.title ?? '';
    titleError.value = null;
    error.value = null;
    withField.value = newFieldForm();
});

const next = (): void => {
    titleError.value = title.value.trim() === '' ? 'Escriba el nombre de la sección.' : null;
    if (titleError.value) return;
    if (props.section) void save(false);
    else step.value = 2;
};

const save = async (includeField: boolean): Promise<void> => {
    if (saving.value) return;
    error.value = includeField ? fieldFormError(withField.value) : null;
    if (error.value) return;
    saving.value = true;
    try {
        if (props.section) {
            await renameSection(props.templateId, props.section.id, title.value.trim());
        } else {
            const { section_id } = await createSection(props.templateId, { key: uniqueKey(title.value, 'seccion', props.usedSectionKeys), title: title.value.trim() });
            if (includeField) {
                await createField(props.templateId, section_id, { ...fieldInput(withField.value), type: withField.value.type, key: uniqueKey(withField.value.label, 'campo', props.usedFieldKeys) });
            }
        }
        toast.success(props.section ? 'Sección actualizada.' : 'Sección agregada.');
        open.value = false;
        emit('saved');
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar la sección.');
        // Si la sección ya se creó y falló el campo, la lista debe reflejarlo.
        emit('saved');
    } finally {
        saving.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-dvh overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ section ? 'Renombrar sección' : 'Nueva sección' }}</DialogTitle>
        <DialogDescription>{{ section ? 'Cambie el nombre de esta sección.' : step === 1 ? 'Paso 1 de 2: ¿cómo se llama la sección?' : 'Paso 2 de 2: agregue su primer campo o créela vacía.' }}</DialogDescription>
      </DialogHeader>

      <form v-if="step === 1" class="flex flex-col gap-4" @submit.prevent="next">
        <Field :data-invalid="Boolean(titleError)">
          <FieldLabel for="template-section-title" required>Nombre de la sección</FieldLabel>
          <Input id="template-section-title" v-model="title" maxlength="180" placeholder="Ej. Objetivos de la asignatura" :aria-invalid="Boolean(titleError)" :disabled="saving" />
          <FieldError v-if="titleError" :errors="[titleError]" />
        </Field>
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" data-icon="inline-start" /><Save v-else-if="section" data-icon="inline-start" aria-hidden="true" />
            {{ section ? 'Guardar nombre' : 'Continuar' }}
          </Button>
        </DialogFooter>
      </form>

      <form v-else class="flex flex-col gap-4" @submit.prevent="save(true)">
        <TemplateFieldForm v-model="withField" id-prefix="new-section-field" />
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter class="sm:justify-between">
          <Button type="button" variant="ghost" :disabled="saving" @click="step = 1"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" :disabled="saving" @click="save(false)">Crear sin campos</Button>
            <Button type="submit" :disabled="saving"><Spinner v-if="saving" data-icon="inline-start" />Crear sección con este campo</Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
