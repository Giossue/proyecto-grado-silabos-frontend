<script setup lang="ts">
import { RotateCcw, Save } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { computed, ref, watch } from 'vue';
import ConfirmPhrase from '@/components/domain/ConfirmPhrase.vue';
import { FINALIZED_NOTICE, usePurgeConfirmation } from '@/composables/usePurgeConfirmation';
import { matchesPhrase } from '@/lib/confirmPhrase';

const PHRASE = 'devolver a borrador';
const { open, message, mode, confirm, cancel } = usePurgeConfirmation();
const finalizedNotice = computed(() => mode.value === FINALIZED_NOTICE);
const typed = ref('');
const ready = computed(() => matchesPhrase(typed.value, PHRASE));
// Se borra al abrir: al cerrar, la frase sigue escrita mientras el modal se desvanece.
watch(open, (isOpen) => { if (isOpen) typed.value = ''; });
</script>

<template>
    <Dialog
        :open="open"
        @update:open="
            (isOpen) => {
                if (!isOpen) cancel();
            }
        "
    >
        <DialogContent layer="confirmation">
            <DialogHeader>
                <DialogTitle>{{ finalizedNotice ? 'La convocatoria ya finalizó' : 'Este cambio afecta sílabos en curso' }}</DialogTitle>
                <DialogDescription>{{ message }}</DialogDescription>
            </DialogHeader>
            <ConfirmPhrase v-if="!finalizedNotice" id="purge-confirm" v-model="typed" :phrase="PHRASE" />
            <DialogFooter>
                <Button type="button" variant="outline" @click="cancel">
                    Cancelar
                </Button>
                <Button v-if="finalizedNotice" type="button" @click="confirm">
                    <Save data-icon="inline-start" aria-hidden="true" />
                    Guardar de todos modos
                </Button>
                <Button v-else type="button" variant="destructive" :disabled="!ready" @click="confirm">
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    Guardar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
