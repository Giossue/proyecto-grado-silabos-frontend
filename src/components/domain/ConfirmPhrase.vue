<script setup lang="ts">
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/** Para acciones delicadas: hay que escribir la frase antes de poder confirmar (en lugar de esperar una cuenta regresiva). */
defineProps<{ id: string; phrase: string }>();
const typed = defineModel<string>({ default: '' });
</script>

<template>
    <Field>
        <FieldLabel :for="id" required>Escriba «{{ phrase }}» para confirmar</FieldLabel>
        <Input :id="id" v-model="typed" autocomplete="off" spellcheck="false" aria-required="true" />
    </Field>
</template>
