<script setup lang="ts">
import { Lock } from '@lucide/vue';
import { computed } from 'vue';
import type { LockDetail } from '@/api/locks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { paths } from '@/lib/routes';
import { sessionState } from '@/state/session';

const props = defineProps<{ lock?: LockDetail | null; title?: string; message?: string; hideAction?: boolean }>();

const isAdministrator = computed(() => sessionState.current.value?.active_role?.code === 'administrador');
const href = computed(() => isAdministrator.value ? paths.admin.convocations : paths.coordination.panel);
const headline = computed(() => {
    if (props.title) return props.title;

    return props.lock?.period ? `Edición bloqueada · Convocatoria ${props.lock.period}` : 'Edición bloqueada';
});
const summary = computed(() => {
    if (props.message) return props.message;

    return isAdministrator.value
        ? 'Pause el proceso para editar.'
        : 'Pause la convocatoria de su carrera para editar.';
});
const deadline = computed(() => props.lock?.delivery_on ? formatDateDisplay(props.lock.delivery_on, { dateStyle: 'long' }) : null);
const reason = computed(() => {
    if (props.message || !props.lock) return null;
    const open = deadline.value ? `abierta, con entrega hasta el ${deadline.value}` : 'abierta';
    const consequence = 'Al corregir se pedirá confirmación: los sílabos en curso que no están aprobados se rehacen.';
    if (props.lock.scope === 'process') {
        return `Hay una convocatoria ${open}. Mientras siga abierta, la plantilla no se modifica. ${consequence}`;
    }
    const institutional = props.lock.institutional_pause
        ? 'Administración pausó la convocatoria institucional, pero la de su carrera sigue abierta. '
        : '';

    return `${institutional}La convocatoria de su carrera está ${open}. Pausarla permite corregir la malla y las fichas. ${consequence}`;
});
</script>

<template>
    <Alert class="w-fit max-w-full border-primary/20 bg-accent text-accent-foreground">
        <Lock class="text-primary" aria-hidden="true" />
        <AlertTitle>{{ headline }}</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-x-3 gap-y-1 text-accent-foreground/80">
            <span>{{ summary }}</span>
            <span class="flex flex-wrap items-center gap-2">
                <Popover v-if="reason">
                    <PopoverTrigger as-child>
                        <Button type="button" variant="link" size="sm" class="h-auto p-0">¿Por qué?</Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" class="w-80 text-sm">{{ reason }}</PopoverContent>
                </Popover>
                <Button v-if="!hideAction" as-child size="sm" variant="outline">
                    <RouterLink :to="href">Ir a Convocatorias</RouterLink>
                </Button>
            </span>
        </AlertDescription>
    </Alert>
</template>
