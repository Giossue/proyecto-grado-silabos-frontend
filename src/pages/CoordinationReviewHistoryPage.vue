<script setup lang="ts">
import RoleDeadlineBanner from '@/components/domain/RoleDeadlineBanner.vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { ArrowLeft, Highlighter } from '@lucide/vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { compareReviews, getReview, type ReviewDetail, type ReviewTimelineEvent } from '@/api/reviews';
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import SyllabusDocumentPreview, { type PreviewSection } from '@/components/domain/syllabus/SyllabusDocumentPreview.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { libraryCommentLines } from '@/lib/reviewComment';
import { reviewAreaPaths } from '@/lib/routes';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Version = { id: string; number: number; at: string; by: string | null; current: boolean; events: ReviewTimelineEvent[] };

const route = useRoute();
const router = useRouter();
const area = reviewAreaPaths();
const data = ref<ReviewDetail | null>(null);
const loading = ref(true);
const loadError = ref('');
const changedFields = ref<ReadonlySet<string>>(new Set());
const highlight = ref(true);
const noChanges: ReadonlySet<string> = new Set();
const page = ref<HTMLElement | null>(null);
const marks = ref<Array<{ top: number; element: HTMLElement }>>([]);

const measureMarks = async (): Promise<void> => {
  await nextTick();
  const container = page.value?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? page.value;
  if (!container) { marks.value = []; return; }
  const origin = container.getBoundingClientRect().top - container.scrollTop;
  marks.value = Array.from(container.querySelectorAll<HTMLElement>('[data-changed]')).map((element) => ({
    top: ((element.getBoundingClientRect().top - origin) / container.scrollHeight) * 100,
    element,
  }));
};
const goTo = (element: HTMLElement): void => element.scrollIntoView({ behavior: 'smooth', block: 'center' });

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = '';
  changedFields.value = new Set();
  try {
    data.value = await getReview(String(route.params.revision));
    await markChanges();
  } catch (failure) {
    loadError.value = failure instanceof ApiError ? failure.message : 'No se pudo cargar el historial';
  } finally {
    loading.value = false;
  }
};

const versions = computed<Version[]>(() => {
  if (!data.value) return [];
  const newest = Math.max(...data.value.history.map((item) => item.number));

  return data.value.history
    .map((item) => {
      const events = data.value!.timeline.filter((event) => event.revision_id === item.id);
      const sent = events.find((event) => event.kind === 'enviado');

      return {
        id: item.id,
        number: item.number,
        at: sent?.at ?? item.submitted_at,
        by: sent?.by ?? item.submitted_by,
        current: item.number === newest,
        events: events.filter((event) => event.kind !== 'enviado').sort((left, right) => left.at.localeCompare(right.at)),
      };
    })
    .sort((left, right) => right.number - left.number);
});
const days = computed(() => {
  const groups: Array<{ label: string; versions: Version[] }> = [];
  for (const version of versions.value) {
    const label = formatDateDisplay(version.at, { weekday: 'long', day: 'numeric', month: 'long' });
    const last = groups.at(-1);
    if (last?.label === label) last.versions.push(version);
    else groups.push({ label, versions: [version] });
  }

  return groups;
});
const selected = computed(() => versions.value.find((version) => version.id === data.value?.revision.id) ?? null);
const previous = computed(() => (selected.value ? versions.value.find((version) => version.number === selected.value!.number - 1) ?? null : null));
const currentVersion = computed(() => versions.value.find((version) => version.current) ?? null);
const previewSections = computed<PreviewSection[]>(() => (data.value?.revision.snapshot.sections ?? []).map((section) => ({
  id: section.key,
  title: section.title,
  orientation: section.orientation,
  fields: section.fields.map((field) => ({ ...field, id: field.id ?? field.key })),
})));
const title = computed(() => (selected.value ? `Versión ${selected.value.number} · ${formatDateDisplay(selected.value.at, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false })}` : ''));
const time = (value: string): string => formatDateDisplay(value, { hour: '2-digit', minute: '2-digit', hour12: false });
const capitalized = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
const eventText = (event: ReviewTimelineEvent): string => ({
  enviado: 'El docente envió el sílabo',
  biblioteca_verifico: 'Biblioteca verificó la bibliografía y envió a Coordinación',
  coordinacion_aprobo: 'Coordinación aprobó y envió a Biblioteca',
  correccion: 'Coordinación pidió correcciones',
  devuelto_biblioteca: 'Biblioteca devolvió al docente',
  aprobado: event.by ? 'Coordinación aprobó el sílabo' : 'Sílabo aprobado',
}[event.kind]);

const versionLabel = (version: Version): string => {
  if (version.events.some((event) => event.kind === 'aprobado')) return 'Aprobada';
  return version.number === 1 ? 'Primer envío' : 'Corregida tras observaciones';
};

const select = (id: string): void => {
  if (id !== data.value?.revision.id) void router.replace(area.history(id));
};
async function markChanges(): Promise<void> {
  if (!previous.value || !data.value) return;
  try {
    const result = await compareReviews(previous.value.id, data.value.revision.id);
    changedFields.value = new Set(result.comparison.changes.map((change) => `${change.section_key}.${change.field_key}`));
  } catch (reason) {
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudieron destacar los cambios');
  }
}

watch([changedFields, highlight, () => data.value], measureMarks, { flush: 'post' });
onMounted(load);
watch(() => route.params.revision, (current, before) => { if (current !== before) void load(); });
</script>

