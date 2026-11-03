<script setup lang="ts">
import { Bell, Bot, Library, PlugZap, Save, Trash2, Undo2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { getSystemSettings, testSystemConnection, updateSystemSettings, type SettingsSection, type SystemSettings } from '@/api/systemSettings';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog.vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { Accordion } from '@/components/ui/accordion';
import SettingsAccordionSection from '@/components/domain/SettingsAccordionSection.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { useShownWhileClosing } from '@/lib/dialogExit';
import { toast } from '@/lib/toast';

const settings = ref<SystemSettings | null>(null);
const loadError = ref<string | null>(null);
const saving = ref<SettingsSection | null>(null);
const testing = ref<'ia' | 'biblioteca' | null>(null);
const errors = ref<Record<string, string>>({});
const requestError = ref<string | null>(null);
const confirmFor = ref<'ia' | 'biblioteca' | null>(null);
// Una sección abierta a la vez; empieza con Notificaciones.
const openSection = ref<string | undefined>('notificaciones');

const notifications = ref({ emails: true, digest_time: '08:00' });
const ai = ref({ driver: 'disabled', base_url: '', model: '', api_key: '', clear_api_key: false, connect_timeout: 2, timeout: 20 });
const library = ref({ driver: 'disabled', base_url: '' });

const fill = (value: SystemSettings): void => {
    settings.value = value;
    notifications.value = {
        emails: value.notifications.emails.value ?? true,
        digest_time: value.notifications.digest_time.value ?? '08:00',
    };
    ai.value = {
        driver: value.ai.driver.value ?? 'disabled',
        base_url: value.ai.base_url.value ?? '',
        model: value.ai.model.value ?? '',
        api_key: '',
        clear_api_key: false,
        connect_timeout: value.ai.connect_timeout.value ?? 2,
        timeout: value.ai.timeout.value ?? 20,
    };
    library.value = { driver: value.library.driver.value ?? 'disabled', base_url: value.library.base_url.value ?? '' };
    baseline.value = snapshot();
};

const load = async (): Promise<void> => {
    loadError.value = null;
    try {
        fill(await getSystemSettings());
    } catch (reason) {
        loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la configuración del sistema';
    }
};
onMounted(load);

const keyPlaceholder = computed(() => settings.value?.ai.api_key.configured ? 'Escriba una clave nueva solo para cambiarla' : 'Escriba la clave del proveedor');

// «Guardar» solo se activa si la sección cambió respecto de lo guardado.
const baseline = ref({ notifications: '', ai: '', library: '' });
const snapshot = () => ({
    notifications: JSON.stringify(notifications.value),
    ai: JSON.stringify({ ...ai.value, api_key: ai.value.api_key.trim() }),
    library: JSON.stringify(library.value),
});
const dirty = computed(() => {
    const now = snapshot();

    return { notifications: now.notifications !== baseline.value.notifications, ia: now.ai !== baseline.value.ai, biblioteca: now.library !== baseline.value.library };
});

const save = async (section: SettingsSection, currentPassword?: string): Promise<void> => {
    saving.value = section;
    errors.value = {};
    requestError.value = null;
    const body: Record<string, unknown> = section === 'notificaciones'
        ? { ...notifications.value }
        : section === 'biblioteca'
            ? { ...library.value, current_password: currentPassword }
            : {
                driver: ai.value.driver,
                base_url: ai.value.base_url,
                model: ai.value.model,
                connect_timeout: ai.value.connect_timeout,
                timeout: ai.value.timeout,
                current_password: currentPassword,
                ...(ai.value.clear_api_key ? { clear_api_key: true } : ai.value.api_key.trim() ? { api_key: ai.value.api_key.trim() } : {}),
            };
    try {
        fill(await updateSystemSettings(section, body));
        confirmFor.value = null;
        toast.success('Ajustes guardados');
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(Object.entries(reason.errors).map(([key, values]) => [key, values[0] ?? reason.message]));
            if (Object.keys(errors.value).length === 0) requestError.value = reason.message;
            if (!errors.value.current_password) confirmFor.value = null;
        } else {
            requestError.value = 'No se pudieron guardar los ajustes';
            confirmFor.value = null;
        }
    } finally {
        saving.value = null;
    }
};

