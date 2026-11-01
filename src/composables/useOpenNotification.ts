import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { openNotification, type Notification } from '@/api/notifications';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

export function useOpenNotification() {
    const router = useRouter();
    const openingId = ref<string | null>(null);

    const open = async (notification: Notification): Promise<boolean> => {
        if (openingId.value !== null) return false;
        openingId.value = notification.id;
        try {
            const result = await openNotification(notification.id);
            notification.leido_en ??= new Date().toISOString();
            if (result.role_changed) await sessionState.load(true);
            if (!result.path) {
                toast.info(result.message ?? 'Este aviso no tiene una pantalla asociada');
                return false;
            }
            await router.push(result.path);
            return true;
        } catch {
            toast.error('No se pudo abrir la notificación');
            return false;
        } finally {
            openingId.value = null;
        }
    };

    return { open, openingId };
}
