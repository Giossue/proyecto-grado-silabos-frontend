<script setup lang="ts">
import { LogOut, Save } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { logout, updatePassword } from '@/api/session';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { sessionState } from '@/state/session';

const router = useRouter();
const password = ref('');
const passwordConfirmation = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const required = computed(() => sessionState.current.value?.user.must_change_password === true);

const save = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
    try {
        sessionState.replace(await updatePassword(password.value, passwordConfirmation.value));
        password.value = '';
        passwordConfirmation.value = '';
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
    } finally {
        processing.value = false;
    }
};

const closeSession = async (): Promise<void> => {
    await logout();
    sessionState.clear();
    await router.replace('/ingresar');
};
</script>

<template>
    <Dialog :open="required">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Cambie su contraseña temporal</DialogTitle>
                <DialogDescription>
                    La contraseña con la que entró la generó quien creó su cuenta.
                    Defina una propia para continuar.
                </DialogDescription>
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="save">
                <div class="grid gap-2">
                    <Label for="temporary-new-password" required>Contraseña nueva</Label>
                    <PasswordInput id="temporary-new-password" v-model="password" autocomplete="new-password" required />
                    <InputError :message="errors.password?.[0]" />
                </div>
                <div class="grid gap-2">
                    <Label for="temporary-password-confirmation" required>Confirmar contraseña nueva</Label>
                    <PasswordInput id="temporary-password-confirmation" v-model="passwordConfirmation" autocomplete="new-password" required />
                    <InputError :message="errors.password_confirmation?.[0]" />
                </div>
                <div class="flex items-center justify-between gap-4 pt-2">
                    <button type="button" class="inline-flex cursor-pointer items-center text-sm text-muted-foreground hover:text-foreground" @click="closeSession">
                        <LogOut class="mr-2 size-4" />
                        Cerrar sesión
                    </button>
                    <Button type="submit" :disabled="processing">
                        <Spinner v-if="processing" data-icon="inline-start" />
                        <Save v-else data-icon="inline-start" aria-hidden="true" />
                        Guardar y continuar
                    </Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>
</template>
