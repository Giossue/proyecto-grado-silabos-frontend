<script setup lang="ts">
import InputError from '@/components/InputError.vue';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

withDefaults(defineProps<{ id?: string; error?: string }>(), { id: 'formation' });
const model = defineModel<string>({ required: true });
</script>

<template>
    <div class="grid gap-2">
        <Label :for="id" required>Formación y experiencia académica-investigativa</Label>
        <Textarea
            :id="id"
            v-model="model"
            class="min-h-40"
            name="formacion_experiencia"
            placeholder="Ej. Ingeniero en Sistemas, Magíster en…; cátedras impartidas…; proyectos de investigación…"
        />
        <p class="text-sm text-muted-foreground">
            La escribe una sola vez: todos sus sílabos la copian. Si la cambia, se actualizan los sílabos que aún no ha enviado.
        </p>
        <InputError :message="error" />
    </div>
</template>
