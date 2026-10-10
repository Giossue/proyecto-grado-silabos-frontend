<script setup lang="ts">
import { Save } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createSection, renameSection } from '@/api/template-structure';
import type { TemplateSectionPayload } from '@/api/template';
import { apiMessage, uniqueKey } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

const props = defineProps<{ templateId: string; section?: TemplateSectionPayload | null; usedSectionKeys: string[] }>();
const emit = defineEmits<{ saved: [createdId?: string] }>();
const open = defineModel<boolean>('open', { required: true });

const title = ref('');
const orientation = ref<'portrait' | 'landscape'>('portrait');
const titleError = ref<string | null>(null);
const error = ref<string | null>(null);
const saving = ref(false);

watch(open, (value) => {
    if (!value) return;
    title.value = props.section?.title ?? '';
    orientation.value = props.section?.orientation ?? 'portrait';
    titleError.value = null;
    error.value = null;
});

const save = async (): Promise<void> => {
    if (saving.value) return;
    titleError.value = title.value.trim() === '' ? 'Escriba el nombre de la sección.' : null;
    if (titleError.value) return;
    saving.value = true;
    error.value = null;
    let createdId: string | undefined;
    try {
        if (props.section) {
            await renameSection(props.templateId, props.section.id, title.value.trim(), orientation.value);
        } else {
            const created = await createSection(props.templateId, { key: uniqueKey(title.value, 'seccion', props.usedSectionKeys), title: title.value.trim(), orientation: orientation.value });
            createdId = created.section_id;
        }
        toast.success(props.section ? 'Sección actualizada.' : 'Sección agregada.');
        open.value = false;
        emit('saved', createdId);
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar la sección.');
    } finally {
        saving.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ section ? 'Propiedades de la sección' : 'Nueva sección' }}</DialogTitle>
        <DialogDescription>{{ section ? 'Cambie el nombre y la orientación de esta sección.' : 'Escriba el nombre y elija la orientación. Después agregue sus campos.' }}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="save">
        <Field :data-invalid="Boolean(titleError)">
          <FieldLabel for="template-section-title" required>Nombre de la sección</FieldLabel>
          <Input id="template-section-title" v-model="title" maxlength="180" placeholder="Ej. Objetivos de la asignatura" :aria-invalid="Boolean(titleError)" :disabled="saving" />
          <FieldError v-if="titleError" :errors="[titleError]" />
        </Field>
        <Field>
          <FieldLabel for="section-orientation">Orientación de la hoja</FieldLabel>
          <Select v-model="orientation" :disabled="saving">
            <SelectTrigger id="section-orientation"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="portrait">Vertical</SelectItem><SelectItem value="landscape">Horizontal</SelectItem></SelectContent>
          </Select>
        </Field>
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />
            {{ section ? 'Guardar sección' : 'Crear sección' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
