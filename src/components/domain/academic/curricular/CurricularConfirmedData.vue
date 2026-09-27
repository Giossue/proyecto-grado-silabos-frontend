<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ConfirmedCurricularValue } from '@/api/curricular-imports';
import CurricularValuePreview from './CurricularValuePreview.vue';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const props = defineProps<{ values: ConfirmedCurricularValue[] }>();
const search = ref('');
const visible = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('es');
  if (!query) return props.values;
  return props.values.filter((item) => [item.subject_name, item.subject_code, item.label]
    .some((part) => part?.toLocaleLowerCase('es').includes(query)));
});
const formatDate = (value: string) => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value));
</script>

<template>
  <div class="flex min-w-0 flex-col gap-5">
    <p class="text-sm text-muted-foreground">Estos son los datos confirmados que usará un sílabo nuevo de esta carrera. Para corregirlos, importa el documento actualizado y confirma la propuesta.</p>
    <Field>
      <FieldLabel for="confirmed-curricular-search">Buscar materia o dato</FieldLabel>
      <Input id="confirmed-curricular-search" v-model="search" placeholder="Ej. Calidad de Software o resultados de aprendizaje" />
    </Field>
    <Empty v-if="!visible.length">
      <EmptyHeader>
        <EmptyTitle>{{ values.length ? 'Sin coincidencias' : 'Aún no hay datos confirmados' }}</EmptyTitle>
        <EmptyDescription>{{ values.length ? 'Prueba con otra materia o nombre de dato.' : 'Importa los documentos de la carrera para preparar sus datos.' }}</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <section v-for="item in visible" :key="item.id" class="flex min-w-0 flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="min-w-0 break-words font-medium">{{ item.subject_id ? `${item.subject_code} · ${item.subject_name}` : 'Datos de la carrera' }}</h3>
        <Badge v-if="item.origin === 'anterior'" variant="outline">Registro anterior</Badge>
      </div>
      <h4 class="text-sm font-medium">{{ item.label }}</h4>
      <CurricularValuePreview :definition="item" :value="item.value" />
      <p class="text-xs text-muted-foreground">Confirmado el {{ formatDate(item.confirmed_at) }}</p>
      <div v-for="(source, index) in item.evidence" :key="index" class="text-sm">
        <p class="break-words text-muted-foreground">{{ source.source_name }}<template v-if="source.locator"> · {{ source.locator }}</template></p>
        <blockquote v-if="source.quote" class="mt-1 whitespace-pre-wrap break-words border-l-2 pl-3">{{ source.quote }}</blockquote>
        <p v-else-if="item.origin === 'anterior'" class="text-xs text-muted-foreground">Este registro anterior conserva la ubicación de la fuente, sin extracto digital.</p>
      </div>
      <Separator />
    </section>
  </div>
</template>
