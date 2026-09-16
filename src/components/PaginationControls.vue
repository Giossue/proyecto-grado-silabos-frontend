<script setup lang="ts">
defineProps<{
  currentPage: number;
  lastPage: number;
  total: number;
}>();

defineEmits<{ change: [page: number] }>();
</script>

<template>
  <nav v-if="lastPage > 1" class="pagination" aria-label="Paginación">
    <button
      type="button"
      :disabled="currentPage <= 1"
      @click="$emit('change', currentPage - 1)"
    >
      Anterior
    </button>
    <span>Página {{ currentPage }} de {{ lastPage }} · {{ total }} resultados</span>
    <button
      type="button"
      :disabled="currentPage >= lastPage"
      @click="$emit('change', currentPage + 1)"
    >
      Siguiente
    </button>
  </nav>
</template>
