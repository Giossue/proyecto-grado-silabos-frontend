<script setup lang="ts">
import { MailCheck, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { deleteManagedUser, resendManagedUserAccess } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ userId: string; userName: string; userEmail: string }>();
const emit = defineEmits<{ changed: [message: string] }>();
const resendOpen = ref(false); const deleteOpen = ref(false); const processing = ref(false); const error = ref<string | null>(null);
const resend = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = await resendManagedUserAccess(props.userId); resendOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo reenviar el acceso.'; } finally { processing.value = false; } };
const remove = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = await deleteManagedUser(props.userId); deleteOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar la cuenta.'; } finally { processing.value = false; } };
</script>

<template>
    <DropdownMenuItem @select="resendOpen = true"><MailCheck aria-hidden="true" />Reenviar acceso</DropdownMenuItem>
    <DropdownMenuItem variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar cuenta pendiente</DropdownMenuItem>
    <Dialog v-model:open="resendOpen"><DialogContent><DialogHeader><DialogTitle>Reenviar acceso temporal</DialogTitle><DialogDescription>Se generará una nueva contraseña temporal para {{ userName }} y se enviará a {{ userEmail }}. La anterior dejará de funcionar.</DialogDescription></DialogHeader><p v-if="error" class="text-sm text-destructive">{{ error }}</p><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" :disabled="processing" @click="resend"><Spinner v-if="processing" /><MailCheck v-else />Reenviar acceso</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar cuenta pendiente</DialogTitle><DialogDescription>Se eliminará la cuenta de {{ userName }}. Esta acción no se puede deshacer.</DialogDescription></DialogHeader><p v-if="error" class="text-sm text-destructive">{{ error }}</p><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="processing" @click="remove"><Spinner v-if="processing" /><Trash2 v-else />Eliminar cuenta</Button></DialogFooter></DialogContent></Dialog>
</template>
