<script setup lang="ts">
defineProps<{ open: boolean; title: string; description?: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop" @click.self="emit('close')">
      <aside class="form-sheet" role="dialog" aria-modal="true" aria-labelledby="form-sheet-title">
        <header><div><h2 id="form-sheet-title">{{ title }}</h2><p v-if="description">{{ description }}</p></div><button class="icon-button" type="button" aria-label="Cerrar" @click="emit('close')">×</button></header>
        <div class="form-sheet-content"><slot /></div>
      </aside>
    </div>
  </Teleport>
</template>
