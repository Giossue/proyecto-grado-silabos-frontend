<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Save } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createField, createSection, createSectionFromDesign, renameSection } from '@/api/template-structure';
import type { SectionDesign, TemplateSectionPayload } from '@/api/template';
import TemplateFieldForm from '@/components/domain/configuration/TemplateFieldForm.vue';
import { apiMessage, fieldInput, newFieldForm, uniqueKey, type FieldForm } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { responsibleLabel } from '@/types/configuration';
import type { TemplateVariable } from '@/lib/templateDocument';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';


const props = defineProps<{ templateId: string; section?: TemplateSectionPayload | null; usedSectionKeys: string[]; usedFieldKeys: string[]; designs?: SectionDesign[]; variables?: TemplateVariable[] }>();
const emit = defineEmits<{ saved: [createdId?: string] }>();
const open = defineModel<boolean>('open', { required: true });

const BLANK = 'blank';
const step = ref<'choose' | 1 | 2>('choose');
const choice = ref<string>(BLANK);
const title = ref('');
const orientation = ref<'portrait' | 'landscape'>('portrait');
const titleError = ref<string | null>(null);
const withField = ref<FieldForm>(newFieldForm());
const error = ref<string | null>(null);
const saving = ref(false);

watch(open, (value) => {
    if (!value) return;
    step.value = props.section ? 1 : 'choose';
    choice.value = BLANK;
    title.value = props.section?.title ?? '';
    orientation.value = props.section?.orientation ?? 'portrait';
    titleError.value = null;
    error.value = null;
    withField.value = newFieldForm();
});

const available = (design: SectionDesign): boolean => !design.in_use;
const fieldSummary = (design: SectionDesign): string =>
    design.fields.map((field) => `${field.label.trim() || 'Texto de la sección'} (${responsibleLabel(field.quien_llena)})`).join(', ');

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
    error.value = null;
    if (error.value) return;
    saving.value = true;
    let createdId: string | undefined;
    try {
        if (props.section) {
            await renameSection(props.templateId, props.section.id, title.value.trim(), orientation.value);
        } else {
            const { section_id } = await createSection(props.templateId, { key: uniqueKey(title.value, 'seccion', props.usedSectionKeys), title: title.value.trim(), orientation: orientation.value });
            createdId = section_id;
            if (includeField) {
                await createField(props.templateId, section_id, { ...fieldInput(withField.value), key: uniqueKey(withField.value.label, 'campo', props.usedFieldKeys) });
            }
        }
        toast.success(props.section ? 'Sección actualizada.' : 'Sección agregada.');
        open.value = false;
        emit('saved', createdId);
    } catch (reason) {
        error.value = apiMessage(reason, 'No se pudo guardar la sección.');

        emit('saved', createdId);
    } finally {
        saving.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-dvh flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <ScrollArea class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-2rem)]">
            <div class="grid gap-4 p-6">
              <DialogHeader>
                <DialogTitle>{{ section ? 'Propiedades de la sección' : 'Nueva sección' }}</DialogTitle>
                <DialogDescription>{{ section ? 'Cambie el nombre y la orientación de esta sección.' : step === 'choose' ? 'Elija un diseño oficial ya armado o empiece con una sección en blanco.' : step === 1 ? 'Paso 1 de 2: ¿cómo se llama la sección?' : 'Paso 2 de 2: agregue su primer campo o créela vacía.' }}</DialogDescription>
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
                <Field>
                  <FieldLabel for="section-orientation">Orientación de la hoja</FieldLabel>
                  <Select v-model="orientation" :disabled="saving"><SelectTrigger id="section-orientation"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="portrait">Vertical</SelectItem><SelectItem value="landscape">Horizontal</SelectItem></SelectContent></Select>
                </Field>
                <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
                <DialogFooter>
                  <Button v-if="!section" type="button" variant="ghost" :disabled="saving" @click="step = 'choose'"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
                  <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
                  <Button type="submit" :disabled="saving">
                    <Spinner v-if="saving" data-icon="inline-start" /><Save v-else-if="section" data-icon="inline-start" aria-hidden="true" />
                    {{ section ? 'Guardar sección' : 'Continuar' }}
                  </Button>
                </DialogFooter>
              </form>

              <form v-else class="flex flex-col gap-4" @submit.prevent="save(true)">
                <TemplateFieldForm v-model="withField" id-prefix="new-section-field" :variables="variables" />
                <Alert v-if="error" variant="destructive" role="alert"><AlertDescription>{{ error }}</AlertDescription></Alert>
                <DialogFooter class="sm:justify-between">
                  <Button type="button" variant="ghost" :disabled="saving" @click="step = 1"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
                  <div class="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="outline" :disabled="saving" @click="save(false)">Crear sin campos</Button>
                    <Button type="submit" :disabled="saving"><Spinner v-if="saving" data-icon="inline-start" />Crear sección con este campo</Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
        </ScrollArea>
    </DialogContent>
  </Dialog>
</template>
