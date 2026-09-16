<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { compareReviews, type ReviewComparison } from '@/api/reviews';
import SnapshotValue from '@/components/SnapshotValue.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const route = useRoute();
const data = ref<ReviewComparison | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const changeLabel = (change: 'added' | 'removed' | 'modified'): string => ({ added: 'Agregado', removed: 'Retirado', modified: 'Modificado' }[change]);

onMounted(async () => {
  try { data.value = await compareReviews(String(route.params.before), String(route.params.after)); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo comparar las revisiones.'; }
  finally { loading.value = false; }
});
</script>

<template>
  <PageFrame
    title="Comparar revisiones"
    :description="data ? `${data.syllabus.subject} · ${data.syllabus.code} · ${data.syllabus.period}` : 'Contenido enviado en dos revisiones del expediente.'"
  >
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="`/coordinacion/revisiones/${String(route.params.after)}`">← Volver al expediente</RouterLink></Button></template>
    <template v-if="data" #meta><Badge variant="secondary">{{ data.comparison.changed_fields }} campo(s) con cambios</Badge></template>

    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <p v-if="loading" class="text-sm text-muted-foreground" role="status">Comparando revisiones…</p>

    <template v-if="data">
      <Card><CardHeader><CardTitle>Revisión {{ data.comparison.before_revision }} → revisión {{ data.comparison.after_revision }}</CardTitle><CardDescription>La comparación muestra el contenido exacto enviado en cada revisión.</CardDescription></CardHeader></Card>
      <Card v-for="change in data.comparison.changes" :key="`${change.section_key}.${change.field_key}`">
        <CardHeader><div class="flex flex-wrap items-center justify-between gap-3"><div><CardDescription>{{ change.section_title }}</CardDescription><CardTitle>{{ change.label }}</CardTitle></div><Badge variant="outline">{{ changeLabel(change.change) }}</Badge></div></CardHeader>
        <CardContent class="grid gap-4 lg:grid-cols-2">
          <section class="min-w-0 rounded-md border border-red-200 p-4 dark:border-red-900"><h2 class="font-medium">Revisión {{ data.comparison.before_revision }}</h2><div class="mt-3 overflow-x-auto text-sm"><SnapshotValue v-if="change.before" :value="change.before.value" :rows="change.before.rows" /><p v-else class="text-muted-foreground">No existía en esta revisión.</p></div></section>
          <section class="min-w-0 rounded-md border border-emerald-200 p-4 dark:border-emerald-900"><h2 class="font-medium">Revisión {{ data.comparison.after_revision }}</h2><div class="mt-3 overflow-x-auto text-sm"><SnapshotValue v-if="change.after" :value="change.after.value" :rows="change.after.rows" /><p v-else class="text-muted-foreground">El campo fue retirado.</p></div></section>
        </CardContent>
      </Card>
      <Card v-if="data.comparison.changes.length === 0"><CardContent class="py-10 text-center text-muted-foreground">No hay diferencias de contenido entre estas revisiones.</CardContent></Card>
    </template>
  </PageFrame>
</template>
