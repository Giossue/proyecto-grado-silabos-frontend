<script setup lang="ts">
import SupportDocumentsPanel from '@/components/domain/academic/SupportDocumentsPanel.vue';
import { ref } from 'vue';
import PageFrame from '@/components/domain/PageFrame.vue';

const loading = ref(true);
</script>

<template>
  <PageFrame title="Documentos de apoyo" description="Material de la carrera para sus asignaturas" size="wide" :loading="loading">
    <SupportDocumentsPanel v-model:loading="loading" :manages="false" />
  </PageFrame>
</template>
