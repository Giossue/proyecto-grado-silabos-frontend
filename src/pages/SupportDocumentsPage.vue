<script setup lang="ts">
import SupportDocumentsPanel from '@/components/domain/academic/SupportDocumentsPanel.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
</script>

<template>
  <PageFrame title="Documentos de apoyo" description="Material de la carrera para sus asignaturas" size="wide">
    <SupportDocumentsPanel :manages="false" />
  </PageFrame>
</template>
