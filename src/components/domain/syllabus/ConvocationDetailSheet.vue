<script setup lang="ts">
import StatusBadge, { type StatusTone } from '@/components/domain/StatusBadge.vue';
import { CalendarClock, CalendarPlus, Pause, Play, Square, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import SheetActions, { type SheetAction } from '@/components/domain/SheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateDisplay } from '@/lib/dateDisplay';
import type { ConvocationRow } from '@/pages/AdminProcessesPage.vue';

const props = defineProps<{ row: ConvocationRow }>();
const emit = defineEmits<{ action: [key: string] }>();
const open = defineModel<boolean>('open', { default: false });

const formatDate = (value: string): string => formatDateDisplay(value, { dateStyle: 'medium' });
const state = computed(() => props.row.process
    ? ({ abierto: 'Abierto', pausado: 'Pausado', cerrado: 'Finalizado' })[props.row.process.state]
    : 'Sin iniciar');

const tone = computed<StatusTone>(() => props.row.process
    ? ({ abierto: 'success', pausado: 'warning', cerrado: 'info' } as const)[props.row.process.state]
    : 'neutral');
const actions = computed<SheetAction[]>(() => {
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
        ...(active ? [{ key: 'prorrogar', label: 'Prorrogar plazo', icon: CalendarClock }] : []),
        ...(active ? [{ key: 'cerrar', label: 'Finalizar', icon: Square, destructive: true }] : []),
        { key: 'eliminar', label: 'Eliminar', icon: Trash2, destructive: true },
    ];
});

const run = (key: string): void => {
    open.value = false;
    emit('action', key);
};
</script>

<template>
    <Sheet v-model:open="open">
        <SheetContent side="right" class="w-full sm:max-w-lg">
            <SheetHeader>
                <SheetTitle>Convocatoria {{ row.code }}</SheetTitle>
                <SheetDescription class="sr-only">Fechas y estado del período</SheetDescription>
            </SheetHeader>

            <div class="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-1 pb-28">
                <dl class="grid gap-3 text-sm">
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Estado</dt>
                        <dd><StatusBadge :label="state" :tone="tone" /></dd>
                    </div>
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Clases</dt>
                        <dd>{{ formatDate(row.starts_on) }} → {{ formatDate(row.ends_on) }}</dd>
                    </div>
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Elaboración de sílabos</dt>
                        <dd v-if="row.process">{{ formatDate(row.process.starts_at) }} → {{ formatDate(row.process.due_at) }}</dd>
                        <dd v-else>Sin fechas</dd>
                    </div>
                </dl>
            </div>

            <div class="absolute top-3 right-3 flex items-center gap-1">
                <SheetActions :actions="actions" :menu-label="`Acciones para ${row.code}`" @select="run" />
            </div>

            <SheetFooter class="absolute inset-x-0 bottom-0 border-t bg-card pb-(--safe-footer-inset)">
                <Field orientation="horizontal" class="justify-end">
                    <Button type="button" variant="outline" @click="open = false">Cerrar</Button>
                </Field>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
