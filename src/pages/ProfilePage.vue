<script setup lang="ts">
import { Save } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { resendEmailVerification, updateProfile } from '@/api/session';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
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
        toast.success('Perfil actualizado.');
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(
                Object.entries(reason.errors).map(([key, values]) => [key, values[0] ?? reason.message]),
            );
            if (Object.keys(errors.value).length === 0) errors.value.request = reason.message;
        } else {
            errors.value.request = 'No se pudo actualizar el perfil.';
        }
    } finally {
        processing.value = false;
    }
};

const resendVerification = async (): Promise<void> => {
    resending.value = true;
    errors.value = {};
    try {
        const response = await resendEmailVerification();
        toast.success(response.message);
    } catch (reason) {
        errors.value.request = reason instanceof ApiError ? reason.message : 'No se pudo reenviar la verificación.';
    } finally {
        resending.value = false;
    }
};
</script>

<template>
    <SettingsLayout>
        <div class="flex flex-col gap-6">
            <Heading
                variant="small"
                title="Perfil"
                :description="user?.can_edit_identity ? 'Actualice su nombre y correo electrónico' : 'Consulte los datos de su cuenta'"
            />

            <InputError :message="errors.request" />

            <form v-if="user?.can_edit_identity" class="flex flex-col gap-6" @submit.prevent="submit">
                <div class="grid gap-2">
                    <Label for="name" required>Nombre completo</Label>
                    <Input
                        id="name"
                        v-model="name"
                        class="mt-1 block w-full"
                        name="nombre"
                        required
                        autocomplete="name"
                        placeholder="Ej. MARÍA JOSÉ PÉREZ LÓPEZ"
                    />
                    <p class="text-sm text-muted-foreground">
                        Primero los nombres y luego los apellidos. Se guarda en mayúsculas, con tildes.
                    </p>
                    <InputError class="mt-2" :message="errors.nombre" />
                </div>

                <div class="grid gap-2">
                    <Label for="email" required>Correo electrónico</Label>
                    <Input
                        id="email"
                        v-model="email"
                        type="email"
                        class="mt-1 block w-full"
                        name="correo_electronico"
                        required
                        autocomplete="username"
                        placeholder="Ej. maria.perez@ueb.edu.ec"
                    />
                    <InputError class="mt-2" :message="errors.correo_electronico" />
                </div>

                <div v-if="!user.email_verified">
                    <p class="-mt-4 text-sm text-muted-foreground">
                        Su correo electrónico no está verificado.
                        <TextLink as="button" :tabindex="0" :disabled="resending" @click="resendVerification">
                            Reenviar el correo de verificación.
                        </TextLink>
                    </p>
                </div>

                <div class="flex items-center gap-4">
                    <Button :disabled="processing" data-test="update-profile-button">
                        <Spinner v-if="processing" data-icon="inline-start" />
                        <Save v-else data-icon="inline-start" aria-hidden="true" />
                        Guardar
                    </Button>
                </div>
            </form>

            <div v-else class="flex flex-col gap-6">
                <div class="grid gap-2">
                    <Label for="readonly-name">Nombre completo</Label>
                    <Input id="readonly-name" :model-value="user?.name" placeholder="Ej. MARÍA JOSÉ PÉREZ LÓPEZ" disabled aria-describedby="identity-help" />
                </div>
                <div class="grid gap-2">
                    <Label for="readonly-email">Correo electrónico</Label>
                    <Input id="readonly-email" type="email" :model-value="user?.email" placeholder="Ej. maria.perez@ueb.edu.ec" disabled aria-describedby="identity-help" />
                </div>
                <p id="identity-help" class="text-sm text-muted-foreground">
                    Si necesita corregir su nombre o correo, solicite el cambio a Administración.
                </p>
            </div>
        </div>
    </SettingsLayout>
</template>
