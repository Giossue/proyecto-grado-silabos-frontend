<script setup lang="ts">
import { Check, Trash2 } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { deleteScreenHelp, saveScreenHelp, type ScreenHelp } from '@/api/screen-help';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HelpScreen } from '@/lib/helpScreens';

const props = defineProps<{ screen: HelpScreen; help: ScreenHelp | null }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const confirmRemoval = ref(false);
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
        confirmRemoval.value = false;
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
    <FormSheet v-model:open="open" trigger-label="Editar ayuda" :title="`Ayuda de ${screen.label}`" :show-trigger="false" hide-close>
        <template v-if="help" #header-actions>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button type="button" variant="ghost" size="icon-sm" class="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar ayuda" :disabled="processing" @click="confirmRemoval = true"><Trash2 aria-hidden="true" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar ayuda</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </template>
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field><FieldLabel for="screen-help-role">Rol que la verá</FieldLabel><Input id="screen-help-role" :model-value="screen.roleLabel" disabled /></Field>
            <Field :data-invalid="Boolean(errors.title)"><FieldLabel for="screen-help-title" required>Título</FieldLabel><Input id="screen-help-title" v-model="form.title" required /><FieldError :errors="errors.title" /></Field>
            <Field :data-invalid="Boolean(errors.content)"><FieldLabel for="screen-help-content" required>Texto</FieldLabel><Textarea id="screen-help-content" v-model="form.content" rows="8" required /><FieldError :errors="errors.content" /></Field>
            <Field orientation="horizontal"><Switch id="screen-help-active" v-model="form.active" aria-describedby="screen-help-active-state" /><div class="flex flex-col"><FieldLabel for="screen-help-active">Mostrar ayuda en esta pantalla</FieldLabel><FieldDescription id="screen-help-active-state">{{ form.active ? 'La ayuda se ve en la pantalla.' : 'La ayuda está oculta.' }}</FieldDescription></div></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar ayuda" />
        </FieldGroup></form></template>
    </FormSheet>
    <Dialog v-model:open="confirmRemoval">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Eliminar ayuda</DialogTitle>
                <DialogDescription>Se borrará el texto de ayuda de «{{ screen.label }}» ({{ screen.roleLabel }}). La pantalla dejará de mostrar el botón de ayuda.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button type="button" variant="outline" @click="confirmRemoval = false">Cancelar</Button>
                <Button type="button" variant="destructive" :disabled="processing" @click="remove"><Trash2 data-icon="inline-start" aria-hidden="true" />Eliminar ayuda</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
