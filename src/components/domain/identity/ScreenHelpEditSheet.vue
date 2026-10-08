<script setup lang="ts">
import { Check } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { deleteScreenHelp, saveScreenHelp, type ScreenHelp } from '@/api/screen-help';
import BooleanChoice from '@/components/domain/BooleanChoice.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { HelpScreen } from '@/lib/helpScreens';

const props = defineProps<{ screen: HelpScreen; help: ScreenHelp | null }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ title: '', content: '', active: true });

watch(open, (value) => {
    if (!value) return;
    form.value = { title: props.help?.title ?? props.screen.label, content: props.help?.content ?? '', active: props.help?.active ?? true };
    errors.value = {};
}, { immediate: true });

const submit = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
    try {
        await saveScreenHelp({ screen: props.screen.key, ...form.value });
        open.value = false;
        emit('saved', 'Ayuda guardada.');
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
    } finally {
        processing.value = false;
    }
};

const remove = async (): Promise<void> => {
    processing.value = true;
    try {
        await deleteScreenHelp(props.screen.key);
        open.value = false;
        emit('saved', 'Ayuda eliminada.');
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <FormSheet v-model:open="open" trigger-label="Editar ayuda" :title="`Ayuda de ${screen.label}`" :description="screen.roleLabel" :show-trigger="false">
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.title)"><FieldLabel for="screen-help-title" required>Título</FieldLabel><Input id="screen-help-title" v-model="form.title" required /><FieldError :errors="errors.title" /></Field>
            <Field :data-invalid="Boolean(errors.content)"><FieldLabel for="screen-help-content" required>Texto</FieldLabel><Textarea id="screen-help-content" v-model="form.content" rows="8" required /><FieldError :errors="errors.content" /></Field>
            <Field><FieldLabel as="span">¿Mostrar la ayuda en la pantalla?</FieldLabel><BooleanChoice v-model="form.active" label="Mostrar la ayuda en la pantalla" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar ayuda" />
            <Button v-if="help" type="button" variant="outline" :disabled="processing" @click="remove">Eliminar ayuda</Button>
        </FieldGroup></form></template>
    </FormSheet>
</template>
