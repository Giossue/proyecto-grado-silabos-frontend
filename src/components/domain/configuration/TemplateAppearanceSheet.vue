<script setup lang="ts">
import { computed } from 'vue';
import TemplateController from '@/api/template-routes';
import Form from '@/components/ApiForm.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

const props = defineProps<{
    open: boolean;
    institutionLogoUrl: string;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
}>();

const sheetOpen = computed({
    get: () => props.open,
    set: (value: boolean) => emit('update:open', value),
});

const logoUpdated = (): void => {
    toast.success('Logo de la universidad actualizado');
};

const uploadLogo = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;

    if (input.files?.length) {
        input.form?.requestSubmit();
    }
};
</script>

<template>
    <FormSheet
        v-model:open="sheetOpen"
        trigger-label="Personalizar plantilla"
        title="Personalizar plantilla"
        description="El logo de la universidad aparece en la hoja y en la exportación."
        :show-trigger="false"
    >
        <template #default>
            <Form
                v-bind="TemplateController.storeLogo.form()"
                v-slot="{ errors, processing }"
                reset-on-success
                @success="logoUpdated"
            >
                <FieldSet class="gap-4 rounded-lg border p-4">
                    <FieldLegend>Logo de la universidad</FieldLegend>
                    <div
                        class="flex min-h-20 items-center justify-center rounded-md border bg-background p-4"
                    >
                        <img
                            :src="institutionLogoUrl"
                            alt="Logo actual de la Universidad Estatal de Bolívar"
                            class="h-auto max-h-10 max-w-full object-contain"
                        />
                    </div>
                    <Field
                        class="items-end"
                        :data-invalid="Boolean(errors.logo)"
                    >
                        <Input
                            id="template-institution-logo"
                            class="sr-only"
                            name="logo"
                            type="file"
                            accept="image/png"
                            required
                            :disabled="processing"
                            :aria-invalid="Boolean(errors.logo)"
                            aria-label="Seleccionar logo de la universidad"
                            @change="uploadLogo"
                        />
                        <Button
                            v-if="processing"
                            type="button"
                            variant="outline"
                            disabled
                        >
                            <Spinner data-icon="inline-start" />
                            Actualizando logo
                        </Button>
                        <Button v-else as-child variant="outline">
                            <label for="template-institution-logo">
                                Actualizar logo
                            </label>
                        </Button>
                        <FieldError
                            v-if="errors.logo"
                            :errors="[errors.logo]"
                        />
                    </Field>
                </FieldSet>
            </Form>
        </template>
    </FormSheet>
</template>
