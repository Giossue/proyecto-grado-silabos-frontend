<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowDown, ArrowUp, Pencil, Plus, Settings, TableProperties, Trash2 } from "@lucide/vue";
import type { CSSProperties } from "vue";
import type { TemplateAppearance, TemplateBlock, TemplatePayload } from "@/api/template";
import TemplateDocumentView from "@/components/domain/configuration/TemplateDocumentView.vue";
import PaginatedDocument from "@/components/domain/PaginatedDocument.vue";
import TemplateToolbarButton from "@/components/domain/configuration/TemplateToolbarButton.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultDocument, nodesOfType } from "@/lib/templateDocument";
import { templatePreviewFields } from "@/lib/templatePreview";

type Template = NonNullable<TemplatePayload["template"]>;
type Variable = NonNullable<TemplatePayload["variables"]>[number];
type Logos = NonNullable<TemplatePayload["logos"]>;
type Selection =
  | { kind: "document" }
  | { kind: "title" }
  | { kind: "section"; sectionId: string }
  | { kind: "field"; sectionId: string; blockId: string };

const props = withDefaults(defineProps<{
  template: Template;
  appearance: TemplateAppearance;
  variables: Variable[];
  logos?: Logos;
  identificationDesign?: Parameters<typeof defaultDocument>[1];
  readonly: boolean;
  ribbon?: boolean;
  fixedRibbon?: boolean;
  selectionTarget?: string;
}>(), { ribbon: false, fixedRibbon: false });

const emit = defineEmits<{
  personalize: [];
  "select-title": [];
  "select-section": [sectionId: string];
  "select-field": [sectionId: string, blockId: string];
  "edit-title": [];
  "edit-section": [sectionId: string];
  "edit-field": [blockId: string];
  "delete-section": [sectionId: string];
  "delete-field": [blockId: string];
  "edit-table": [blockId: string];
  "move-section": [sectionId: string, direction: -1 | 1];
  "move-field": [sectionId: string, blockId: string, direction: -1 | 1];
  "add-field": [sectionId: string];
  "add-block": [sectionId: string];
}>();

const selection = ref<Selection>({ kind: "document" });
const activeTable = ref<string | null>(null);
const insertOpen = ref(false);
const variableSamples = computed(() => Object.fromEntries(props.variables.map((item) => [item.key, item.sample])));
const orientation = computed(() => props.appearance.orientation === "landscape" ? "landscape" : "portrait");
const textAlign = computed(() => {
  const value = props.appearance.body_alignment;
  return value === "center" || value === "right" || value === "justify" ? value : "left";
});
const selectedSection = computed(() => {
  const id = selection.value.kind === "section" || selection.value.kind === "field"
    ? selection.value.sectionId
    : null;
  return props.template.sections.find((item) => item.id === id) ?? null;
});
const selectedBlock = computed(() => {
  if (selection.value.kind !== "field") return null;
  const blockId = selection.value.blockId;
  return selectedSection.value?.blocks.find((item) => item.id === blockId) ?? null;
});
const selectionLabel = computed(() => {
  if (selection.value.kind === "title") return `Título · ${props.template.titleBlock.text}`;
  if (selectedBlock.value) return `Campo · ${selectedBlock.value.title}`;
  if (selectedSection.value) return `Bloque · ${selectedSection.value.title}`;
  return "Ningún elemento seleccionado";
});
const titleStyle = computed<CSSProperties>(() => ({
  color: props.appearance.accent_color,
  fontFamily: props.appearance.font_family,
  fontSize: `${props.appearance.title_font_size}pt`,
  fontWeight: props.appearance.title_bold ? "700" : "400",
  fontStyle: props.appearance.title_italic ? "italic" : "normal",
  textAlign: props.appearance.title_alignment as CSSProperties["textAlign"],
}));
const sectionStyle = computed<CSSProperties>(() => ({
  color: props.appearance.text_color,
  fontFamily: props.appearance.font_family,
  fontSize: `${props.appearance.section_font_size}pt`,
  fontWeight: props.appearance.section_bold ? "700" : "400",
  fontStyle: props.appearance.section_italic ? "italic" : "normal",
  textAlign: props.appearance.section_alignment as CSSProperties["textAlign"],
}));
const fieldStyle = computed<CSSProperties>(() => ({
  color: props.appearance.text_color,
  fontFamily: props.appearance.font_family,
  fontSize: `${props.appearance.field_font_size}pt`,
}));
const documentFor = (block: TemplateBlock) => block.document ?? defaultDocument(
  block,
  props.identificationDesign ?? { type: "doc", content: [] },
);
const fieldsFor = (block: TemplateBlock) => templatePreviewFields(block.fields, block.table);
const hasTable = (block: TemplateBlock) => nodesOfType(documentFor(block), "table").length > 0;
const selectTitle = () => {
  if (props.readonly || activeTable.value) return;
  selection.value = { kind: "title" };
  emit("select-title");
};
const selectSection = (sectionId: string) => {
  if (props.readonly || activeTable.value) return;
  selection.value = { kind: "section", sectionId };
  emit("select-section", sectionId);
};
const selectField = (sectionId: string, blockId: string) => {
  if (props.readonly || (activeTable.value && activeTable.value !== blockId)) return;
  selection.value = { kind: "field", sectionId, blockId };
  emit("select-field", sectionId, blockId);
};
const clearSelection = (event: PointerEvent) => {
  if (props.readonly || activeTable.value) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest("[data-template-selectable]") || target.closest("#template-editor-ribbon")) return;
  selection.value = { kind: "document" };
};
</script>

