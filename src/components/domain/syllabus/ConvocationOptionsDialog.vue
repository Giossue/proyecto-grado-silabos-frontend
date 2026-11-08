<script setup lang="ts">
import { withoutFinalPeriod } from '@/lib/utils';
import { CalendarClock, CalendarPlus, Lock, Pause, Play, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import type { DialogAction } from '@/components/domain/DialogActions.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ConvocationRow } from '@/pages/AdminProcessesPage.vue';

const props = defineProps<{ row: ConvocationRow }>();
const emit = defineEmits<{ action: [key: string] }>();
const open = defineModel<boolean>('open', { default: false });

const actions = computed<DialogAction[]>(() => {
    const process = props.row.process;
    if (!process) {
        const reason = props.row.lock_reason ?? undefined;
        const locked = Boolean(reason);

        return [
            { key: 'abrir', label: 'Abrir convocatoria', icon: CalendarPlus, disabled: locked, disabledReason: reason },
            { key: 'eliminar-periodo', label: 'Eliminar periodo', icon: Trash2, destructive: true, disabled: locked, disabledReason: reason },
        ];
    }
    const active = process.state === 'abierto' || process.state === 'pausado';

    return [
        ...(process.state === 'abierto' ? [{ key: 'pausar', label: 'Pausar', icon: Pause }] : []),
        ...(process.state === 'pausado' ? [{ key: 'reanudar', label: 'Reanudar', icon: Play }] : []),
        // También finalizada: la prórroga la vuelve a abrir.
        {
            key: 'prorrogar',
            label: 'Prorrogar plazo',
            icon: CalendarClock,
            disabled: Boolean(process.extension_block_reason),
            disabledReason: process.extension_block_reason ?? undefined,
        },
        ...(active ? [{ key: 'cerrar', label: 'Finalizar', icon: Lock, destructive: true }] : []),
        ...(active ? [{ key: 'eliminar', label: 'Eliminar', icon: Trash2, destructive: true }] : []),
    ];
});

// Qué hace cada opción, en una línea, para elegir sin abrir la confirmación.
const effects: Record<string, string> = {
    abrir: 'Fije las fechas de elaboración y entrega del período',
    'eliminar-periodo': 'Borra el período y sus fechas',
    pausar: 'Nadie edita, envía ni revisa hasta que la reanude',
    reanudar: 'Se vuelve a editar, enviar y revisar',
    prorrogar: 'Mueve la fecha de entrega hacia adelante',
    cerrar: 'Los sílabos quedan solo para consulta',
    eliminar: 'Borra la convocatoria y sus sílabos',
};
// Lo habitual arriba; lo delicado (finalizar, eliminar) abajo, separado y en rojo.
const regular = computed(() => actions.value.filter((action) => !action.destructive));
const sensitive = computed(() => actions.value.filter((action) => action.destructive));
const groups = computed(() => [regular.value, sensitive.value].filter((group) => group.length > 0));

const run = (key: string): void => {
    open.value = false;
    emit('action', key);
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Convocatoria {{ row.code }}</DialogTitle>
                <DialogDescription>Elija qué hacer con la convocatoria</DialogDescription>
            </DialogHeader>
            <div class="flex flex-col gap-2">
                <template v-for="(group, groupIndex) in groups" :key="groupIndex">
                    <Separator v-if="groupIndex > 0" />
                    <ul class="flex flex-col gap-1" :aria-label="groupIndex === 0 ? 'Opciones de la convocatoria' : 'Opciones delicadas'">
                        <li v-for="action in group" :key="action.key">
                            <Button
                                type="button"
                                variant="ghost"
                                :class="cn('h-auto w-full items-start justify-start gap-3 whitespace-normal px-3 py-2.5 text-left font-normal', action.destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive')"
                                :disabled="action.disabled"
                                :aria-describedby="`option-effect-${action.key}`"
                                @click="run(action.key)"
                            >
                                <component :is="action.icon" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                <span class="flex min-w-0 flex-col gap-0.5">
                                    <span class="font-medium">{{ action.label }}</span>
                                    <span :id="`option-effect-${action.key}`" :class="cn('text-sm', action.destructive ? 'text-destructive/80' : 'text-muted-foreground')">{{ action.disabled && action.disabledReason ? withoutFinalPeriod(action.disabledReason) : effects[action.key] }}</span>
                                </span>
                            </Button>
                        </li>
                    </ul>
                </template>
            </div>
            <DialogFooter>
                <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
