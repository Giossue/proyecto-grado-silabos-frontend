<script setup lang="ts">
import { computed } from 'vue';
import type { TemplatePayload } from '@/api/template';
import { fieldTypeEntry, sectionFields } from '@/components/domain/fieldTypes/registry';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import type { TypedField } from '@/types/configuration';

/** El sílabo tal como lo verá el docente y el PDF, con las vistas de cada tipo; no se edita. */
const props = defineProps<{ template: NonNullable<TemplatePayload['template']>; logos?: TemplatePayload['logos'] }>();

const sections = computed(() => props.template.sections.map((section, index) => ({
    id: section.id,
    number: index + 1,
    title: section.title,
    fields: sectionFields(section).map((field): TypedField => ({ id: field.id, key: field.key, label: field.label, help: field.help, type: field.type, config: field.config, value: null })),
})));
const fieldNumber = (section: { fields: TypedField[] }, field: TypedField): number => section.fields.indexOf(field) + 1;
</script>

<template>
  <div class="template-stage">
  <article class="template-sheet" aria-label="Vista previa del sílabo">
    <header class="flex flex-col gap-4">
      <div v-if="logos" class="flex items-center justify-between gap-4">
        <img :src="logos.institution" alt="Logo de la universidad" class="max-h-12 object-contain">
        <img :src="logos.faculty" alt="Logo de la facultad" class="max-h-12 object-contain">
      </div>
      <h2 class="text-center text-lg font-bold uppercase">{{ template.titleBlock.text }}</h2>
    </header>
    <p v-if="sections.length === 0" class="text-sm text-muted-foreground">La plantilla todavía no tiene secciones.</p>
    <section v-for="section in sections" :key="section.id" :data-preview-section="section.id" class="flex flex-col gap-3">
      <h3 class="border-b pb-1 text-base font-bold">{{ section.number }}. {{ section.title }}</h3>
      <p v-if="section.fields.length === 0" class="text-sm text-muted-foreground">Sección sin campos.</p>
      <div v-for="field in section.fields" :key="field.id" class="flex flex-col gap-1" :data-preview-field="field.id">
        <h4 v-if="field.label.trim()" class="text-sm font-semibold">{{ section.number }}.{{ fieldNumber(section, field) }} {{ field.label }}</h4>
        <component :is="fieldTypeEntry(field.type)!.ViewComponent" v-if="fieldTypeEntry(field.type)" :field="field" />
        <FreeTextContent v-else :value="null" />
      </div>
    </section>
  </article>
  </div>
</template>
