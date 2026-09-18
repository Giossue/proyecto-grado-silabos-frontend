<script setup lang="ts">
import { Lock } from '@lucide/vue';
import { computed } from 'vue';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { paths } from '@/lib/routes';

const isAdministrator = computed(() => sessionState.current.value?.active_role?.code === 'administrador');
const href = computed(() => isAdministrator.value ? paths.admin.convocations : paths.coordination.convocations);
const instruction = computed(() => isAdministrator.value ? 'Pause el proceso para editar desde' : 'Pause la convocatoria para editar desde');
</script>

<template>
  <Alert><Lock aria-hidden="true" /><AlertTitle>Edición bloqueada</AlertTitle><AlertDescription>{{ instruction }} <RouterLink :to="href" class="font-medium text-foreground underline underline-offset-4">Convocatorias</RouterLink>.</AlertDescription></Alert>
</template>
