<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const props = defineProps<{ active: 'jobs' | 'activity' }>();
const router = useRouter();

const navigate = (value: string | number): void => {
  if (value === props.active) return;
  void router.push(value === 'jobs' ? '/administracion/trabajos' : '/administracion/auditoria');
};
</script>

<template>
  <Tabs :model-value="active" activation-mode="manual" @update:model-value="navigate">
    <TabsList aria-label="Secciones de auditoría">
      <TabsTrigger value="jobs">Procesos</TabsTrigger>
      <TabsTrigger value="activity">Registro de actividad</TabsTrigger>
    </TabsList>
    <TabsContent :value="active"><slot /></TabsContent>
  </Tabs>
</template>
