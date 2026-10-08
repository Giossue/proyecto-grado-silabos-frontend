<script setup lang="ts">
import { Lock } from '@lucide/vue';
import { computed } from 'vue';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { paths } from '@/lib/routes';

const isAdministrator = computed(() => sessionState.current.value?.active_role?.code === 'administrador');
const href = computed(() => isAdministrator.value ? paths.admin.convocations : paths.coordination.panel);
</script>

<template>
  <Alert>
    <Lock aria-hidden="true" />
    <AlertTitle>Edición bloqueada</AlertTitle>
    <AlertDescription v-if="isAdministrator">
      Pause el proceso para editar desde <RouterLink :to="href" class="font-medium text-foreground underline underline-offset-4">Convocatorias</RouterLink>
    </AlertDescription>
    <AlertDescription v-else>
      Pause la <RouterLink :to="href" class="font-medium text-foreground underline underline-offset-4">convocatoria</RouterLink> para editar
    </AlertDescription>
  </Alert>
</template>
