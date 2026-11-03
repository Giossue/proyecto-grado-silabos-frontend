<script setup lang="ts">
import { LogOut, Monitor } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { closeOtherDeviceSessions, getDeviceSessions, type DeviceSession } from '@/api/session';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { afterDialogExit } from '@/lib/dialogExit';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { toast } from '@/lib/toast';

// Solo «Cerrar otras sesiones»: también saca a los dispositivos con «Mantener la sesión iniciada».
const sessions = ref<DeviceSession[] | null>(null);
const loadError = ref<string | null>(null);
const others = computed(() => (sessions.value ?? []).filter((session) => !session.current).length);
const open = ref(false);
const password = ref('');
const passwordError = ref<string | null>(null);
const error = ref<string | null>(null);
const processing = ref(false);

const load = async (): Promise<void> => {
    loadError.value = null;
    try {
        sessions.value = (await getDeviceSessions()).sessions;
    } catch (reason) {
        loadError.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar sus sesiones';
    }
};
onMounted(load);
watch(open, (value) => { if (value) { password.value = ''; passwordError.value = null; error.value = null; } });

const closeOthers = async (): Promise<void> => {
    if (!password.value || processing.value) return;
    processing.value = true;
    passwordError.value = null;
    error.value = null;
    try {
        const result = await closeOtherDeviceSessions(password.value);
        open.value = false;
        toast.success(result.message);
        await afterDialogExit();
        await load();
    } catch (reason) {
        if (reason instanceof ApiError && reason.errors.current_password) passwordError.value = reason.errors.current_password[0] ?? null;
        else error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cerrar las otras sesiones';
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <div data-tour="security-sessions" class="flex flex-col gap-4">
        <Heading variant="small" title="Sesiones abiertas" description="Dispositivos donde su cuenta está abierta. Si no reconoce alguno, cierre las otras sesiones y cambie su contraseña" />
        <FeedbackAlert v-if="loadError" :message="loadError" />
        <div v-else-if="sessions === null" class="flex flex-col gap-2"><Skeleton class="h-12 w-full" /><Skeleton class="h-12 w-full" /></div>
        <ul v-else class="flex flex-col divide-y rounded-md border" aria-label="Sesiones abiertas">
            <li v-for="session in sessions" :key="session.id" class="flex items-center gap-3 px-3 py-2.5">
                <Monitor class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div class="flex min-w-0 flex-1 flex-col">
                    <span class="flex flex-wrap items-center gap-2 text-sm font-medium">{{ session.device }}<Badge v-if="session.current" variant="secondary">Este dispositivo</Badge></span>
                    <span class="text-xs text-muted-foreground">Última actividad: {{ formatDateDisplay(session.last_activity) }}</span>
                </div>
            </li>
        </ul>
        <div v-if="others > 0">
            <Button type="button" variant="outline" @click="open = true"><LogOut data-icon="inline-start" aria-hidden="true" />Cerrar otras sesiones</Button>
        </div>

        <Dialog v-model:open="open">
            <DialogContent>
                <form class="flex flex-col gap-4" @submit.prevent="closeOthers">
                    <DialogHeader>
                        <DialogTitle>Cerrar otras sesiones</DialogTitle>
                        <DialogDescription>Se cerrará su cuenta en los demás dispositivos, también en los que marcaron «Mantener la sesión iniciada». Este dispositivo sigue abierto</DialogDescription>
                    </DialogHeader>
                    <FeedbackAlert v-if="error" :message="error" />
                    <div class="grid gap-2">
                        <Label for="other-sessions-password" required>Contraseña actual</Label>
                        <PasswordInput id="other-sessions-password" v-model="password" autocomplete="current-password" aria-required="true" />
                        <InputError :message="passwordError ?? undefined" />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
                        <Button type="submit" :disabled="!password || processing"><Spinner v-if="processing" data-icon="inline-start" /><LogOut v-else data-icon="inline-start" aria-hidden="true" />Cerrar otras sesiones</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>
