<script setup lang="ts">
import { ShieldCheck, ShieldOff } from '@lucide/vue';
import { ref, watch } from 'vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

defineProps<{ title: string; description: string; confirmLabel: string; destructive?: boolean }>();
const emit = defineEmits<{ confirm: [password: string] }>();
const open = defineModel<boolean>('open', { default: false });
const password = ref('');

watch(open, (value) => { if (value) password.value = ''; });

const submit = (): void => {
    if (!password.value) return;
    emit('confirm', password.value);
    password.value = '';
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent>
            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <DialogHeader>
                    <DialogTitle>{{ title }}</DialogTitle>
                    <DialogDescription>{{ description }}</DialogDescription>
                </DialogHeader>
                <div class="grid gap-2">
                    <Label for="confirm-current-password" required>Contraseña actual</Label>
                    <PasswordInput id="confirm-current-password" v-model="password" autocomplete="current-password" aria-required="true" />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" @click="open = false">Cancelar</Button>
                    <Button type="submit" :variant="destructive ? 'destructive' : 'default'" :disabled="!password"><ShieldOff v-if="destructive" data-icon="inline-start" aria-hidden="true" /><ShieldCheck v-else data-icon="inline-start" aria-hidden="true" />{{ confirmLabel }}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
