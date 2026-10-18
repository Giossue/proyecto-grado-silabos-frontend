<script setup lang="ts">
import { Check, ScanLine } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{
    qrCodeSvg: string | null;
    processing: boolean;
    error: string | null;
}>();
const emit = defineEmits<{ confirm: [code: string] }>();
const isOpen = defineModel<boolean>('isOpen');
const verification = ref(false);
const code = ref('');

watch(isOpen, (open) => {
    if (!open) {
        verification.value = false;
        code.value = '';
    }
});

const submit = (): void => {
    if (code.value.length === 6 && !props.processing) emit('confirm', code.value);
};
const qrImage = computed(() => `data:image/svg+xml;utf8,${encodeURIComponent(props.qrCodeSvg ?? '')}`);
</script>

<template>
    <Dialog :open="isOpen" @update:open="isOpen = $event">
        <DialogContent class="sm:max-w-md">
            <DialogHeader class="flex items-center justify-center">
                <div class="mb-3 w-auto rounded-full border border-border bg-card p-0.5 shadow-surface">
                    <div class="relative overflow-hidden rounded-full border border-border bg-muted p-2.5">
                        <ScanLine class="relative z-20 size-6 text-foreground" />
                    </div>
                </div>
                <DialogTitle>{{ verification ? 'Verificar código de autenticación' : 'Activar autenticación de dos factores' }}</DialogTitle>
                <DialogDescription class="text-center">
                    {{ verification ? 'Ingrese el código de seis dígitos de su aplicación' : 'Escanee el código QR con su aplicación autenticadora' }}
                </DialogDescription>
            </DialogHeader>

            <div class="relative flex w-auto flex-col items-center justify-center gap-5">
                <InputError v-if="error" :message="error" />
                <template v-if="!verification">
                    <div class="relative mx-auto aspect-square w-64 overflow-hidden rounded-lg ring-1 ring-surface-ring bg-background p-5">
                        <div v-if="!qrCodeSvg" class="size-full" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando código QR"><span class="sr-only">Cargando código QR…</span><Skeleton aria-hidden="true" class="size-full" /></div>
                        <img v-else :src="qrImage" alt="Código QR para su aplicación autenticadora" class="size-full object-contain">
                    </div>
                    <div class="flex w-full items-center gap-2">
                        <Button type="button" variant="outline" class="flex-1" @click="isOpen = false">Cancelar</Button>
                        <Button type="button" class="flex-1" :disabled="!qrCodeSvg" @click="verification = true">
                            <Check data-icon="inline-start" aria-hidden="true" />Continuar
                        </Button>
                    </div>
                </template>
                <form v-else class="flex w-full flex-col gap-4" @submit.prevent="submit">
                    <div class="flex w-full flex-col items-center justify-center gap-3 py-2">
                        <Label for="otp" required>Código de autenticación</Label>
                        <InputOTP id="otp" v-model="code" :maxlength="6" :disabled="processing" aria-required="true">
                            <InputOTPGroup><InputOTPSlot v-for="index in 6" :key="index" :index="index - 1" /></InputOTPGroup>
                        </InputOTP>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" class="flex-1" :disabled="processing" @click="verification = false">Volver</Button>
                        <Button type="submit" class="flex-1" :disabled="processing || code.length < 6">
                            <Spinner v-if="processing" /><Check v-else data-icon="inline-start" aria-hidden="true" />Confirmar
                        </Button>
                    </div>
                </form>
            </div>
        </DialogContent>
    </Dialog>
</template>
