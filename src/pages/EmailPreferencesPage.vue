<script setup lang="ts">
import EmptyState from '@/components/domain/EmptyState.vue';
import { CalendarClock, Mail, Save } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { getEmailPreferences, updateEmailPreferences, type EmailNoticeOption } from '@/api/emailPreferences';
import SettingsAccordionSection from '@/components/domain/SettingsAccordionSection.vue';
import { Accordion } from '@/components/ui/accordion';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

const options = ref<EmailNoticeOption[] | null>(null);
const optionRows = computed(() => ({ docente: 6, coordinador: 2, bibliotecario: 4 } as Record<string, number>)[sessionState.current.value?.active_role?.code ?? ''] ?? 4);
const chosen = ref<Record<string, boolean>>({});
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const saving = ref(false);

const fill = (value: EmailNoticeOption[]): void => {
    options.value = value;
    chosen.value = Object.fromEntries(value.map((option) => [option.type, option.enabled]));
};

const load = async (): Promise<void> => {
    loadError.value = null;
    try {
        fill((await getEmailPreferences()).options);
    } catch (reason) {
        loadError.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar sus avisos por correo';
    }
};
onMounted(load);

// «Guardar» solo se activa si cambió algo.
// Resumen diario aparte de los avisos sueltos; un grupo vacío no se muestra.
const groups = computed(() => {
    const all = options.value ?? [];
    const summary = all.filter((option) => option.type.endsWith('.resumen_diario'));
    const notices = all.filter((option) => !option.type.endsWith('.resumen_diario'));

    return [
        { value: 'resumen', title: 'Resumen diario', description: 'Un correo de lunes a viernes, solo si tiene pendientes', icon: CalendarClock, options: summary },
        { value: 'avisos', title: 'Avisos por correo', description: 'Elija qué avisos recibe también en su correo', icon: Mail, options: notices },
    ].filter((group) => group.options.length > 0);
});
const openSection = ref<string | undefined>('resumen');
const dirty = computed(() => (options.value ?? []).some((option) => chosen.value[option.type] !== option.enabled));

const save = async (): Promise<void> => {
    saving.value = true;
    saveError.value = null;
    try {
        fill((await updateEmailPreferences({ ...chosen.value })).options);
        toast.success('Avisos por correo guardados');
    } catch (reason) {
        saveError.value = reason instanceof ApiError ? reason.message : 'No se pudieron guardar sus avisos por correo';
    } finally {
        saving.value = false;
    }
};
</script>

<template>
    <SettingsLayout :loading="!options && !loadError">
        <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
        <LoadingSkeleton v-else-if="!options" variant="settings" settings-section="email" :rows="optionRows" />
        <div v-else data-tour="email-notices" class="flex flex-col gap-6">
            <FeedbackAlert v-if="saveError" :message="saveError" />
            <EmptyState v-if="options.length === 0" title="Su rol no recibe avisos por correo" />
            <!-- Secciones en acordeón como en Sistema; en el sistema los avisos se ven siempre. -->
            <Accordion v-else v-model="openSection" type="single" collapsible :unmount-on-hide="false" class="-mt-2">
                <SettingsAccordionSection v-for="group in groups" :key="group.value" :value="group.value" :title="group.title" :description="group.description" :icon="group.icon">
                    <Field v-for="option in group.options" :key="option.type" orientation="horizontal">
                        <Switch :id="`email-notice-${option.type}`" v-model="chosen[option.type]" />
                        <FieldContent>
                            <FieldLabel :for="`email-notice-${option.type}`">{{ option.label }}</FieldLabel>
                            <FieldDescription>{{ option.description }}</FieldDescription>
                        </FieldContent>
                    </Field>
                </SettingsAccordionSection>
            </Accordion>
            <div v-if="options.length">
                <Button type="button" :disabled="saving || !dirty" @click="save">
                    <Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar
                </Button>
            </div>
        </div>
    </SettingsLayout>
</template>
