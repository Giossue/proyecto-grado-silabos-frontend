<script setup lang="ts">
import { Lock } from '@lucide/vue';
import { computed } from 'vue';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { paths } from '@/lib/routes';

const props = defineProps<{ title: string; reason: string }>();
const href = computed(() => sessionState.current.value?.active_role?.code === 'administrador'
  ? paths.admin.convocations
  : paths.coordination.convocations);
const parts = computed(() => {
  const index = props.reason.indexOf('Convocatorias');
  return index === -1
    ? { before: props.reason, link: '', after: '' }
    : { before: props.reason.slice(0, index), link: 'Convocatorias', after: props.reason.slice(index + 14) };
});
</script>

<template>
  <Alert><Lock aria-hidden="true" /><AlertTitle>{{ title }}</AlertTitle><AlertDescription><span>{{ parts.before }}<RouterLink v-if="parts.link" :to="href" class="font-medium text-foreground underline underline-offset-4">{{ parts.link }}</RouterLink>{{ parts.after }}</span></AlertDescription></Alert>
</template>
