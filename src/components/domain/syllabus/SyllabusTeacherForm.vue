<script setup lang="ts">
import { ArrowLeft, ArrowRight } from '@lucide/vue';
import { computed, nextTick } from 'vue';
import type { SyllabusDetail, SyllabusField } from '@/api/syllabi';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import FieldView from '@/components/domain/syllabus/FieldView.vue';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { responseDocument } from '@/lib/fieldResponses';
import { syllabusConditions } from '@/lib/responseConditions';
import { fieldTitle, isTeacherField } from '@/lib/syllabusForm';
import type { DocumentNode } from '@/lib/templateDocument';
import { responsibleLabel } from '@/types/configuration';

/** El formulario del sílabo tal como lo llena el docente: pestañas por sección, un acordeón por campo. */
type Section = SyllabusDetail['sections'][number];

const props = withDefaults(defineProps<{ sections: Section[]; disabled?: boolean; errors?: (fieldId: string) => string[] }>(), {
  disabled: false,
  errors: () => [],
});
const emit = defineEmits<{ 'update:value': [field: SyllabusField, value: DocumentNode] }>();
const activeSectionId = defineModel<string>('active', { default: '' });
// Cada campo es un acordeón que arranca abierto; se guardan solo los que se cerraron.
const collapsed = defineModel<Set<string>>('collapsed', { default: () => new Set() });

const conditions = computed(() => syllabusConditions(props.sections, (field) => field.template ? responseDocument(field.template, field.value) : field.value));
const shownFields = (section: Section): SyllabusField[] => section.fields.filter((field) => !conditions.value.hidden.has(field.key));
const visibleSections = computed(() => props.sections.filter((section) => shownFields(section).some(isTeacherField)));
const currentId = computed(() => visibleSections.value.find((section) => section.id === activeSectionId.value)?.id ?? visibleSections.value[0]?.id ?? '');
const shownSections = computed(() => visibleSections.value.filter((section) => section.id === currentId.value));
const position = computed(() => visibleSections.value.findIndex((section) => section.id === currentId.value));
const previousSection = computed(() => visibleSections.value[position.value - 1] ?? null);
const nextSection = computed(() => visibleSections.value[position.value + 1] ?? null);
const goToSection = async (id: string): Promise<void> => {
  activeSectionId.value = id;
  await nextTick();
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
const openFields = (section: Section): string[] => section.fields.map((field) => field.id).filter((id) => !collapsed.value.has(id));
const setOpenFields = (section: Section, open: string[]): void => {
  const next = new Set(collapsed.value);
  for (const { id } of section.fields) {
    if (open.includes(id)) next.delete(id); else next.add(id);
  }
  collapsed.value = next;
};
const fieldErrors = (fieldId: string): string[] => props.errors(fieldId);
</script>

<template>
  <Tabs v-if="visibleSections.length > 1" :model-value="currentId" class="w-full shrink-0" @update:model-value="activeSectionId = String($event)">
    <TabsList class="h-auto w-full flex-wrap justify-start" aria-label="Secciones del sílabo">
      <Tooltip v-for="section in visibleSections" :key="section.id"><TooltipTrigger as-child><TabsTrigger :value="section.id" class="h-10 max-w-64 flex-none px-4 data-[state=active]:font-semibold"><span class="truncate">{{ section.title }}</span></TabsTrigger></TooltipTrigger><TooltipContent>{{ section.title }}</TooltipContent></Tooltip>
    </TabsList>
  </Tabs>
  <section v-for="section in shownSections" :id="`section-${section.id}`" :key="section.id" class="teacher-form flex scroll-mt-6 flex-col gap-6 rounded-md bg-card px-6 py-6 text-card-foreground shadow-surface ring-1 ring-surface-ring">
    <header class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ section.title }}</h2><p v-if="section.description" class="text-sm text-muted-foreground">{{ section.description }}</p></header>
    <FieldGroup>
      <Accordion type="multiple" class="-mx-1" :model-value="openFields(section)" @update:model-value="setOpenFields(section, $event as string[])">
        <AccordionItem v-for="field in shownFields(section)" :key="field.id" :value="field.id" :data-field-key="field.key">
          <!-- Un campo sin nombre en la plantilla se muestra sin título, igual que en la plantilla. -->
          <AccordionTrigger v-if="field.label.trim()" class="items-center px-1 hover:no-underline">
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold">{{ fieldTitle(field, section) }}</span>
              <span v-if="isTeacherField(field)" class="text-destructive" aria-hidden="true">*</span>
              <Badge v-else variant="outline" class="font-normal">{{ responsibleLabel(field.quien_llena) }}</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent class="flex flex-col gap-3 px-1 pt-1">
            <Field v-if="isTeacherField(field)" :id="`field-${field.id}`" :data-invalid="fieldErrors(field.id).length > 0">
              <FieldLabel :for="`input-${field.id}`" required class="sr-only">{{ fieldTitle(field, section) }}</FieldLabel>
              <FieldResponseEditor required :template="field.template" :label="fieldTitle(field, section)" :model-value="field.value" :id="`input-${field.id}`" :disabled="disabled" :answers="conditions.answers" @update:model-value="emit('update:value', field, $event)" />
            </Field>
            <FieldView v-else :id="`field-${field.id}`" :field="field" bare />
            <FieldError :errors="fieldErrors(field.id)" />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </FieldGroup>
  </section>
  <nav v-if="previousSection || nextSection" class="-mt-4 flex items-center justify-between gap-2" aria-label="Secciones anterior y siguiente">
    <Button v-if="previousSection" type="button" variant="outline" @click="goToSection(previousSection.id)"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Anterior</Button>
    <span v-else />
    <Button v-if="nextSection" type="button" variant="outline" @click="goToSection(nextSection.id)">Siguiente<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
  </nav>
</template>
