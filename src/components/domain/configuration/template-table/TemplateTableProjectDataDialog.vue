<script setup lang="ts">
import { FileText } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { declareProjectData } from '@/api/template';
import type { NewProjectData } from '@/api/template';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { TemplateVariable } from '@/lib/templateDocument';

/**
 * @ProyectoCarrera nuevo (I-155). El nombre se propone desde la sección: con él lo
 * busca la importación en los documentos de la carrera.
 */
const props = defineProps<{ templateId: string; sectionTitle: string }>();

const emit = defineEmits<{ create: [variable: TemplateVariable] }>();

const open = ref(false);
const pending = ref(false);
const error = ref('');
const form = ref<NewProjectData>({ label: '', type: 'lista', scope: 'asignatura' });

const show = (): void => {
    form.value = { label: props.sectionTitle, type: 'lista', scope: 'asignatura' };
    error.value = '';
    open.value = true;
};

const submit = async (): Promise<void> => {
    const label = form.value.label.trim();
    if (!label) {
        error.value = 'Escriba el nombre del dato.';

        return;
    }
    pending.value = true;
    error.value = '';
    try {
        const { variable } = await declareProjectData(props.templateId, { ...form.value, label });
        emit('create', variable);
        open.value = false;
    } catch (reason) {
        error.value = reason instanceof ApiError
            ? (Object.values(reason.errors ?? {})[0]?.[0] ?? reason.message)
            : 'No se pudo crear el dato. Intente de nuevo.';
    } finally {
        pending.value = false;
    }
};

defineExpose({ open: show });
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Nuevo dato del Proyecto de carrera</DialogTitle>
                <DialogDescription>
                    Lo llena Coordinación al importar los documentos de la carrera. El docente solo lo ve.
                </DialogDescription>
            </DialogHeader>

            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <FieldGroup>
                    <Field :data-invalid="Boolean(error) || undefined">
                        <FieldLabel for="project-data-label" required>Nombre del dato</FieldLabel>
                        <Input id="project-data-label" v-model="form.label" maxlength="180" :disabled="pending" :aria-invalid="Boolean(error)" />
                        <FieldDescription>Con este nombre lo buscará la importación en los documentos.</FieldDescription>
                        <FieldError :errors="[error]" />
                    </Field>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <Field>
                            <FieldLabel for="project-data-type">¿Cómo viene?</FieldLabel>
                            <Select v-model="form.type" :disabled="pending">
                                <SelectTrigger id="project-data-type" class="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectGroup>
                                    <SelectItem value="lista">Una lista</SelectItem>
                                    <SelectItem value="texto">Un texto</SelectItem>
                                </SelectGroup></SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel for="project-data-scope">¿De quién es?</FieldLabel>
                            <Select v-model="form.scope" :disabled="pending">
                                <SelectTrigger id="project-data-scope" class="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectGroup>
                                    <SelectItem value="asignatura">Cada asignatura tiene el suyo</SelectItem>
                                    <SelectItem value="carrera">Uno para toda la carrera</SelectItem>
                                </SelectGroup></SelectContent>
                            </Select>
                        </Field>
                    </div>
                </FieldGroup>
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="pending" @click="open = false">Cancelar</Button>
                    <Button type="submit" :disabled="pending">
                        <Spinner v-if="pending" data-icon="inline-start" aria-hidden="true" />
                        <FileText v-else data-icon="inline-start" aria-hidden="true" />
                        Insertar dato
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