<template>
  <TooltipProvider>
  <div
    class="min-w-0"
    :aria-label="readonly ? 'Plantilla del sílabo, solo lectura' : 'Constructor visual de la plantilla del sílabo'"
    @pointerdown.capture="clearSelection"
  >
    <Teleport to="body" :disabled="!fixedRibbon">
      <div
        v-if="ribbon && !readonly"
        id="template-editor-ribbon"
        class="min-w-0 border-b bg-background/95 shadow-sm backdrop-blur"
        :class="fixedRibbon ? 'fixed inset-x-0 top-12 z-40' : 'sticky top-2 z-20 mb-4 rounded-lg border'"
      >
        <div class="flex min-h-14 min-w-0 items-center gap-2 overflow-x-auto px-3 py-2 sm:px-5">
          <Badge variant="secondary" class="max-w-64 shrink-0 gap-1.5 px-2.5 py-1 font-normal">
            <span class="text-muted-foreground">Selección:</span>
            <span class="truncate font-medium text-foreground">{{ selectionLabel }}</span>
          </Badge>
          <div class="flex min-w-0 shrink-0 items-center gap-1.5">
            <Button v-if="selection.kind === 'title'" type="button" variant="ghost" size="sm" @click="emit('edit-title')"><Pencil data-icon="inline-start" aria-hidden="true" />Editar título</Button>
            <template v-if="selectedSection && selection.kind === 'section'">
              <Button type="button" variant="ghost" size="sm" @click="emit('edit-section', selectedSection.id)"><Pencil data-icon="inline-start" aria-hidden="true" />Renombrar bloque</Button>
              <Button type="button" variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="emit('delete-section', selectedSection.id)"><Trash2 data-icon="inline-start" aria-hidden="true" />Eliminar bloque</Button>
            </template>
            <template v-if="selectedBlock && selection.kind === 'field'">
              <Button v-if="hasTable(selectedBlock)" type="button" variant="ghost" size="sm" @click="emit('edit-table', selectedBlock.id)"><TableProperties data-icon="inline-start" aria-hidden="true" />Editar tabla</Button>
              <Button type="button" variant="ghost" size="sm" @click="emit('edit-field', selectedBlock.id)"><Pencil data-icon="inline-start" aria-hidden="true" />Editar campo</Button>
              <Button type="button" variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="emit('delete-field', selectedBlock.id)"><Trash2 data-icon="inline-start" aria-hidden="true" />Eliminar campo</Button>
            </template>
          </div>
          <div class="ml-auto flex shrink-0 items-center gap-1.5">
            <Button v-if="!activeTable" type="button" variant="ghost" size="sm" @click="emit('personalize')"><Settings data-icon="inline-start" aria-hidden="true" />Documento</Button>
          </div>
        </div>
      </div>
    </Teleport>

    <div class="min-w-0 overflow-x-auto p-1 pb-4">
      <PaginatedDocument
        :orientation="orientation"
        :margin-cm="appearance.margin_cm"
        :font-family="appearance.font_family"
        :font-size="appearance.body_font_size"
        :text-color="appearance.text_color"
      >
        <div class="mb-5 flex w-full items-center justify-between gap-6" :style="{ marginTop: `-${appearance.margin_cm * 0.4}cm` }" data-page-unit data-page-keep-next>
          <div class="flex min-w-0 flex-1 justify-start"><img v-if="logos?.institution" :src="logos.institution" alt="Universidad Estatal de Bolívar" class="h-auto max-h-10 max-w-full object-contain object-left" /></div>
          <div class="flex min-w-0 flex-1 justify-end"><img v-if="logos?.faculty" :src="logos.faculty" alt="Logo de facultad" class="h-auto max-h-14 max-w-full object-contain object-right" /></div>
        </div>

        <div
          v-if="!readonly"
          class="mb-8 rounded-xs leading-tight outline-offset-4 transition-shadow"
          :class="{ 'cursor-pointer outline-2 outline-primary': selection.kind === 'title' }"
          :aria-label="`Título ${template.titleBlock.text}`"
          role="button"
          :aria-pressed="selection.kind === 'title'"
          tabindex="0"
          data-template-selectable="title"
          data-page-unit
          data-page-keep-next
          @pointerdown.stop="selectTitle"
          @keydown.enter.self="selectTitle"
        ><h1 :style="titleStyle">{{ template.titleBlock.text }}</h1></div>
        <h1 v-else class="mb-8 leading-tight" :style="titleStyle" data-page-unit data-page-keep-next>{{ template.titleBlock.text }}</h1>

        <div v-if="template.sections.length === 0" class="flex min-h-80 items-center justify-center" data-page-unit>
          <p class="text-center text-muted-foreground">La plantilla todavía no tiene bloques.</p>
        </div>
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
        <section
          v-for="(section, sectionIndex) in template.sections"
          :key="section.id"
          data-template-selectable="section"
          class="relative mb-6 rounded-none outline-offset-4 transition-shadow"
          :class="{ 'cursor-pointer outline-2 outline-primary': !readonly && selection.kind === 'section' && selection.sectionId === section.id }"
          :aria-label="`Bloque ${section.title}`"
          :role="readonly ? undefined : 'button'"
          :aria-pressed="readonly ? undefined : selection.kind === 'section' && selection.sectionId === section.id"
          :tabindex="readonly ? undefined : 0"
          @pointerdown="selectSection(section.id)"
          @keydown.enter.self="selectSection(section.id)"
        >
          <h2 :id="`template-section-${section.id}`" class="mb-3 min-w-0 scroll-mt-40 leading-snug" :style="sectionStyle" data-page-unit data-page-keep-next tabindex="-1">{{ sectionIndex + 1 }}. {{ section.title }}</h2>
          <p v-if="section.blocks.length === 0" class="mb-3 text-sm text-muted-foreground" data-page-unit>Este bloque todavía no tiene campos.</p>
          <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
          <article
            v-for="(block, fieldIndex) in section.blocks"
            :key="block.id"
            :id="`template-field-${block.id}`"
            data-template-selectable="field"
            class="relative mb-4 scroll-mt-40 rounded-none outline-offset-4 transition-shadow"
            :class="{ 'cursor-pointer outline-2 outline-primary': !readonly && !activeTable && selection.kind === 'field' && selection.blockId === block.id }"
            :aria-label="`Campo ${block.title}`"
            :role="readonly || activeTable ? undefined : 'button'"
            :tabindex="readonly || activeTable ? undefined : 0"
            @pointerdown="(event) => { event.stopPropagation(); selectField(section.id, block.id); }"
            @keydown.enter.self="selectField(section.id, block.id)"
          >
            <h3 v-if="section.blocks.length > 1" class="mb-2 leading-snug font-semibold" :style="fieldStyle" data-page-unit data-page-keep-next tabindex="-1">{{ sectionIndex + 1 }}.{{ fieldIndex + 1 }} {{ block.title }}</h3>
            <TemplateDocumentView
              :document="documentFor(block)"
              :fields="fieldsFor(block)"
              :variables="variableSamples"
              :layout="block.table"
              :font-family="appearance.font_family"
              :font-size="appearance.body_font_size"
              :text-color="appearance.text_color"
              :text-align="textAlign"
              :table-header-background="appearance.table_header_background"
              :table-header-color="appearance.table_header_color"
              preview
            />
            <div v-if="!readonly && selection.kind === 'field' && selection.blockId === block.id" class="absolute top-1/2 -right-1 z-10 flex h-7 translate-x-1/2 -translate-y-1/2 items-center gap-1" data-template-actions @pointerdown.stop @click.stop>
              <Popover v-model:open="insertOpen">
                <PopoverTrigger as-child><Button type="button" size="icon-sm" class="size-7 rounded-full p-0 shadow-md" aria-label="Agregar contenido"><Plus aria-hidden="true" /></Button></PopoverTrigger>
                <PopoverContent align="center" class="w-44 p-1.5">
                  <div class="flex flex-col gap-1">
                    <Button type="button" variant="ghost" size="sm" class="justify-start" @click="insertOpen = false; emit('add-field', section.id)"><Plus aria-hidden="true" />Agregar campo</Button>
                    <Button type="button" variant="ghost" size="sm" class="justify-start" @click="insertOpen = false; emit('add-block', section.id)"><Plus aria-hidden="true" />Agregar bloque</Button>
                  </div>
                </PopoverContent>
              </Popover>
              <TemplateToolbarButton label="Mover campo arriba" variant="outline" :disabled="fieldIndex === 0" @click="emit('move-field', section.id, block.id, -1)"><ArrowUp aria-hidden="true" /></TemplateToolbarButton>
              <TemplateToolbarButton label="Mover campo abajo" variant="outline" :disabled="fieldIndex === section.blocks.length - 1" @click="emit('move-field', section.id, block.id, 1)"><ArrowDown aria-hidden="true" /></TemplateToolbarButton>
            </div>
          </article>
          <div v-if="!readonly && selection.kind === 'section' && selection.sectionId === section.id" class="absolute top-1/2 -right-1 z-10 flex h-7 translate-x-1/2 -translate-y-1/2 items-center gap-1" data-template-actions @pointerdown.stop @click.stop>
            <Popover v-model:open="insertOpen">
              <PopoverTrigger as-child><Button type="button" size="icon-sm" class="size-7 rounded-full p-0 shadow-md" aria-label="Agregar contenido"><Plus aria-hidden="true" /></Button></PopoverTrigger>
              <PopoverContent align="center" class="w-44 p-1.5">
                <div class="flex flex-col gap-1">
                  <Button type="button" variant="ghost" size="sm" class="justify-start" @click="insertOpen = false; emit('add-field', section.id)"><Plus aria-hidden="true" />Agregar campo</Button>
                  <Button type="button" variant="ghost" size="sm" class="justify-start" @click="insertOpen = false; emit('add-block', section.id)"><Plus aria-hidden="true" />Agregar bloque</Button>
                </div>
              </PopoverContent>
            </Popover>
            <TemplateToolbarButton label="Mover bloque arriba" variant="outline" :disabled="sectionIndex === 0" @click="emit('move-section', section.id, -1)"><ArrowUp aria-hidden="true" /></TemplateToolbarButton>
            <TemplateToolbarButton label="Mover bloque abajo" variant="outline" :disabled="sectionIndex === template.sections.length - 1" @click="emit('move-section', section.id, 1)"><ArrowDown aria-hidden="true" /></TemplateToolbarButton>
          </div>
        </section>
      </PaginatedDocument>
    </div>
  </div>
  </TooltipProvider>
</template>
