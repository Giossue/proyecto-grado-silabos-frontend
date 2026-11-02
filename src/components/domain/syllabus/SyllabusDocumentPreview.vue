<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { DocumentPresentation } from '@/api/syllabi';
import type { DocumentField } from '@/types/configuration';
import { paginateSheet } from '@/components/domain/configuration/templatePagination';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import { documentLayout, layoutStyle, sheetPixels } from '@/lib/documentLayout';
import { cn } from '@/lib/utils';

export type PreviewSection = {
    id: string;
    title: string;
    orientation?: 'portrait' | 'landscape';
    fields: Array<Pick<DocumentField, 'label' | 'value' | 'document'> & { id: string; key?: string }>;
};

const props = defineProps<{ presentation: DocumentPresentation; sections: PreviewSection[]; changed?: ReadonlySet<string> }>();
const isChanged = (sectionId: string, field: PreviewSection['fields'][number]): boolean => props.changed?.has(`${sectionId}.${field.key ?? field.id}`) === true;

const root = ref<HTMLElement | null>(null);
const available = ref(0);
const sheetElements = new Map<number, HTMLElement>();
let resizeObserver: ResizeObserver | null = null;
let frame = 0;

const layout = computed(() => layoutStyle(props.presentation.document ? documentLayout(props.presentation.document) : props.presentation.appearance, props.presentation.document));
const sheetPx = computed(() => sheetPixels(props.presentation.document));
const sheets = computed(() => {
    const groups: Array<{ landscape: boolean; items: PreviewSection[] }> = [];
    for (const section of props.sections) {
        const landscape = section.orientation === 'landscape';
        const last = groups[groups.length - 1];
        if (last && last.landscape === landscape) last.items.push(section);
        else groups.push({ landscape, items: [section] });
    }

    return groups.length > 0 ? groups : [{ landscape: false, items: [] }];
});
const scaleFor = (landscape: boolean): number => {
    const width = landscape ? sheetPx.value.landscape : sheetPx.value.portrait;

    return available.value > 0 ? Math.min(1, available.value / width) : 1;
};
const setSheet = (index: number, element: unknown): void => {
    if (element instanceof HTMLElement) sheetElements.set(index, element);
    else sheetElements.delete(index);
};
const paginate = (): void => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
        sheetElements.forEach((element, index) => paginateSheet(element, sheets.value[index]?.landscape ?? false, props.presentation.document));
    });
};

onMounted(() => {
    if (root.value && typeof ResizeObserver !== 'undefined') {
        available.value = root.value.clientWidth;
        resizeObserver = new ResizeObserver(() => {
            available.value = root.value?.clientWidth ?? 0;
            paginate();
        });
        resizeObserver.observe(root.value);
    }
    void nextTick(paginate);
    void document.fonts?.ready.then(paginate);
});
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    cancelAnimationFrame(frame);
});
watch(() => [props.sections, props.presentation, props.changed], () => { void nextTick(paginate); }, { deep: true });
</script>

<template>
  <div ref="root" class="flex min-w-0 flex-col gap-4" role="region" aria-label="Vista previa del sílabo">
    <div v-for="(sheet, sheetIndex) in sheets" :key="sheetIndex" class="min-w-0 overflow-x-auto">
      <article :ref="(element) => setSheet(sheetIndex, element)" data-sheet data-preview="true" :style="{ zoom: scaleFor(sheet.landscape), ...layout }" :class="cn('template-sheet relative', sheet.landscape && 'template-sheet--landscape')">
        <div data-sheet-content class="flex flex-col gap-6">
          <header v-if="sheetIndex === 0" class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-4">
              <img :src="presentation.logos.institution" alt="Logo de la universidad" class="h-12 w-auto object-contain" @load="paginate">
              <img :src="presentation.logos.faculty" alt="Logo de la facultad" class="h-12 w-auto object-contain" @load="paginate">
            </div>
            <h2 class="template-sheet-title px-2 py-1">{{ presentation.title }}</h2>
          </header>
          <section v-for="section in sheet.items" :key="section.id" class="flex min-w-0 flex-col gap-3" :data-section="section.id">
            <h3 class="font-bold" data-section-title>{{ section.title }}</h3>
            <ol class="flex flex-col gap-3">
              <li v-for="field in section.fields" :key="field.id" :data-field="field.id" :data-changed="isChanged(section.id, field) || undefined" :class="cn('relative min-w-0 px-2 py-1', isChanged(section.id, field) && 'rounded-md bg-warning/10 ring-2 ring-warning/60')">
                <span v-if="isChanged(section.id, field)" class="absolute -top-2.5 right-2 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground" data-change-mark>Cambió</span>
                <div class="flex min-w-0 flex-col gap-1">
                  <div v-if="field.label.trim() && field.label.trim().toLowerCase() !== section.title.trim().toLowerCase()" data-field-label><h4 class="min-w-0 font-bold [overflow-wrap:anywhere]">{{ field.label }}</h4></div>
                  <div data-field-body><FreeTextContent :value="field.document ?? field.value" empty-text="Sin completar" /></div>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </article>
    </div>
  </div>
</template>
