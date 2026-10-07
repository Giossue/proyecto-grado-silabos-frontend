<script setup lang="ts">
import { Ban, CircleCheck } from '@lucide/vue';
import { computed, ref } from 'vue';
import { updateManagedUser, type ManagedUser } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ user: ManagedUser }>();
const emit = defineEmits<{ changed: [message: string] }>();
const open = ref(false); const processing = ref(false); const error = ref<string | null>(null);
const coordinatedCareers = computed(() => props.user.roles
    .filter((role) => role.code === 'coordinador' && role.career_name)
    .map((role) => role.career_name as string));
const openDialog = (event: Event): void => { event.preventDefault(); error.value = null; open.value = true; };
const confirm = async (): Promise<void> => {
    processing.value = true; error.value = null;
    try {
        const result = await updateManagedUser(props.user.id, { nombre: props.user.nombre, correo_electronico: props.user.correo_electronico, active: !props.user.active });
        open.value = false; emit('changed', result.message);
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el acceso.'; }
    finally { processing.value = false; }
};
</script>

<template>
    <DropdownMenuItem :variant="user.active ? 'destructive' : 'default'" @select="openDialog"><Ban v-if="user.active" aria-hidden="true" /><CircleCheck v-else aria-hidden="true" />{{ user.active ? 'Deshabilitar acceso' : 'Habilitar acceso' }}</DropdownMenuItem>
    <Dialog v-model:open="open"><DialogContent><DialogHeader><DialogTitle>{{ user.active ? 'Deshabilitar acceso' : 'Habilitar acceso' }}</DialogTitle><DialogDescription>{{ user.active ? `${user.nombre} no podrá ingresar al sistema.` : `${user.nombre} podrá volver a ingresar al sistema.` }}<template v-if="user.active && coordinatedCareers.length > 0"> Dejará de coordinar {{ coordinatedCareers.join(', ') }}; nombre a otra persona desde Carreras.</template></DialogDescription></DialogHeader><FeedbackAlert v-if="error" :message="error" /><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" :variant="user.active ? 'destructive' : 'default'" :disabled="processing" @click="confirm"><Spinner v-if="processing" /><Ban v-else-if="user.active" /><CircleCheck v-else />{{ user.active ? 'Deshabilitar' : 'Habilitar' }}</Button></DialogFooter></DialogContent></Dialog>
</template>
