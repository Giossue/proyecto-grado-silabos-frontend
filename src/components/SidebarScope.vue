<script setup lang="ts">
import { computed } from 'vue';
import { roleLabel } from '@/lib/roles';
import { sessionState } from '@/state/session';

const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
</script>

<template>
    <dl
        v-if="activeRole"
        class="flex flex-col gap-2 px-4 pt-1 pb-2 text-sm group-data-[collapsible=icon]:hidden"
        aria-label="Rol y carrera activos"
    >
        <div class="flex flex-col">
            <dt class="text-xs text-sidebar-foreground/60">Rol</dt>
            <dd class="font-medium text-sidebar-foreground" data-test="sidebar-role">{{ roleLabel(activeRole.code) }}</dd>
        </div>
        <div v-if="activeRole.career_name" class="flex flex-col">
            <dt class="text-xs text-sidebar-foreground/60">Carrera</dt>
            <dd class="font-medium text-sidebar-foreground" data-test="sidebar-career">{{ activeRole.career_name }}</dd>
        </div>
    </dl>
</template>