// El aviso de contraseña se limpia al abrir, no al cerrar: así la confirmación se desvanece tal como estaba.
const shownConfirmFor = useShownWhileClosing(() => confirmFor.value);
const openConfirm = (section: 'ia' | 'biblioteca'): void => {
    errors.value = Object.fromEntries(Object.entries(errors.value).filter(([key]) => key !== 'current_password'));
    confirmFor.value = section;
};

const test = async (section: 'ia' | 'biblioteca'): Promise<void> => {
    testing.value = section;
    try {
        const result = await testSystemConnection(section);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo probar la conexión');
    } finally {
        testing.value = null;
    }
};
</script>

<template>
    <SettingsLayout :loading="!settings && !loadError">
        <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
        <LoadingSkeleton v-else-if="!settings" variant="settings" settings-section="system" />
        <template v-else>
            <FeedbackAlert v-if="requestError" :message="requestError" />

            <Accordion v-model="openSection" type="single" collapsible class="-mt-2">

            <SettingsAccordionSection value="notificaciones" data-tour="settings-notices" title="Notificaciones" description="Avisos por correo y resumen diario para Coordinación" :icon="Bell">
                <Field orientation="horizontal">
                    <Switch id="settings-emails" v-model="notifications.emails" />
                    <FieldLabel for="settings-emails" class="font-normal">Enviar avisos por correo</FieldLabel>
                </Field>
                <Field :data-invalid="Boolean(errors.digest_time)">
                    <FieldLabel for="settings-digest-time" required>Hora del resumen</FieldLabel>
                    <Input id="settings-digest-time" v-model="notifications.digest_time" type="time" class="w-32" aria-required="true" />
                    <FieldError v-if="errors.digest_time" :errors="[errors.digest_time]" />
                </Field>
                <div>
                    <Button type="button" :disabled="saving !== null || !dirty.notifications" @click="save('notificaciones')">
                        <Spinner v-if="saving === 'notificaciones'" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar
                    </Button>
                </div>
            </SettingsAccordionSection>


            <SettingsAccordionSection value="ia" data-tour="settings-ai" title="Asistente de IA" description="Proveedor que responde al asistente del sílabo y de la plantilla" :icon="Bot">
                <Field :data-invalid="Boolean(errors.driver)">
                    <FieldLabel for="settings-ai-driver" required>Proveedor</FieldLabel>
                    <Select v-model="ai.driver">
                        <SelectTrigger id="settings-ai-driver"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>
                            <SelectItem value="disabled">Desactivado</SelectItem>
                            <SelectItem value="deepseek">DeepSeek</SelectItem>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                        </SelectGroup></SelectContent>
                    </Select>
                </Field>
                <template v-if="ai.driver !== 'disabled'">
                    <Field :data-invalid="Boolean(errors.base_url)">
                        <FieldLabel for="settings-ai-url" required>Dirección del proveedor</FieldLabel>
                        <Input id="settings-ai-url" v-model="ai.base_url" placeholder="Ej. https://api.deepseek.com" autocomplete="off" aria-required="true" />
                        <FieldError v-if="errors.base_url" :errors="[errors.base_url]" />
                    </Field>
                    <Field :data-invalid="Boolean(errors.model)">
                        <FieldLabel for="settings-ai-model" required>Modelo</FieldLabel>
                        <Input id="settings-ai-model" v-model="ai.model" placeholder="Ej. deepseek-chat" autocomplete="off" aria-required="true" />
                        <FieldError v-if="errors.model" :errors="[errors.model]" />
                    </Field>
                    <Field :data-invalid="Boolean(errors.api_key)">
                        <FieldLabel for="settings-ai-key">Clave del proveedor</FieldLabel>
                        <!-- Sin «ver»: la clave guardada nunca se muestra. En su lugar, quitarla. -->
                        <div class="relative">
                            <Input id="settings-ai-key" v-model="ai.api_key" type="password" autocomplete="new-password" :disabled="ai.clear_api_key" :placeholder="keyPlaceholder" :class="settings.ai.api_key.configured ? 'pr-10' : ''" />
                            <IconTooltip v-if="settings.ai.api_key.configured" :label="ai.clear_api_key ? 'No quitar la clave' : 'Quitar la clave'">
                                <Button type="button" variant="ghost" size="icon" class="absolute inset-y-px right-px h-auto rounded-l-none rounded-r-md px-3 text-muted-foreground hover:bg-transparent hover:text-foreground" :aria-label="ai.clear_api_key ? 'No quitar la clave' : 'Quitar la clave'" :aria-pressed="ai.clear_api_key" @click="ai.clear_api_key = !ai.clear_api_key; ai.api_key = ''">
                                    <Undo2 v-if="ai.clear_api_key" class="size-4" aria-hidden="true" /><Trash2 v-else class="size-4" aria-hidden="true" />
                                </Button>
                            </IconTooltip>
                        </div>
                        <FieldDescription v-if="ai.clear_api_key">La clave se quitará al guardar</FieldDescription>
                        <FieldError v-if="errors.api_key" :errors="[errors.api_key]" />
                    </Field>
                    <div class="grid grid-cols-2 gap-4">
                        <Field :data-invalid="Boolean(errors.connect_timeout)">
                            <FieldLabel for="settings-ai-connect" required>Espera para conectar (s)</FieldLabel>
                            <Input id="settings-ai-connect" v-model.number="ai.connect_timeout" type="number" min="1" max="30" aria-required="true" />
                            <FieldError v-if="errors.connect_timeout" :errors="[errors.connect_timeout]" />
                        </Field>
                        <Field :data-invalid="Boolean(errors.timeout)">
                            <FieldLabel for="settings-ai-timeout" required>Espera de respuesta (s)</FieldLabel>
                            <Input id="settings-ai-timeout" v-model.number="ai.timeout" type="number" min="5" max="300" aria-required="true" />
                            <FieldError v-if="errors.timeout" :errors="[errors.timeout]" />
                        </Field>
                    </div>
                </template>
                <div class="flex flex-wrap gap-2">
                    <Button type="button" :disabled="saving !== null || !dirty.ia" @click="openConfirm('ia')">
                        <Spinner v-if="saving === 'ia'" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar
                    </Button>
                    <Button type="button" variant="outline" :disabled="testing !== null" @click="test('ia')">
                        <Spinner v-if="testing === 'ia'" data-icon="inline-start" /><PlugZap v-else data-icon="inline-start" aria-hidden="true" />Probar conexión
                    </Button>
                </div>
            </SettingsAccordionSection>


            <SettingsAccordionSection value="biblioteca" data-tour="settings-library" title="Biblioteca (Koha)" description="Catálogo donde los docentes buscan los libros de la bibliografía" :icon="Library">
                <Field>
                    <FieldLabel for="settings-library-driver" required>Búsqueda en el catálogo</FieldLabel>
                    <Select v-model="library.driver">
                        <SelectTrigger id="settings-library-driver"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>
                            <SelectItem value="disabled">Desactivada</SelectItem>
                            <SelectItem value="koha">Koha</SelectItem>
                        </SelectGroup></SelectContent>
                    </Select>
                </Field>
                <Field v-if="library.driver === 'koha'" :data-invalid="Boolean(errors.base_url && confirmFor !== 'ia')">
                    <FieldLabel for="settings-library-url" required>Dirección del catálogo</FieldLabel>
                    <Input id="settings-library-url" v-model="library.base_url" placeholder="Ej. http://biblioteca.ueb.edu.ec" autocomplete="off" aria-required="true" />
                </Field>
                <div class="flex flex-wrap gap-2">
                    <Button type="button" :disabled="saving !== null || !dirty.biblioteca" @click="openConfirm('biblioteca')">
                        <Spinner v-if="saving === 'biblioteca'" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Guardar
                    </Button>
                    <Button type="button" variant="outline" :disabled="testing !== null" @click="test('biblioteca')">
                        <Spinner v-if="testing === 'biblioteca'" data-icon="inline-start" /><PlugZap v-else data-icon="inline-start" aria-hidden="true" />Probar conexión
                    </Button>
                </div>
            </SettingsAccordionSection>
            </Accordion>
        </template>

        <PasswordConfirmDialog
            :open="confirmFor !== null"
            :title="shownConfirmFor === 'ia' ? 'Guardar el asistente de IA' : 'Guardar la biblioteca'"
            :description="errors.current_password ?? 'Por seguridad, confirme su contraseña actual para guardar'"
            confirm-label="Guardar"
            @update:open="(value: boolean) => { if (!value) confirmFor = null; }"
            @confirm="(password: string) => confirmFor && save(confirmFor, password)"
        />
    </SettingsLayout>
</template>
