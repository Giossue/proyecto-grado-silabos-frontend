<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createField, updateField } from '@/api/template-structure';
import type { TemplateField } from '@/api/template';
import TemplateFieldForm from '@/components/domain/configuration/TemplateFieldForm.vue';
import { apiMessage, fieldInput, formFromField, newFieldForm, uniqueKey, type FieldForm } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { TemplateVariable } from '@/lib/templateDocument';
import { toast } from '@/lib/toast';


const props = defineProps<{ templateId: string; sectionId: string; field?: TemplateField | null; usedKeys: string[]; variables?: TemplateVariable[] }>();
const emit = defineEmits<{ saved: [createdId?: string] }>();
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
    error.value = null;
    if (error.value || saving.value) return;
    saving.value = true;
    let created: Awaited<ReturnType<typeof createField>> | undefined;
    try {
        if (props.field) {
            await updateField(props.templateId, props.field.id, fieldInput(form.value));
        } else {
            created = await createField(props.templateId, props.sectionId, { ...fieldInput(form.value), key: uniqueKey(form.value.label, 'campo', props.usedKeys) });
        }
        toast.success(props.field ? 'Campo guardado.' : 'Campo agregado.');
        open.value = false;
        emit('saved', created?.field?.id);
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar el campo.');
    } finally {
        saving.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-dvh flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <ScrollArea class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-2rem)]">
            <div class="grid gap-4 p-6">
              <DialogHeader>
                <DialogTitle>{{ field ? 'Propiedades del campo' : 'Agregar campo' }}</DialogTitle>
                <DialogDescription>{{ field ? 'Cambie el nombre, quién lo llena y su contenido.' : 'Elija quién lo llena y escriba su contenido inicial.' }}</DialogDescription>
              </DialogHeader>
              <form class="flex flex-col gap-4" @submit.prevent="save">
                <TemplateFieldForm v-model="form" id-prefix="template-field" :variables="variables" />
                <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
                <DialogFooter>
                  <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
                  <Button type="submit" :disabled="saving">
                    <Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />
                    {{ field ? 'Guardar campo' : 'Agregar campo' }}
                  </Button>
                </DialogFooter>
              </form>
            </div>
        </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
