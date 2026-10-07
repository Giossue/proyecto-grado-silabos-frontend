<script setup lang="ts">
import { Camera } from '@lucide/vue';
import TemplateController from '@/api/template-routes';
import Form from '@/components/ApiForm.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

/** Logo de la universidad en la hoja: al pasar el cursor aparece «Cambiar logo» (sube un PNG). */
defineProps<{ logoUrl: string; disabled?: boolean }>();

const updated = (): void => {
    toast.success('Logo de la universidad actualizado');
    window.dispatchEvent(new CustomEvent('silabos:template-changed'));
};
const failed = (errors: Record<string, string>): void => {
    toast.error(errors.logo ?? Object.values(errors)[0] ?? 'No se pudo actualizar el logo.');
};
const upload = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files?.length) input.form?.requestSubmit();
};
</script>

<template>
    <Form v-bind="TemplateController.storeLogo.form()" v-slot="{ processing }" reset-on-success class="group relative rounded-sm outline-offset-2 focus-within:outline focus-within:outline-1 focus-within:outline-primary/40 hover:outline hover:outline-1 hover:outline-primary/40" @success="updated" @error="failed">
        <img :src="logoUrl" alt="Logo de la universidad" :class="['max-h-12 object-contain', processing && 'opacity-50']">
        <Input id="template-institution-logo" class="sr-only" name="logo" type="file" accept="image/png" required :disabled="disabled || processing" aria-label="Seleccionar logo de la universidad" @change="upload" />
        <Button v-if="processing" type="button" variant="outline" size="sm" class="absolute -top-3 left-0 bg-background" disabled><Spinner data-icon="inline-start" />Subiendo logo</Button>
        <Button v-else as-child variant="outline" size="sm" :class="['absolute -top-3 left-0 bg-background opacity-0 focus-within:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100', disabled && 'pointer-events-none opacity-50']">
            <label for="template-institution-logo"><Camera data-icon="inline-start" aria-hidden="true" />Cambiar logo</label>
        </Button>
    </Form>
</template>
