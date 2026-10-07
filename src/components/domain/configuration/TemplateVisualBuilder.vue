<script setup lang="ts">
import { ArrowDown, ArrowUp, Pencil, Plus, Settings2, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import type { TemplateField, TemplatePayload, TemplateSectionPayload } from '@/api/template';
import { deleteField, deleteSection, reorderFields, reorderSections } from '@/api/template-structure';
import TemplateFieldDialog from '@/components/domain/configuration/TemplateFieldDialog.vue';
import TemplateSectionDialog from '@/components/domain/configuration/TemplateSectionDialog.vue';
import { apiMessage } from '@/components/domain/configuration/templateStructure';
import TemplateTitleActions from '@/components/domain/configuration/TemplateTitleActions.vue';
import { fieldTypeEntry, sectionFields } from '@/components/domain/fieldTypes/registry';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/** Constructor de la plantilla: secciones numeradas y, dentro, sus campos (I-195, etapa 7). */
const props = defineProps<{ template: NonNullable<TemplatePayload['template']>; processLock?: string | null }>();
const emit = defineEmits<{ changed: [] }>();

type Editable = { openEdit: () => void };
const titleActions = ref<Editable | null>(null);
const locked = computed(() => Boolean(props.processLock));
const selectedField = ref<string | null>(null);
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
const typeLabel = (field: TemplateField): string => fieldTypeEntry(field.type)?.adminLabel ?? field.type;
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-4" aria-label="Constructor visual de la plantilla del sílabo" role="region">
    <Alert v-if="locked" role="status"><AlertDescription>Hay un proceso abierto: la plantilla no se puede cambiar hasta pausarlo o cerrarlo. Puede revisar la estructura y la vista previa.</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>

    <div class="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3">
      <div class="min-w-0"><p class="text-xs text-muted-foreground">Título del sílabo</p><p class="truncate font-medium">{{ template.titleBlock.text }}</p></div>
      <Button type="button" variant="outline" size="sm" :disabled="locked" @click="titleActions?.openEdit()"><Pencil data-icon="inline-start" aria-hidden="true" />Editar título</Button>
    </div>
    <TemplateTitleActions ref="titleActions" :template-id="template.id" :title="template.titleBlock.text" />

    <p v-if="sections.length === 0" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">La plantilla no tiene secciones. Agregue la primera.</p>

    <section v-for="({ section, fields }, sectionIndex) in sections" :key="section.id" :data-section="section.id" class="flex flex-col gap-2 rounded-lg border p-3">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="min-w-0 flex-1 truncate text-base font-semibold">{{ sectionIndex + 1 }}. {{ section.title }}</h3>
        <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === 0" :aria-label="`Subir la sección ${section.title}`" @click="moveSection(sectionIndex, -1)"><ArrowUp aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || sectionIndex === sections.length - 1" :aria-label="`Bajar la sección ${section.title}`" @click="moveSection(sectionIndex, 1)"><ArrowDown aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Renombrar la sección ${section.title}`" @click="sectionDialog = { open: true, section }"><Pencil aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar la sección ${section.title}`" @click="removal = { kind: 'section', id: section.id, name: section.title, count: fields.length }"><Trash2 aria-hidden="true" /></Button>
      </div>

      <ol class="flex flex-col gap-1">
        <li v-for="(field, fieldIndex) in fields" :key="field.id">
          <div :data-field="field.id" :class="cn('flex flex-wrap items-center gap-2 rounded-md border px-3 py-2', selectedField === field.id ? 'border-primary bg-primary/5' : 'bg-background')">
            <Button type="button" variant="ghost" class="h-auto min-w-0 flex-1 justify-start gap-2 px-1 py-1 text-left font-normal" :aria-pressed="selectedField === field.id" :aria-label="`Campo ${fieldName(field)}`" @click="selectedField = field.id">
              <component :is="fieldTypeEntry(field.type)!.icon" v-if="fieldTypeEntry(field.type)" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate text-sm" :class="field.label.trim() ? 'font-medium' : 'italic text-muted-foreground'">{{ fieldName(field) }}</span>
              <span class="hidden text-xs text-muted-foreground sm:inline">{{ typeLabel(field) }}</span>
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || fieldIndex === 0" :aria-label="`Subir el campo ${fieldName(field)}`" @click="moveField(section.id, fields, fieldIndex, -1)"><ArrowUp aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked || busy || fieldIndex === fields.length - 1" :aria-label="`Bajar el campo ${fieldName(field)}`" @click="moveField(section.id, fields, fieldIndex, 1)"><ArrowDown aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Propiedades del campo ${fieldName(field)}`" @click="selectedField = field.id; fieldDialog = { open: true, sectionId: section.id, field }"><Settings2 aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :disabled="locked" :aria-label="`Eliminar el campo ${fieldName(field)}`" @click="removal = { kind: 'field', id: field.id, name: fieldName(field), count: 0 }"><Trash2 aria-hidden="true" /></Button>
          </div>
        </li>
      </ol>
      <p v-if="fields.length === 0" class="text-sm text-muted-foreground">Sección sin campos.</p>
      <Button type="button" variant="outline" size="sm" class="self-start" :disabled="locked" @click="fieldDialog = { open: true, sectionId: section.id, field: null }"><Plus data-icon="inline-start" aria-hidden="true" />Agregar campo</Button>
    </section>

    <Button type="button" class="self-start" :disabled="locked" @click="sectionDialog = { open: true, section: null }"><Plus data-icon="inline-start" aria-hidden="true" />Nueva sección</Button>

    <TemplateSectionDialog v-model:open="sectionDialog.open" :template-id="template.id" :section="sectionDialog.section" :used-section-keys="usedSectionKeys" :used-field-keys="usedFieldKeys" @saved="emit('changed')" />
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
