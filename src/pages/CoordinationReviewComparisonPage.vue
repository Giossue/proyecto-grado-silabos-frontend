<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import { ApiError } from '@/api/client';
import { compareReviews, type ReviewComparison } from '@/api/reviews';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import { freeTextLines, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import { reviewAreaPaths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
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

const backTo = computed(() => reviewAreaPaths().review(data.value?.syllabus.current_revision_id ?? String(route.params.after)));

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try { data.value = await compareReviews(String(route.params.before), String(route.params.after)); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo comparar las revisiones.'; }
  finally { loading.value = false; }
};

const revisions = computed(() => data.value?.syllabus.revisions ?? []);
const pick = (side: 'before' | 'after', id: unknown): void => {
  if (typeof id !== 'string') return;
  const chosen = [side === 'before' ? id : String(route.params.before), side === 'after' ? id : String(route.params.after)];
  if (chosen[0] === chosen[1]) return;
  const number = (revisionId: string): number => revisions.value.find((item) => item.id === revisionId)?.number ?? 0;
  const [before, after] = number(chosen[0]!) <= number(chosen[1]!) ? chosen : [chosen[1]!, chosen[0]!];
  void router.replace(reviewAreaPaths().comparison(before!, after!));
};

onMounted(() => { void load(); });
watch(() => [route.params.before, route.params.after], () => { void load(); });
</script>

<template>
  <header class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 shadow-surface backdrop-blur sm:px-5" aria-label="Herramientas de la comparación">
    <Button as-child variant="link" size="sm" class="h-auto px-0"><RouterLink :to="backTo"><ArrowLeft aria-hidden="true" />Volver al expediente</RouterLink></Button>
    <span class="flex-1" />
    <AppearanceToggle />
  </header>
  <PageFrame :title="data?.syllabus.subject ?? ''" :description="data?.syllabus.period ?? ''" :loading="!data && loading" hide-icon>
    <template v-if="data" #meta><Badge variant="secondary">{{ data.comparison.changed_fields }} campo(s) con cambios</Badge></template>

    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-if="loading && !data" variant="comparison" />

    <template v-if="data">
      <div class="flex flex-wrap items-end gap-3">
        <Field class="w-44">
          <FieldLabel for="compare-before">Desde</FieldLabel>
          <Select :model-value="String(route.params.before)" @update:model-value="(id) => pick('before', id)">
            <SelectTrigger id="compare-before"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem v-for="item in revisions" :key="item.id" :value="item.id">Versión {{ item.number }}</SelectItem></SelectGroup></SelectContent>
          </Select>
        </Field>
        <Field class="w-44">
          <FieldLabel for="compare-after">Hasta</FieldLabel>
          <Select :model-value="String(route.params.after)" @update:model-value="(id) => pick('after', id)">
            <SelectTrigger id="compare-after"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem v-for="item in revisions" :key="item.id" :value="item.id">Versión {{ item.number }}</SelectItem></SelectGroup></SelectContent>
          </Select>
        </Field>
      </div>
      <Card v-for="change in data.comparison.changes" :key="`${change.section_key}.${change.field_key}`">
        <CardHeader><div class="flex flex-wrap items-center justify-between gap-3"><div><CardDescription>{{ change.section_title }}</CardDescription><CardTitle>{{ change.label }}</CardTitle></div><Badge variant="outline">{{ changeLabel(change.change) }}</Badge></div></CardHeader>
        <CardContent class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section class="min-w-0 rounded-md border border-destructive/30 p-4"><h2 class="font-medium text-destructive">Versión {{ data.comparison.before_revision }}</h2><FreeTextContent v-if="change.before && isFreeTextDocument(change.before.value)" :value="change.before.value" class="mt-3 overflow-x-auto" /><p v-else class="mt-3 whitespace-pre-wrap text-sm">{{ formatSide(change.before) }}</p></section>
          <section class="min-w-0 rounded-md border border-success/40 p-4"><h2 class="font-medium text-success">Versión {{ data.comparison.after_revision }}</h2><FreeTextContent v-if="change.after && isFreeTextDocument(change.after.value)" :value="change.after.value" class="mt-3 overflow-x-auto" /><p v-else class="mt-3 whitespace-pre-wrap text-sm">{{ formatSide(change.after) }}</p></section>
        </CardContent>
      </Card>
      <Card v-if="data.comparison.changes.length === 0"><CardContent class="py-10 text-center text-muted-foreground">No hay diferencias de contenido entre estas revisiones.</CardContent></Card>
    </template>
  </PageFrame>
</template>
