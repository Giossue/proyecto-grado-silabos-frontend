<script setup lang="ts">
import InputError from '@/components/InputError.vue';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const props = withDefaults(defineProps<{ id?: string; error?: string; hideHint?: boolean }>(), { id: 'formation', hideHint: false });
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
            :aria-invalid="Boolean(error)"
            :aria-describedby="error ? `${props.id}-error` : undefined"
            placeholder="Ej. Ingeniero en Sistemas, Magíster en…; cátedras impartidas…; proyectos de investigación…"
        />
        <p v-if="!hideHint" class="text-sm text-muted-foreground">
            La escribe una sola vez: todos sus sílabos la copian. Si la cambia, se actualizan los sílabos que aún no ha enviado
        </p>
        <InputError :id="`${props.id}-error`" :message="error" />
    </div>
</template>
