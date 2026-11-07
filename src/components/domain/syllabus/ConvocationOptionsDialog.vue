<script setup lang="ts">
import { withoutFinalPeriod } from '@/lib/utils';
import { CalendarClock, CalendarPlus, Lock, MoreHorizontal, Pause, Play, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import type { DialogAction } from '@/components/domain/DialogActions.vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

// Lo habitual a la vista; lo delicado (finalizar, eliminar) va en el menú «Más opciones» de la esquina.
const regular = computed(() => actions.value.filter((action) => !action.destructive));
const sensitive = computed(() => actions.value.filter((action) => action.destructive));

const run = (key: string): void => {
    open.value = false;
    emit('action', key);
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent :aria-describedby="undefined" class="sm:max-w-lg">
            <DialogHeader class="flex-row items-center justify-between gap-2 pr-0">
                <DialogTitle>Convocatoria {{ row.code }}</DialogTitle>
                <MenuTooltip v-if="sensitive.length" label="Más opciones">
                    <DropdownMenu>
                        <DropdownMenuTrigger as-child>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Más opciones"><MoreHorizontal aria-hidden="true" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem v-for="action in sensitive" :key="action.key" variant="destructive" :disabled="action.disabled" @select="run(action.key)">
                                <component :is="action.icon" aria-hidden="true" />
                                <span class="flex flex-col">{{ action.label }}<span v-if="action.disabled && action.disabledReason" class="text-xs text-muted-foreground">{{ withoutFinalPeriod(action.disabledReason) }}</span></span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </MenuTooltip>
            </DialogHeader>
            <ul class="grid grid-cols-2 items-start gap-2" aria-label="Opciones de la convocatoria">
                <li v-for="action in regular" :key="action.key" class="flex flex-col gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        class="w-full"
                        :disabled="action.disabled"
                        :aria-describedby="action.disabled && action.disabledReason ? `option-reason-${action.key}` : undefined"
                        @click="run(action.key)"
                    >
                        <component :is="action.icon" data-icon="inline-start" aria-hidden="true" />
                        {{ action.label }}
                    </Button>
                    <p v-if="action.disabled && action.disabledReason" :id="`option-reason-${action.key}`" class="text-sm text-muted-foreground">{{ withoutFinalPeriod(action.disabledReason) }}</p>
                </li>
            </ul>
            <DialogFooter>
                <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
