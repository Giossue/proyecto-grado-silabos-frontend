<script setup lang="ts">
import { LogOut } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { logout } from '@/api/session';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { clearIntendedRoute } from '@/lib/intended-route';
import { paths } from '@/lib/routes';
import { logoutConfirmOpen } from '@/state/shellDialogs';
import { sessionState } from '@/state/session';

const router = useRouter();
const leaving = ref(false);

const confirmLogout = async (): Promise<void> => {
    leaving.value = true;
    try {
        await logout();
        sessionState.clear();
        clearIntendedRoute();
        logoutConfirmOpen.value = false;
        await router.replace(paths.login);
    } finally {
        leaving.value = false;
    }
};
</script>

<template>
    <Dialog v-model:open="logoutConfirmOpen">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>¿Cerrar sesión?</DialogTitle>
                <DialogDescription>Tendrá que volver a ingresar para seguir usando el sistema</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button type="button" variant="outline" :disabled="leaving" @click="logoutConfirmOpen = false">Cancelar</Button>
                <Button type="button" variant="destructive" :disabled="leaving" @click="confirmLogout">
                    <Spinner v-if="leaving" data-icon="inline-start" />
                    <LogOut v-else data-icon="inline-start" aria-hidden="true" />
                    Cerrar sesión
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
