<script setup lang="ts">
import { UserRoundCog } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useShownWhileClosing } from '@/lib/dialogExit';

// Una carrera tiene un solo coordinador: asignar otro lo reemplaza, previa confirmación.
const props = defineProps<{ message: string | null; processing: boolean }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
// Mientras se desvanece sigue mostrando el último aviso.
const shownMessage = useShownWhileClosing(() => props.message);
</script>

<template>
    <Dialog :open="message !== null" @update:open="(value: boolean) => { if (!value) emit('cancel'); }">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reemplazar coordinador</DialogTitle>
                <DialogDescription>{{ shownMessage }} Al confirmar, deja de coordinarla. Lo que aprobó en la convocatoria en curso vuelve a revisión para que lo firme el nuevo coordinador</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="button" :disabled="processing" @click="emit('confirm')"><Spinner v-if="processing" data-icon="inline-start" /><UserRoundCog v-else data-icon="inline-start" aria-hidden="true" />Reemplazar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
