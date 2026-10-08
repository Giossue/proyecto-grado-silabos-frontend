<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import type { PaginationMeta } from '@/types/pagination';

const props = withDefaults(defineProps<{
  meta: PaginationMeta;
  label?: string;
}>(), {
  label: 'Paginación de la tabla',
});

const emit = defineEmits<{ 'update:page': [page: number] }>();

const changePage = (page: number): void => {
  if (page === props.meta.current_page || page < 1 || page > props.meta.last_page) return;
  emit('update:page', page);
};
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-muted-foreground" aria-live="polite">
      {{ meta.from ?? 0 }}–{{ meta.to ?? 0 }} de {{ meta.total }}
    </p>
    <Pagination
      :page="meta.current_page"
      :total="meta.total"
      :items-per-page="meta.per_page"
      :sibling-count="1"
      show-edges
      :aria-label="label"
      class="mx-0 w-auto justify-start sm:justify-end"
      @update:page="changePage"
    >
      <PaginationContent v-slot="{ items }" class="flex-wrap">
        <PaginationPrevious aria-label="Página anterior">
          <ChevronLeft aria-hidden="true" />
          <span class="hidden sm:inline">Anterior</span>
        </PaginationPrevious>
        <span class="px-2 text-sm sm:hidden" aria-live="polite">Página {{ meta.current_page }} de {{ meta.last_page }}</span>
        <template v-for="(item, index) in items" :key="index">
          <PaginationItem
            v-if="item.type === 'page'"
            :value="item.value"
            :is-active="item.value === meta.current_page"
            :aria-label="`Ir a la página ${item.value}`"
            class="hidden sm:inline-flex"
          >
            {{ item.value }}
          </PaginationItem>
          <PaginationEllipsis v-else class="hidden sm:flex" />
        </template>
        <PaginationNext aria-label="Página siguiente">
          <span class="hidden sm:inline">Siguiente</span>
          <ChevronRight aria-hidden="true" />
        </PaginationNext>
      </PaginationContent>
    </Pagination>
  </div>
</template>
