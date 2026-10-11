<script setup lang="ts">
import { Save } from '@lucide/vue';
import { watch } from 'vue';
import TeacherFormationField from '@/components/domain/identity/TeacherFormationField.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTeacherFormation } from '@/composables/useTeacherFormation';

const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
const { formation, saving, error, changed, reset, save } = useTeacherFormation();

watch(open, (value) => {
    if (value) reset();
});

const submit = async (): Promise<void> => {
    if (!(await save())) return;
    open.value = false;
    emit('saved');
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent :aria-describedby="undefined" class="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Formación y experiencia</DialogTitle>
            </DialogHeader>
            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <TeacherFormationField id="dialog-formation" v-model="formation" :error="error" hide-hint />
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="saving" data-test="cancel-formation-button" @click="open = false">Cancelar</Button>
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
