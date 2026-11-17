<script setup lang="ts">
import { Sheet } from '@lucide/vue';
import { computed } from 'vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type FieldTable = { kind: string; label: string; editable: boolean };

const props = defineProps<{ allowed: boolean; disabled?: boolean; tables: FieldTable[] }>();
const emit = defineEmits<{ create: []; edit: [kind: string] }>();

const tooltip = computed(() => (props.allowed ? 'Tabla repetible' : 'Tabla repetible: no va en campos Institucionales'));
</script>

<template>
  <MenuTooltip :label="tooltip"><DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Tabla repetible" :disabled="disabled || !allowed" data-table-tool @mousedown.prevent><Sheet aria-hidden="true" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuGroup>
        <DropdownMenuItem data-table-create @select="emit('create')">Nueva tabla repetible</DropdownMenuItem>
      </DropdownMenuGroup>
      <template v-if="tables.length">
        <DropdownMenuSeparator />
        <DropdownMenuLabel>En este campo</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem v-for="table in tables" :key="table.kind" :data-table-edit="table.kind" @select="emit('edit', table.kind)">{{ table.editable ? `Editar «${table.label}»` : `Ver «${table.label}»` }}</DropdownMenuItem>
        </DropdownMenuGroup>
      </template>
    </DropdownMenuContent>
  </DropdownMenu></MenuTooltip>
</template>