<template>
  <header class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur sm:px-5" aria-label="Herramientas del historial">
    <IconTooltip label="Volver al sílabo"><Button as-child variant="ghost" size="icon" aria-label="Volver al sílabo"><RouterLink :to="area.review(currentVersion?.id ?? String(route.params.revision))"><ArrowLeft aria-hidden="true" /></RouterLink></Button></IconTooltip>
    <div v-if="!data && !loadError" class="flex min-w-0 flex-col gap-1.5" data-skeleton="history-title">
      <Skeleton class="h-4 w-48 max-w-full" />
      <Skeleton class="h-3.5 w-32 max-w-full" />
    </div>
    <div v-else class="flex min-w-0 flex-col leading-tight">
      <span class="truncate font-medium">{{ data?.syllabus.subject ?? '' }}</span>
      <span class="truncate text-sm text-muted-foreground">{{ title }}</span>
    </div>
    <span class="flex-1" />
    <Skeleton v-if="!data && !loadError" class="size-9" />
    <TooltipProvider v-else>
      <Tooltip>
        <TooltipTrigger as-child>
          <span class="inline-flex" :tabindex="changedFields.size === 0 ? 0 : undefined">
            <Button type="button" variant="ghost" size="icon" aria-label="Resaltar cambios" :aria-pressed="highlight" :disabled="changedFields.size === 0" :class="highlight && changedFields.size > 0 ? 'bg-accent text-accent-foreground' : ''" @click="highlight = !highlight"><Highlighter aria-hidden="true" /></Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{{ changedFields.size === 0 ? 'No hay cambios que resaltar' : highlight ? 'Quitar el resaltado' : 'Resaltar los cambios' }}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <AppearanceToggle />
  </header>
  <RoleDeadlineBanner />
  <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
  <div v-else class="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
    <div class="relative min-w-0 flex-1">
      <ScrollArea type="auto" class="h-full lg:h-[calc(100dvh-3.5rem)]">
        <main ref="page" class="p-4 sm:p-6">
          <LoadingSkeleton v-if="loading && !data" variant="preview" />
          <SyllabusDocumentPreview v-else-if="data" :presentation="data.presentation" :sections="previewSections" :changed="highlight ? changedFields : noChanges" />
        </main>
      </ScrollArea>
      <div v-if="marks.length" class="pointer-events-none absolute inset-y-0 right-3 hidden w-3 lg:block" aria-label="Cambios en el documento">
        <Button
          v-for="(mark, index) in marks"
          :key="index"
          type="button"
          variant="ghost"
          class="pointer-events-auto absolute right-0 h-1.5 min-h-0 w-3 rounded-full bg-warning p-0 hover:bg-warning"
          :style="{ top: `${mark.top}%` }"
          :aria-label="`Ir al cambio ${index + 1}`"
          @click="goTo(mark.element)"
        />
      </div>
    </div>
    <aside class="flex w-full shrink-0 flex-col border-t bg-card lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:w-80 lg:border-t-0 lg:border-l" aria-label="Historial de versiones">
      <div v-if="loading && !data" class="flex flex-col gap-1 p-4" role="status" aria-label="Cargando versiones" data-skeleton="history-versions">
        <div class="flex h-6 items-center pb-2"><Skeleton class="h-5 w-44" /></div>
        <section v-for="day in 2" :key="day" class="flex flex-col gap-1">
          <div class="flex h-9 items-end pb-1"><Skeleton class="h-4 w-32" /></div>
          <div v-for="version in 2" :key="version" class="flex flex-col gap-1.5 px-3 py-2">
            <Skeleton class="h-4 w-44" />
            <Skeleton class="h-3.5 w-12" />
          </div>
        </section>
      </div>
      <h2 v-else class="p-4 pb-2 text-base font-medium">Historial de versiones</h2>
      <ScrollArea v-if="data" type="auto" class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-6.5rem)]">
        <div class="flex flex-col gap-1 px-4 pb-4">
          <section v-for="day in days" :key="day.label" class="flex flex-col gap-1">
            <h3 class="pt-3 pb-1 text-sm text-muted-foreground">{{ capitalized(day.label) }}</h3>
            <div v-for="version in day.versions" :key="version.id" class="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                :class="cn('h-auto w-full flex-col items-start justify-start gap-0.5 rounded-md border border-transparent px-3 py-2 text-left text-sm font-normal whitespace-normal', version.id === selected?.id && 'border-ring bg-accent')"
                :aria-current="version.id === selected?.id ? 'true' : undefined"
                @click="select(version.id)"
              >
                <span class="flex w-full items-center justify-between gap-2">
                  <span class="font-medium">Versión {{ version.number }} · {{ versionLabel(version) }}</span>
                  <Badge v-if="version.current" variant="secondary">Versión actual</Badge>
                </span>
                <span class="text-muted-foreground">{{ time(version.at) }}</span>
              </Button>
              <ul v-if="version.events.length" class="ml-5 flex flex-col gap-2 border-l py-2 pl-4 text-sm">
                <li v-for="(event, index) in version.events" :key="`${event.kind}-${index}`" class="flex flex-col">
                  <span>{{ eventText(event) }}</span>
                  <ul v-if="event.comment && event.kind === 'devuelto_biblioteca'" class="list-disc pl-4 text-muted-foreground">
                    <li v-for="line in libraryCommentLines(event.comment)" :key="line">{{ line }}</li>
                  </ul>
                  <span v-else-if="event.comment" class="text-muted-foreground">«{{ event.comment }}»</span>
                  <span class="text-xs text-muted-foreground">{{ time(event.at) }}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  </div>
</template>
