<script setup lang="ts">
import { computed } from 'vue';
import { SIGNATURE_ROLE_LABELS, type SignatureRole, type SignatureSummary } from '@/api/signatures';

const props = defineProps<{ signatures: SignatureSummary[] | null | undefined }>();

const ORDER: SignatureRole[] = ['docente', 'coordinacion', 'biblioteca'];
const roleLabel = (role: SignatureRole): string => (SIGNATURE_ROLE_LABELS[role] ?? String(role)).toLowerCase();
const items = computed(() => [...(props.signatures ?? [])]
  .sort((left, right) => ORDER.indexOf(left.role) - ORDER.indexOf(right.role)));
</script>

<template>
  <p v-if="items.length" class="text-sm text-muted-foreground" data-testid="signatures-note">
    Firmado por
    <template v-for="(item, index) in items" :key="item.role"><template v-if="index > 0"> · </template><span>{{ item.name }} ({{ roleLabel(item.role) }})</span></template>
  </p>
</template>
