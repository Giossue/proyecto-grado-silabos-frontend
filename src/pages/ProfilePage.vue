<script setup lang="ts">
import { Save, UserRound } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { resendActivation, updateProfile } from '@/api/session';
import SettingsAccordionSection from '@/components/domain/SettingsAccordionSection.vue';
import { Accordion } from '@/components/ui/accordion';
import InputError from '@/components/InputError.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

const user = computed(() => sessionState.current.value?.user);
const name = ref('');
const email = ref('');
const processing = ref(false);
const resending = ref(false);
const errors = ref<Record<string, string>>({});

const unchanged = computed(
    () => name.value.trim() === (user.value?.name ?? '') && email.value.trim() === (user.value?.email ?? ''),
);

watch(user, (value) => {
    name.value = value?.name ?? '';
    email.value = value?.email ?? '';
}, { immediate: true });

const submit = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
    try {
        const session = await updateProfile(name.value, email.value);
        sessionState.replace(session);
        toast.success('Perfil actualizado');
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(
                Object.entries(reason.errors).map(([key, values]) => [key, values[0] ?? reason.message]),
            );
            if (Object.keys(errors.value).length === 0) errors.value.request = reason.message;
        } else {
            errors.value.request = 'No se pudo actualizar el perfil';
        }
    } finally {
        processing.value = false;
    }
};

const resendVerification = async (): Promise<void> => {
    resending.value = true;
    errors.value = {};
    try {
        const response = await resendActivation();
        toast.success(response.message);
    } catch (reason) {
        errors.value.request = reason instanceof ApiError ? reason.message : 'No se pudo reenviar el enlace de activación';
    } finally {
        resending.value = false;
    }
};
const openSection = ref<string | undefined>('cuenta');
</script>

<template>
    <SettingsLayout :loading="!user">
        <LoadingSkeleton v-if="!user" variant="settings" settings-section="profile" :readonly="sessionState.current.value?.active_role?.code !== 'administrador'" />
        <!-- Secciones en acordeón como en Sistema. -->
        <Accordion v-else v-model="openSection" type="single" collapsible :unmount-on-hide="false" class="-mt-2">
            <SettingsAccordionSection value="cuenta" title="Datos de la cuenta" :description="user.can_edit_identity ? 'Actualice su nombre y correo electrónico' : 'Consulte su nombre y correo'" :icon="UserRound">
            <InputError :message="errors.request" />

            <form v-if="user?.can_edit_identity" data-tour="profile-form" class="flex flex-col gap-6" @submit.prevent="submit">
                <div class="grid gap-2">
                    <Label for="name" required>Nombre completo</Label>
                    <Input
                        id="name"
                        v-model="name"
                        class="mt-1 block w-full"
                        name="nombre"
                        aria-required="true"
                        autocomplete="name"
                        placeholder="Ej. MARÍA JOSÉ PÉREZ LÓPEZ"
                        :aria-invalid="Boolean(errors.nombre)"
                        :aria-describedby="errors.nombre ? 'name-error' : undefined"
                    />
                    <InputError id="name-error" class="mt-2" :message="errors.nombre" />
                </div>

                <div class="grid gap-2">
                    <Label for="email" required>Correo electrónico</Label>
                    <Input
                        id="email"
                        v-model="email"
                        type="email"
                        class="mt-1 block w-full"
                        name="correo_electronico"
                        aria-required="true"
                        autocomplete="username"
                        placeholder="Ej. maria.perez@ueb.edu.ec"
                        :aria-invalid="Boolean(errors.correo_electronico)"
                        :aria-describedby="errors.correo_electronico ? 'email-error' : undefined"
                        :disabled="user.email_verified"
                    />
                    <p v-if="user.email_verified" class="text-sm text-muted-foreground">
                        La cuenta ya fue activada: su correo no se puede cambiar
                    </p>
                    <InputError id="email-error" class="mt-2" :message="errors.correo_electronico" />
                </div>

                <div v-if="!user.email_verified">
                    <p class="-mt-4 text-sm text-muted-foreground">
                        Su cuenta aún no está activada.
                        <TextLink as="button" :tabindex="0" :disabled="resending" @click="resendVerification">
                            Reenviar el enlace de activación
                        </TextLink>
                    </p>
                </div>

                <div class="flex items-center gap-4">
                    <Button :disabled="processing || unchanged" data-test="update-profile-button">
                        <Spinner v-if="processing" data-icon="inline-start" />
                        <Save v-else data-icon="inline-start" aria-hidden="true" />
                        Guardar
                    </Button>
                </div>
            </form>

            <div v-else data-tour="profile-readonly" class="flex flex-col gap-6">
                <div class="grid gap-2">
                    <Label for="readonly-name">Nombre completo</Label>
                    <Input id="readonly-name" :model-value="user?.name" placeholder="Ej. MARÍA JOSÉ PÉREZ LÓPEZ" disabled aria-describedby="identity-help" />
                </div>
                <div class="grid gap-2">
                    <Label for="readonly-email">Correo electrónico</Label>
                    <Input id="readonly-email" type="email" :model-value="user?.email" placeholder="Ej. maria.perez@ueb.edu.ec" disabled aria-describedby="identity-help" />
                </div>
                <p id="identity-help" class="text-sm text-muted-foreground">
                    Si necesita corregir su nombre o correo, solicite el cambio a Administración
                </p>
            </div>
            </SettingsAccordionSection>
        </Accordion>
    </SettingsLayout>
</template>
