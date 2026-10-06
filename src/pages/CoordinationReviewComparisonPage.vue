<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { compareReviews, type ReviewComparison } from '@/api/reviews';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { freeTextLines, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import { reviewAreaPaths } from '@/lib/routes';

const route = useRoute();
const data = ref<ReviewComparison | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const changeLabel = (change: 'added' | 'removed' | 'modified'): string => ({ added: 'Agregado', removed: 'Retirado', modified: 'Modificado' }[change]);
type ChangeSide = ReviewComparison['comparison']['changes'][number]['before'];
const formatSide = (side: ChangeSide): string => {
  if (side === null) return 'No existía en esta revisión.';
  if (side.value === null || side.value === '') return 'Sin contenido';
  if (isFreeTextDocument(side.value)) return freeTextLines(side.value);
  if (typeof side.value === 'boolean') return side.value ? 'Sí' : 'No';
  if (typeof side.value === 'object') return JSON.stringify(side.value, null, 2);
  return String(side.value);
};

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try { data.value = await compareReviews(String(route.params.before), String(route.params.after)); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo comparar las revisiones.'; }
  finally { loading.value = false; }
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame
    title="Comparar revisiones"
    :description="data ? `${data.syllabus.subject} · ${data.syllabus.code} · ${data.syllabus.period}` : 'Contenido enviado en dos revisiones del expediente.'"
  >
    <template #eyebrow><Button as-child variant="link" size="sm" class="h-auto px-0"><RouterLink :to="reviewAreaPaths().review(String(route.params.after))"><ArrowLeft aria-hidden="true" />Volver al expediente</RouterLink></Button></template>
    <template v-if="data" #meta><Badge variant="secondary">{{ data.comparison.changed_fields }} campo(s) con cambios</Badge></template>

    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-if="loading && !data" variant="comparison" />

    <template v-if="data">
      <Card><CardHeader><CardTitle>Revisión {{ data.comparison.before_revision }} → revisión {{ data.comparison.after_revision }}</CardTitle><CardDescription>La comparación muestra el contenido enviado en dos revisiones del mismo expediente.</CardDescription></CardHeader></Card>
      <Card v-for="change in data.comparison.changes" :key="`${change.section_key}.${change.field_key}`">
        <CardHeader><div class="flex flex-wrap items-center justify-between gap-3"><div><CardDescription>{{ change.section_title }}</CardDescription><CardTitle>{{ change.label }}</CardTitle></div><Badge variant="outline">{{ changeLabel(change.change) }}</Badge></div></CardHeader>
        <CardContent class="grid gap-4 lg:grid-cols-2">
          <section class="min-w-0 rounded-md border border-destructive/30 p-4"><h2 class="font-medium text-destructive">Revisión {{ data.comparison.before_revision }}</h2><pre class="mt-3 overflow-x-auto font-sans text-sm whitespace-pre-wrap">{{ formatSide(change.before) }}</pre></section>
          <section class="min-w-0 rounded-md border border-success/40 p-4"><h2 class="font-medium text-success">Revisión {{ data.comparison.after_revision }}</h2><pre class="mt-3 overflow-x-auto font-sans text-sm whitespace-pre-wrap">{{ formatSide(change.after) }}</pre></section>
        </CardContent>
      </Card>
      <Card v-if="data.comparison.changes.length === 0"><CardContent class="py-10 text-center text-muted-foreground">No hay diferencias de contenido entre estas revisiones.</CardContent></Card>
    </template>
  </PageFrame>
</template>
