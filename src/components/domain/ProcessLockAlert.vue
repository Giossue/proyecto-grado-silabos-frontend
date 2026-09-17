<script setup lang="ts">
import { Lock } from '@lucide/vue';
import { computed } from 'vue';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { paths } from '@/lib/routes';

const href = computed(() => sessionState.current.value?.active_role?.code === 'administrador'
  ? paths.admin.convocations
  : paths.coordination.convocations);
</script>

<template>
  <Alert><Lock aria-hidden="true" /><AlertTitle>Edición bloqueada</AlertTitle><AlertDescription>Primero debe pausar la convocatoria desde <RouterLink :to="href" class="font-medium text-foreground underline underline-offset-4">Convocatorias</RouterLink>.</AlertDescription></Alert>
</template>
