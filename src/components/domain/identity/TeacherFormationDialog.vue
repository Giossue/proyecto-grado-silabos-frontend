<script setup lang="ts">
import { Save } from '@lucide/vue';
import { watch } from 'vue';
import TeacherFormationField from '@/components/domain/identity/TeacherFormationField.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTeacherFormation } from '@/composables/useTeacherFormation';
import { paths } from '@/lib/routes';

const props = withDefaults(defineProps<{ required?: boolean }>(), { required: false });
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
const { formation, saving, error, changed, reset, save } = useTeacherFormation();

watch(open, (value) => {
    if (value) reset();
}, { immediate: true });

const keepOpen = (event: Event): void => {
    if (props.required) event.preventDefault();
};

const submit = async (): Promise<void> => {
    if (!(await save())) return;
    open.value = false;
    emit('saved');
};
</script>

<template>
    <Dialog :open="open" @update:open="(value) => { if (value || !required) open = value; }">
        <DialogContent class="sm:max-w-2xl" @escape-key-down="keepOpen">
            <DialogHeader>
                <DialogTitle>{{ required ? 'Complete su formación y experiencia' : 'Formación y experiencia' }}</DialogTitle>
                <DialogDescription>{{ required ? 'La necesita para abrir sus sílabos' : 'Sus títulos y su experiencia como docente' }}</DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <TeacherFormationField id="dialog-formation" v-model="formation" :error="error" hide-hint />
                <DialogFooter>
                    <Button v-if="required" as-child type="button" variant="outline"><RouterLink :to="paths.teacher.syllabi" data-test="leave-formation-button">Volver a mis sílabos</RouterLink></Button>
                    <Button v-else type="button" variant="outline" :disabled="saving" data-test="cancel-formation-button" @click="open = false">Cancelar</Button>
                    <Button type="submit" :disabled="saving || !changed" data-test="save-formation-button">
                        <Spinner v-if="saving" data-icon="inline-start" />
                        <Save v-else data-icon="inline-start" aria-hidden="true" />
                        Guardar
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
