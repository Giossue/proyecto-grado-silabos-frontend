<script setup lang="ts">
import { FieldError } from '@/components/ui/field';

defineProps<{ message?: string }>();
</script>

<template>
    <FieldError v-if="message" :errors="[message]" />
</template>
