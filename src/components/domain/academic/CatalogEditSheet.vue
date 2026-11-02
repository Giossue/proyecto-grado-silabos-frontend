<script setup lang="ts">
import { Check, X } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { updateAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import FacultyLibraryChecks from '@/components/domain/academic/FacultyLibraryChecks.vue';
import FacultyLogoField from '@/components/domain/academic/FacultyLogoField.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import SheetActions, { type SheetAction } from '@/components/domain/SheetActions.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { initialLibraries, librariesToStore, sameLibraries, useCatalogLibraries } from '@/composables/useCatalogLibraries';
import { requestPurgeConfirmation } from '@/composables/usePurgeConfirmation';
import type { CatalogRecord, GovernanceCatalogEntity } from '@/types/academic';

const props = withDefaults(defineProps<{
    entity: GovernanceCatalogEntity; recordId: string; recordName: string; recordCode?: string | null;
    facultyId?: string | null; modality?: string | null; campus?: string | null;
    startsOn?: string | null; endsOn?: string | null;
    modalityOptions: Array<{ value: string; label: string }>;
    faculties: CatalogRecord[]; campusOptions: Array<{ value: string; label: string }>;
    lockReason?: string | null; logoUrl?: string | null; showTrigger?: boolean; actions?: SheetAction[]; catalogLibraries?: string[];
}>(), { showTrigger: true, actions: () => [], catalogLibraries: () => [] });
const emit = defineEmits<{ saved: [message: string]; action: [key: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const logo = ref<File | null>(null);
const removeLogo = ref(false);
const currentLogo = computed(() => Boolean(props.logoUrl) && !removeLogo.value);
const form = ref({ nombre: '', code: '', faculty_id: '', campus: '', modality: '', starts_on: '', ends_on: '' });

// Bibliotecas de Koha de la facultad: casillas con las disponibles; todas marcadas equivale a «todas».
const tab = ref<'datos' | 'bibliotecas'>('datos');
const chosenLibraries = ref<string[]>([]);
const { libraries: koha, error: kohaError, load: loadKoha } = useCatalogLibraries();
const loadLibraries = async (): Promise<void> => {
    await loadKoha();
    if (koha.value !== null) chosenLibraries.value = initialLibraries(props.catalogLibraries, koha.value);
};
/** Lista a guardar; null si no cambia o si no se pudo consultar Koha. */
const librariesToSave = (): string[] | null => {
    if (koha.value === null) return null;
    const stored = librariesToStore(chosenLibraries.value, koha.value);

    return sameLibraries(stored, props.catalogLibraries) ? null : stored;
};

const FIELD_ERRORS = ['nombre', 'code', 'faculty_id', 'campus', 'modality', 'starts_on', 'ends_on', 'logo', 'catalog_libraries'];
/** Avisos del servidor que no pertenecen a ningún campo (por ejemplo, una convocatoria abierta). */
const generalError = computed((): string | null => {
    const key = Object.keys(errors.value).find((name) => !FIELD_ERRORS.some((field) => name === field || name.startsWith(`${field}.`)) && !name.startsWith('purge_'));

    return key === undefined ? null : (errors.value[key]?.[0] ?? null);
});
const entityLabel = computed(() => ({ facultad: 'facultad', carrera: 'carrera', periodo: 'periodo académico' })[props.entity]);
const facultyOptions = computed(() => props.faculties.filter((faculty) => faculty.activo || faculty.id === props.facultyId));

const reset = (): void => {
    form.value = {
        nombre: props.recordName, code: props.recordCode ?? '', faculty_id: props.facultyId ?? '',
        campus: props.campus ?? '', modality: props.modality ?? '', starts_on: props.startsOn ?? '',
        ends_on: props.endsOn ?? '',
    };
    logo.value = null;
    removeLogo.value = false;
    errors.value = {};
    tab.value = 'datos';
    chosenLibraries.value = [...props.catalogLibraries];
    if (props.entity === 'facultad') void loadLibraries();
};
watch(open, (value) => { if (value) reset(); }, { immediate: true });
/** Sin cambios respecto a lo guardado: no hay nada que enviar. */
const unchanged = computed(() => {
    const initial: Record<string, string> = {
        nombre: props.recordName, code: props.recordCode ?? '', faculty_id: props.facultyId ?? '',
        campus: props.campus ?? '', modality: props.modality ?? '', starts_on: props.startsOn ?? '', ends_on: props.endsOn ?? '',
    };

    return Object.entries(initial).every(([key, value]) => form.value[key as keyof typeof form.value] === value)
        && logo.value === null && !removeLogo.value
        && (props.entity !== 'facultad' || (chosenLibraries.value.length > 0 && librariesToSave() === null));
});
const logoValidationError = (message: string | null): void => {
    const nextErrors = { ...errors.value };
    if (message) nextErrors.logo = [message];
    else delete nextErrors.logo;
    errors.value = nextErrors;
};
const submit = async (confirmPurge = false): Promise<void> => {
    errors.value = {};
    if (props.entity === 'facultad' && !currentLogo.value && !logo.value) {
        errors.value = { logo: ['El logo de la facultad es obligatorio'] };
        tab.value = 'datos';
        return;
    }
    if (props.entity === 'facultad' && koha.value !== null && chosenLibraries.value.length === 0) {
        errors.value = { catalog_libraries: ['Marque al menos una biblioteca'] };
        tab.value = 'bibliotecas';
        return;
    }
    processing.value = true;
    const payload = new FormData();
    for (const [key, value] of Object.entries(form.value)) {
        if (key === 'code' && props.entity !== 'carrera') continue;
        payload.set(key, String(value));
    }
    if (logo.value) payload.set('logo', logo.value);
    const libraries = props.entity === 'facultad' ? librariesToSave() : null;
    if (libraries !== null) payload.set('catalog_libraries', JSON.stringify(libraries));
    if (confirmPurge) payload.set('confirm_purge', '1');
    try {
        const result = await updateAcademicRecord(props.entity, props.recordId, payload);
        open.value = false;
        emit('saved', result.message);
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
        if (props.entity === 'facultad') tab.value = Object.keys(errors.value).some((key) => key.startsWith('catalog_libraries')) ? 'bibliotecas' : 'datos';
        const purgeMessage = errors.value.purge_required?.[0];
        if (purgeMessage) {
            requestPurgeConfirmation(
                purgeMessage,
                Number(errors.value.purge_count?.[0] ?? 0),
                () => void submit(true),
            );
        }
    }
    finally { processing.value = false; }
};
</script>

<template>
    <FormSheet v-model:open="open" trigger-label="Editar" :title="`Editar ${entityLabel}`" :show-trigger="showTrigger">
        <template v-if="actions.length > 0" #header-actions><SheetActions inline :actions="actions" :menu-label="`Acciones para ${recordName}`" @select="(key) => emit('action', key)" /></template>
        <template #default="{ close }">
            <form @submit.prevent="submit()"><FieldGroup>
                <Alert v-if="lockReason"><AlertDescription>Hay una convocatoria activa: pause la convocatoria para editar</AlertDescription></Alert>
                <Alert v-else-if="generalError" variant="destructive"><AlertDescription>{{ generalError }}</AlertDescription></Alert>
                <Tabs v-if="entity === 'facultad'" v-model="tab" class="gap-4">
                    <TabsList aria-label="Secciones de la facultad"><TabsTrigger value="datos">Datos</TabsTrigger><TabsTrigger value="bibliotecas">Bibliotecas</TabsTrigger></TabsList>
                    <TabsContent value="datos" class="flex flex-col gap-7">
                      <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`edit-name-${recordId}`" required>Nombre</FieldLabel><Input :id="`edit-name-${recordId}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
                      <Field :data-invalid="Boolean(errors.campus)"><FieldLabel :for="`edit-campus-${recordId}`" required>Campus</FieldLabel><Select v-model="form.campus" required><SelectTrigger :id="`edit-campus-${recordId}`"><SelectValue placeholder="Seleccione el campus de la facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in campusOptions" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.campus" /></Field>
                      <Field :data-invalid="Boolean(errors.logo)"><FieldLabel :for="`edit-faculty-logo-${recordId}`" required>Logo de la facultad</FieldLabel><div v-if="currentLogo" class="flex items-center gap-3"><img :src="logoUrl ?? ''" alt="Logo actual de la facultad" class="h-24 min-w-0 flex-1 rounded-md border bg-background object-contain p-2"><Button type="button" variant="outline" size="icon-sm" aria-label="Quitar logo" :disabled="processing" @click="removeLogo = true"><X aria-hidden="true" /></Button></div><FacultyLogoField v-else v-model="logo" :input-id="`edit-faculty-logo-${recordId}`" :disabled="processing" :invalid="Boolean(errors.logo)" required @validation-error="logoValidationError" /><FieldDescription v-if="!currentLogo">Suba el logo como lo tenga: el sistema lo deja en 600 × 180 px y con fondo transparente</FieldDescription><FieldError :errors="errors.logo" /></Field>
                    </TabsContent>
                    <TabsContent value="bibliotecas">
                        <FacultyLibraryChecks v-model="chosenLibraries" :libraries="koha" :error="kohaError" :saved="catalogLibraries" :id-prefix="`edit-library-${recordId}`" :invalid="errors.catalog_libraries" />
                    </TabsContent>
                </Tabs>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.faculty_id)"><FieldLabel :for="`edit-faculty-${recordId}`" required>Facultad</FieldLabel><Select v-model="form.faculty_id" required><SelectTrigger :id="`edit-faculty-${recordId}`"><SelectValue placeholder="Seleccione una facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="faculty in facultyOptions" :key="faculty.id" :value="faculty.id">{{ faculty.nombre }} {{ faculty.activo ? '' : '(inactiva)' }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.faculty_id" /></Field>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.modality)"><FieldLabel :for="`edit-modality-${recordId}`" required>Modalidad</FieldLabel><Select v-model="form.modality" required><SelectTrigger :id="`edit-modality-${recordId}`"><SelectValue placeholder="Seleccione la modalidad aprobada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in modalityOptions" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.modality" /></Field>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`edit-name-${recordId}`" required>Nombre</FieldLabel><Input :id="`edit-name-${recordId}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.code)"><FieldLabel :for="`edit-code-${recordId}`" required>Código de carrera</FieldLabel><Input :id="`edit-code-${recordId}`" v-model="form.code" required /><FieldError :errors="errors.code" /></Field>
                <div v-if="entity === 'periodo'" class="grid grid-cols-2 items-start gap-4">
                    <Field :data-invalid="Boolean(errors.starts_on)"><FieldLabel :for="`edit-starts-on-${recordId}`" required>Fecha de inicio</FieldLabel><DatePicker :id="`edit-starts-on-${recordId}`" v-model="form.starts_on" required /><FieldError :errors="errors.starts_on" /></Field>
                    <Field :data-invalid="Boolean(errors.ends_on)"><FieldLabel :for="`edit-ends-on-${recordId}`" required>Fecha de fin</FieldLabel><DatePicker :id="`edit-ends-on-${recordId}`" v-model="form.ends_on" required /><FieldError :errors="errors.ends_on" /></Field>
                </div>
                <FormSheetActions :close="close" :processing="processing" :disabled="unchanged || Boolean(lockReason) || (entity === 'facultad' && koha !== null && chosenLibraries.length === 0)" :icon="Check" label="Guardar cambios" />
            </FieldGroup></form>
        </template>
    </FormSheet>
</template>
