<script setup lang="ts">
import { ArrowDown, ArrowUp, Pencil, Plus, Settings2, Sparkles, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import type { SectionDesign, TemplateField, TemplatePayload, TemplateSectionPayload } from '@/api/template';
import { deleteField, deleteSection, reorderFields, reorderSections } from '@/api/template-structure';
import TemplateLogoControl from '@/components/domain/configuration/TemplateLogoControl.vue';
import TemplateFieldDialog from '@/components/domain/configuration/TemplateFieldDialog.vue';
import TemplateSectionDialog from '@/components/domain/configuration/TemplateSectionDialog.vue';
import { apiMessage } from '@/components/domain/configuration/templateStructure';
import TemplateTitleActions from '@/components/domain/configuration/TemplateTitleActions.vue';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldTypeEntry, sectionFields } from '@/components/domain/fieldTypes/registry';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { TypedField } from '@/types/configuration';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/** Constructor de la plantilla dibujado como hoja A4 con controles sobre lo seleccionado (I-195, etapa 7). */
const props = defineProps<{ template: NonNullable<TemplatePayload['template']>; processLock?: string | null; logos?: TemplatePayload['logos']; designs?: SectionDesign[]; canFormat?: boolean; formatting?: boolean }>();
const emit = defineEmits<{ changed: []; format: [] }>();

type Editable = { openEdit: () => void };
const titleActions = ref<Editable | null>(null);
const locked = computed(() => Boolean(props.processLock));
const selectedField = ref<string | null>(null);
const selectedSection = ref<string | null>(null);
const selectField = (id: string): void => { selectedField.value = id; selectedSection.value = null; };
const selectSection = (id: string): void => { selectedSection.value = id; selectedField.value = null; };
const typed = (field: TemplateField): TypedField => ({ id: field.id, key: field.key, label: field.label, help: field.help, type: field.type, config: field.config, value: null, document: field.document ?? null });
const busy = ref(false);
const error = ref<string | null>(null);

const sections = computed(() => props.template.sections.map((section) => ({ section, fields: sectionFields(section) })));
const usedSectionKeys = computed(() => props.template.sections.map((section) => section.key));
const usedFieldKeys = computed(() => sections.value.flatMap((entry) => entry.fields.map((field) => field.key)));

const sectionDialog = ref<{ open: boolean; section: TemplateSectionPayload | null }>({ open: false, section: null });
const fieldDialog = ref<{ open: boolean; sectionId: string; field: TemplateField | null }>({ open: false, sectionId: '', field: null });
const removal = ref<{ kind: 'section' | 'field'; id: string; name: string; count: number } | null>(null);

const run = async (action: () => Promise<unknown>, fallback: string): Promise<void> => {
    if (busy.value) return;
    busy.value = true;
    error.value = null;
    try {
        await action();
        emit('changed');
    } catch (reason) {
        error.value = apiMessage(reason, fallback);
    } finally {
        busy.value = false;
    }
};

const moved = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + direction, 0, item!);
    return next;
};
const moveSection = (index: number, direction: -1 | 1): Promise<void> =>
    run(() => reorderSections(props.template.id, moved(props.template.sections, index, direction).map((section) => section.id)), 'No se pudo cambiar el orden.');
const moveField = (sectionId: string, fields: TemplateField[], index: number, direction: -1 | 1): Promise<void> =>
    run(() => reorderFields(props.template.id, sectionId, moved(fields, index, direction).map((field) => field.id)), 'No se pudo cambiar el orden.');

const confirmRemoval = (): Promise<void> => {
    const target = removal.value;
    if (!target) return Promise.resolve();
    return run(async () => {
        if (target.kind === 'section') await deleteSection(props.template.id, target.id);
        else await deleteField(props.template.id, target.id);
        toast.success(target.kind === 'section' ? 'Sección eliminada.' : 'Campo eliminado.');
        removal.value = null;
    }, 'No se pudo eliminar.');
};

