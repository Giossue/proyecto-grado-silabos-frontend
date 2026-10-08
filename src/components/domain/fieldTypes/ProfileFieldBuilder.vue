<script setup lang="ts">
defineProps<{ modelValue: Record<string, unknown> }>();
</script>

<template>
  <p class="text-sm text-muted-foreground">
    Coordinación lo escribe una vez en la ficha de la asignatura.
    {{ modelValue.adjustable === true ? 'El docente puede cambiarlo en su sílabo.' : 'El docente solo lo ve en su sílabo.' }}
  </p>
</template>
