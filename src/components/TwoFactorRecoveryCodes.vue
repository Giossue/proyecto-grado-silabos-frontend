<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole } from '@lucide/vue';
import { nextTick, ref, useTemplateRef } from 'vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

defineProps<{ codes: string[]; processing: boolean }>();
const emit = defineEmits<{ regenerate: [password: string] }>();
const visible = ref(false);
const password = ref('');
const section = useTemplateRef('section');

const toggle = async (): Promise<void> => {
    visible.value = !visible.value;
    if (visible.value) {
        await nextTick();
        section.value?.scrollIntoView({ behavior: 'smooth' });
    }
};

const regenerate = (): void => {
    if (!password.value) return;
    emit('regenerate', password.value);
    password.value = '';
};
</script>

<template>
    <Card class="w-full">
        <CardHeader>
            <CardTitle class="flex gap-3"><LockKeyhole class="size-4" />Códigos de recuperación 2FA</CardTitle>
            <CardDescription>Permiten recuperar el acceso si pierde el dispositivo 2FA. Guárdelos en un gestor de contraseñas seguro.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <Button class="w-fit" @click="toggle">
                <component :is="visible ? EyeOff : Eye" class="size-4" />
                {{ visible ? 'Ocultar' : 'Ver' }} códigos
            </Button>
            <div v-if="visible" ref="section" class="space-y-4">
                <div class="grid gap-1 rounded-lg bg-muted p-4 font-mono text-sm">
                    <div v-if="codes.length === 0" class="text-muted-foreground">Genere códigos nuevos para mostrarlos aquí.</div>
                    <div v-for="code in codes" v-else :key="code">{{ code }}</div>
                </div>
                <form class="grid gap-3" @submit.prevent="regenerate">
                    <Label for="recovery-current-password" required>Contraseña actual</Label>
                    <PasswordInput id="recovery-current-password" v-model="password" autocomplete="current-password" required />
                    <Button class="w-fit" type="submit" variant="secondary" :disabled="processing || !password">Regenerar códigos</Button>
                </form>
            </div>
        </CardContent>
    </Card>
</template>