const fieldName = (field: TemplateField): string => field.label.trim() || 'Campo sin nombre';
const boxed = (field: TemplateField): boolean => ['texto', 'ficha', 'fijo'].includes(field.type);
const typeLabel = (field: TemplateField): string => fieldTypeEntry(field.type)?.adminLabel ?? field.type;
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4" aria-label="Constructor visual de la plantilla del sílabo" role="region">
    <Alert v-if="locked" role="status" class="mx-auto max-w-3xl"><AlertDescription>Hay un proceso abierto: la plantilla no se puede cambiar hasta pausarlo o cerrarlo. Puede revisar la estructura.</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive" role="alert" class="mx-auto max-w-3xl"><AlertDescription>{{ error }}</AlertDescription></Alert>

    <article data-sheet class="template-sheet">
      <header class="flex flex-col gap-3">
        <div v-if="logos" class="flex items-center justify-between gap-4">
          <TemplateLogoControl :logo-url="logos.institution" :disabled="locked" />
          <img :src="logos.faculty" alt="Logo de la facultad" class="max-h-12 object-contain">
        </div>
        <div class="group relative flex items-center justify-center rounded-sm px-2 py-1 outline-offset-2 hover:outline hover:outline-1 hover:outline-primary/40">
          <h2 class="template-sheet-title">{{ template.titleBlock.text }}</h2>
          <Button type="button" variant="outline" size="sm" class="absolute -top-3 right-0 bg-background opacity-0 group-hover:opacity-100 focus-visible:opacity-100" :disabled="locked" @click="titleActions?.openEdit()"><Pencil data-icon="inline-start" aria-hidden="true" />Editar título</Button>
        </div>
      </header>
      <TemplateTitleActions ref="titleActions" :template-id="template.id" :title="template.titleBlock.text" />

      <div v-if="sections.length === 0" class="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border p-8 text-center">
        <p class="text-base font-medium">Esta hoja está en blanco</p>
        <p class="max-w-sm text-sm text-muted-foreground">La plantilla no tiene secciones. Cargue el formato oficial o agregue la primera sección.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <Button v-if="canFormat" type="button" :disabled="locked || formatting" @click="emit('format')"><Sparkles data-icon="inline-start" aria-hidden="true" />Cargar formato oficial UEB</Button>
          <Button type="button" :variant="canFormat ? 'outline' : 'default'" :disabled="locked" @click="sectionDialog = { open: true, section: null }"><Plus data-icon="inline-start" aria-hidden="true" />Nueva sección</Button>
        </div>
      </div>

      <section v-for="({ section, fields }, sectionIndex) in sections" :key="section.id" :data-section="section.id" class="flex min-w-0 flex-col gap-3">
        <div :class="cn('group relative rounded-sm px-1 pb-1 outline-offset-2', selectedSection === section.id ? 'outline outline-2 outline-primary' : 'hover:outline hover:outline-1 hover:outline-primary/40')">
          <Button type="button" variant="ghost" class="h-auto w-full min-w-0 justify-start whitespace-normal px-0 py-0 text-left font-bold [overflow-wrap:anywhere] hover:bg-transparent" :aria-pressed="selectedSection === section.id" :aria-label="`Sección ${section.title}`" @click="selectSection(section.id)">{{ sectionIndex + 1 }}. {{ section.title }}</Button>
          <div :class="cn('absolute -top-4 right-0 z-10 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm focus-within:opacity-100 group-hover:opacity-100', selectedSection === section.id ? 'opacity-100' : 'opacity-0')">
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === 0" :aria-label="`Subir la sección ${section.title}`" @click="moveSection(sectionIndex, -1)"><ArrowUp aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === sections.length - 1" :aria-label="`Bajar la sección ${section.title}`" @click="moveSection(sectionIndex, 1)"><ArrowDown aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Renombrar la sección ${section.title}`" @click="sectionDialog = { open: true, section }"><Pencil aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar la sección ${section.title}`" @click="removal = { kind: 'section', id: section.id, name: section.title, count: fields.length }"><Trash2 aria-hidden="true" /></Button>
          </div>
        </div>

        <ol class="flex flex-col gap-3">
          <li v-for="(field, fieldIndex) in fields" :key="field.id" :data-field="field.id" :class="cn('group relative min-w-0 rounded-sm px-2 py-1 outline-offset-2', selectedField === field.id ? 'outline outline-2 outline-primary' : field.label.trim() ? 'hover:outline hover:outline-1 hover:outline-primary/40' : 'outline outline-1 outline-dashed outline-muted-foreground')">
            <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -->
            <Button as="div" variant="ghost" role="button" tabindex="0" class="h-auto w-full min-w-0 cursor-pointer flex-col items-stretch gap-1 whitespace-normal rounded-sm p-0 text-left font-normal hover:bg-transparent" :aria-pressed="selectedField === field.id" :aria-label="`Campo ${fieldName(field)}`" @click="selectField(field.id)" @keydown.enter.self.prevent="selectField(field.id)" @keydown.space.self.prevent="selectField(field.id)">
              <div class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <h4 v-if="field.label.trim()" class="min-w-0 break-words font-bold [overflow-wrap:anywhere]">{{ field.label }}</h4>
                <span v-else class="text-xs italic text-muted-foreground">Campo sin nombre</span>
                <span class="ml-auto max-w-full shrink-0 rounded bg-muted px-1.5 py-0.5 text-left text-xs font-normal text-muted-foreground [overflow-wrap:anywhere]" data-field-type>{{ typeLabel(field) }}</span>
              </div>
              <div :class="cn('pointer-events-none min-w-0 max-w-full', boxed(field) && 'template-sheet-box')">
                <component :is="fieldTypeEntry(field.type)!.ViewComponent" v-if="fieldTypeEntry(field.type)" :field="typed(field)" />
                <FreeTextContent v-else :value="null" />
              </div>
            </Button>
            <div :class="cn('absolute -top-4 right-0 z-10 flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm focus-within:opacity-100 group-hover:opacity-100', selectedField === field.id ? 'opacity-100' : 'opacity-0')">
              <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || fieldIndex === 0" :aria-label="`Subir el campo ${fieldName(field)}`" @click="moveField(section.id, fields, fieldIndex, -1)"><ArrowUp aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || fieldIndex === fields.length - 1" :aria-label="`Bajar el campo ${fieldName(field)}`" @click="moveField(section.id, fields, fieldIndex, 1)"><ArrowDown aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Propiedades del campo ${fieldName(field)}`" @click="selectedField = field.id; fieldDialog = { open: true, sectionId: section.id, field }"><Settings2 aria-hidden="true" /></Button>
              <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar el campo ${fieldName(field)}`" @click="removal = { kind: 'field', id: field.id, name: fieldName(field), count: 0 }"><Trash2 aria-hidden="true" /></Button>
            </div>
          </li>
        </ol>
        <p v-if="fields.length === 0" class="text-sm text-muted-foreground">Sección sin campos.</p>
        <Button type="button" variant="outline" size="sm" class="self-start border-dashed" :disabled="locked" @click="fieldDialog = { open: true, sectionId: section.id, field: null }"><Plus data-icon="inline-start" aria-hidden="true" />Agregar campo</Button>
      </section>

      <Button v-if="sections.length > 0" type="button" variant="outline" class="self-start border-dashed" :disabled="locked" @click="sectionDialog = { open: true, section: null }"><Plus data-icon="inline-start" aria-hidden="true" />Nueva sección</Button>
    </article>

    <TemplateSectionDialog v-model:open="sectionDialog.open" :template-id="template.id" :section="sectionDialog.section" :used-section-keys="usedSectionKeys" :used-field-keys="usedFieldKeys" :designs="designs" @saved="emit('changed')" />
    <TemplateFieldDialog v-model:open="fieldDialog.open" :template-id="template.id" :section-id="fieldDialog.sectionId" :field="fieldDialog.field" :used-keys="usedFieldKeys" @saved="emit('changed')" />

    <Dialog :open="removal !== null" @update:open="(value: boolean) => { if (!value) removal = null }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ removal?.kind === 'section' ? 'Eliminar sección' : 'Eliminar campo' }}</DialogTitle>
          <DialogDescription>
            {{ removal?.kind === 'section' ? `Se quitará «${removal?.name}» con sus ${removal?.count} campos de la plantilla.` : `Se quitará «${removal?.name}» de la plantilla.` }}
            Los sílabos ya entregados conservan su propia copia.
          </DialogDescription>
        </DialogHeader>
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="busy" @click="removal = null">Cancelar</Button>
          <Button type="button" variant="destructive" :disabled="busy" @click="confirmRemoval"><Spinner v-if="busy" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
