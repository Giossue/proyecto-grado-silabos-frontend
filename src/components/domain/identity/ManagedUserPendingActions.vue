<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { MailCheck, Trash2 } from '@lucide/vue';
import { ref, watch } from 'vue';
import { deleteManagedUser, resendManagedUserInvitation } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ userId: string; userName: string; userEmail: string }>();
const emit = defineEmits<{ changed: [message: string] }>();
const resendOpen = defineModel<boolean>('resendOpen', { default: false }); const deleteOpen = defineModel<boolean>('deleteOpen', { default: false }); const processing = ref(false); const error = ref<string | null>(null);
watch([resendOpen, deleteOpen], ([resend, remove]) => { if (resend || remove) error.value = null; });
const resend = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = await resendManagedUserInvitation(props.userId); resendOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo reenviar la invitación.'; } finally { processing.value = false; } };
const remove = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = await deleteManagedUser(props.userId); deleteOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar la cuenta.'; } finally { processing.value = false; } };
</script>

<template>
    <Dialog v-model:open="resendOpen"><DialogContent><DialogHeader><DialogTitle>Reenviar invitación de activación</DialogTitle><DialogDescription>Se invalidará el enlace anterior y se enviará uno nuevo a {{ userEmail }} para que {{ userName }} defina su contraseña.</DialogDescription></DialogHeader><FeedbackAlert v-if="error" :message="error" /><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" :disabled="processing" @click="resend"><Spinner v-if="processing" /><MailCheck v-else />Reenviar invitación</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar cuenta pendiente</DialogTitle><DialogDescription>Se eliminará la cuenta de {{ userName }}. Esta acción no se puede deshacer.</DialogDescription></DialogHeader><FeedbackAlert v-if="error" :message="error" /><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="processing" @click="remove"><Spinner v-if="processing" /><Trash2 v-else />Eliminar cuenta</Button></DialogFooter></DialogContent></Dialog>
</template>
