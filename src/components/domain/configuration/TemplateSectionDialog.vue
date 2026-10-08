<script setup lang="ts">
import { ArrowLeft, Save } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createField, createSection, createSectionFromDesign, renameSection } from '@/api/template-structure';
import type { SectionDesign, TemplateSectionPayload } from '@/api/template';
import TemplateFieldForm from '@/components/domain/configuration/TemplateFieldForm.vue';
import { apiMessage, fieldFormError, fieldInput, newFieldForm, uniqueKey, type FieldForm } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fieldTypeEntry } from '@/components/domain/fieldTypes/registry';
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

/** «Nueva sección»: elegir un diseño oficial o crearla en blanco (nombre y primer campo opcional), o «Renombrar sección» (con `section`). */
const props = defineProps<{ templateId: string; section?: TemplateSectionPayload | null; usedSectionKeys: string[]; usedFieldKeys: string[]; designs?: SectionDesign[] }>();
const emit = defineEmits<{ saved: [createdId?: string] }>();
const open = defineModel<boolean>('open', { required: true });

const BLANK = 'blank';
const step = ref<'choose' | 1 | 2>('choose');
const choice = ref<string>(BLANK);
const title = ref('');
const titleError = ref<string | null>(null);
const withField = ref<FieldForm>(newFieldForm());
const error = ref<string | null>(null);
const saving = ref(false);

watch(open, (value) => {
    if (!value) return;
    step.value = props.section ? 1 : 'choose';
    choice.value = BLANK;
    title.value = props.section?.title ?? '';
    titleError.value = null;
    error.value = null;
    withField.value = newFieldForm();
});

const available = (design: SectionDesign): boolean => !design.in_use;
const fieldSummary = (design: SectionDesign): string =>
    design.fields.map((field) => `${field.label.trim() || 'Texto de la sección'} (${fieldTypeEntry(field.type)?.label ?? field.type})`).join(', ');

const choose = async (): Promise<void> => {
    if (choice.value === BLANK) {
        step.value = 1;
        return;
    }
    if (saving.value) return;
    saving.value = true;
    error.value = null;
    try {
        const created = await createSectionFromDesign(props.templateId, choice.value);
        toast.success('Sección agregada.');
        open.value = false;
        emit('saved', created.section_id);
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo agregar la sección.');
    } finally {
        saving.value = false;
    }
};

const next = (): void => {
    titleError.value = title.value.trim() === '' ? 'Escriba el nombre de la sección.' : null;
    if (titleError.value) return;
    if (props.section) void save(false);
    else step.value = 2;
};

const save = async (includeField: boolean): Promise<void> => {
    if (saving.value) return;
    error.value = includeField ? fieldFormError(withField.value) : null;
    if (error.value) return;
    saving.value = true;
    let createdId: string | undefined;
    try {
        if (props.section) {
            await renameSection(props.templateId, props.section.id, title.value.trim());
        } else {
            const { section_id } = await createSection(props.templateId, { key: uniqueKey(title.value, 'seccion', props.usedSectionKeys), title: title.value.trim() });
            createdId = section_id;
            if (includeField) {
                await createField(props.templateId, section_id, { ...fieldInput(withField.value), type: withField.value.type, key: uniqueKey(withField.value.label, 'campo', props.usedFieldKeys) });
            }
        }
        toast.success(props.section ? 'Sección actualizada.' : 'Sección agregada.');
        open.value = false;
        emit('saved', createdId);
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar la sección.');
        // Si la sección ya se creó y falló el campo, la lista debe reflejarlo.
        emit('saved', createdId);
    } finally {
        saving.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-dvh overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ section ? 'Renombrar sección' : 'Nueva sección' }}</DialogTitle>
        <DialogDescription>{{ section ? 'Cambie el nombre de esta sección.' : step === 'choose' ? 'Elija un diseño oficial ya armado o empiece con una sección en blanco.' : step === 1 ? 'Paso 1 de 2: ¿cómo se llama la sección?' : 'Paso 2 de 2: agregue su primer campo o créela vacía.' }}</DialogDescription>
      </DialogHeader>

      <form v-if="step === 'choose'" class="flex flex-col gap-4" @submit.prevent="choose">
        <RadioGroup v-model="choice" class="flex flex-col gap-4">
          <FieldSet>
            <FieldLegend variant="label">Usar un diseño oficial</FieldLegend>
            <FieldDescription>Secciones ya armadas con el formato de la UEB: cada una trae sus campos listos.</FieldDescription>
            <div class="flex flex-col gap-2" data-section-designs>
              <label v-for="design in designs ?? []" :key="design.key" :for="`section-design-${design.key}`" :data-design="design.key" :class="['flex items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary', available(design) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60']">
                <RadioGroupItem :id="`section-design-${design.key}`" :value="design.key" :disabled="!available(design) || saving" class="mt-0.5" />
                <span class="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span class="font-medium [overflow-wrap:anywhere]">{{ design.title }}<span v-if="!available(design)" class="ml-2 font-normal text-muted-foreground">Ya está en la plantilla</span></span>
                  <span class="text-muted-foreground">{{ design.summary }}</span>
                  <span class="text-xs text-muted-foreground [overflow-wrap:anywhere]">Incluye: {{ fieldSummary(design) }}</span>
                </span>
              </label>
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend variant="label">O empezar desde cero</FieldLegend>
            <label for="section-design-blank" class="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary">
              <RadioGroupItem id="section-design-blank" :value="BLANK" :disabled="saving" class="mt-0.5" />
              <span class="flex flex-col gap-0.5 text-sm">
                <span class="font-medium">En blanco</span>
                <span class="text-muted-foreground">Cree una sección vacía con su propio nombre y sus propios campos.</span>
              </span>
            </label>
          </FieldSet>
        </RadioGroup>
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" data-icon="inline-start" />
            {{ choice === BLANK ? 'Continuar' : 'Agregar sección' }}
          </Button>
        </DialogFooter>
      </form>

      <form v-else-if="step === 1" class="flex flex-col gap-4" @submit.prevent="next">
        <Field :data-invalid="Boolean(titleError)">
          <FieldLabel for="template-section-title" required>Nombre de la sección</FieldLabel>
          <Input id="template-section-title" v-model="title" maxlength="180" placeholder="Ej. Objetivos de la asignatura" :aria-invalid="Boolean(titleError)" :disabled="saving" />
          <FieldError v-if="titleError" :errors="[titleError]" />
        </Field>
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter>
          <Button v-if="!section" type="button" variant="ghost" :disabled="saving" @click="step = 'choose'"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
          <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" data-icon="inline-start" /><Save v-else-if="section" data-icon="inline-start" aria-hidden="true" />
            {{ section ? 'Guardar nombre' : 'Continuar' }}
          </Button>
        </DialogFooter>
      </form>

      <form v-else class="flex flex-col gap-4" @submit.prevent="save(true)">
        <TemplateFieldForm v-model="withField" id-prefix="new-section-field" />
        <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <DialogFooter class="sm:justify-between">
          <Button type="button" variant="ghost" :disabled="saving" @click="step = 1"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" :disabled="saving" @click="save(false)">Crear sin campos</Button>
            <Button type="submit" :disabled="saving"><Spinner v-if="saving" data-icon="inline-start" />Crear sección con este campo</Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
