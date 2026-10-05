<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getSubjectProfile, saveSubjectProfile, type SubjectProfileData } from '@/api/career-academics';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{ subjectId: string; subjectName: string; disabled?: boolean }>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
type StringListKey = 'objetivos_especificos' | 'resultados_aprendizaje' | 'bibliografia_basica' | 'bibliografia_complementaria' | 'herramientas_tic';
const stringLists: Array<{ key: StringListKey; label: string; example: string }> = [
  { key: 'objetivos_especificos', label: 'Objetivos específicos', example: 'Ej. Analizar soluciones de software' },
  { key: 'resultados_aprendizaje', label: 'Resultados de aprendizaje', example: 'Ej. Diseña soluciones verificables' },
  { key: 'bibliografia_basica', label: 'Bibliografía básica', example: 'Ej. Autor. (2024). Título. Editorial. https://…' },
  { key: 'bibliografia_complementaria', label: 'Bibliografía complementaria', example: 'Ej. Autor. (2023). Título. Editorial. https://…' },
  { key: 'herramientas_tic', label: 'Herramientas TIC y TAC', example: 'Ej. Entorno virtual de aprendizaje' },
];
const empty = (): SubjectProfileData => ({
  descripcion: '', objetivo_general: '', objetivos_especificos: [], resultados_aprendizaje: [],
  habilidades_blandas: [], bibliografia_basica: [], bibliografia_complementaria: [],
  herramientas_tic: [], herramientas_ia: [], relacion_perfil_egreso: '',
});
const form = ref<SubjectProfileData>(empty());
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const canSave = computed(() => !loading.value && !saving.value && !props.disabled);
watch(open, async (value) => {
  if (!value) return;
  loading.value = true;
  error.value = null;
  try {
    const result = await getSubjectProfile(props.subjectId);
    form.value = result.profile ? {
      descripcion: result.profile.descripcion,
      objetivo_general: result.profile.objetivo_general,
      objetivos_especificos: result.profile.objetivos_especificos ?? [],
      resultados_aprendizaje: result.profile.resultados_aprendizaje ?? [],
      habilidades_blandas: result.profile.habilidades_blandas ?? [],
      bibliografia_basica: result.profile.bibliografia_basica ?? [],
      bibliografia_complementaria: result.profile.bibliografia_complementaria ?? [],
      herramientas_tic: result.profile.herramientas_tic ?? [],
      herramientas_ia: result.profile.herramientas_ia ?? [],
      relacion_perfil_egreso: result.profile.relacion_perfil_egreso,
    } : empty();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo abrir la ficha.';
  } finally {
    loading.value = false;
  }
});
const addItem = (key: StringListKey) => { (form.value[key] ??= []).push(''); };
const removeItem = (key: StringListKey, index: number) => { form.value[key]?.splice(index, 1); };
const save = async (close: () => void) => {
  if (!canSave.value) return;
  saving.value = true;
  error.value = null;
  const payload: SubjectProfileData = {
    ...form.value,
    descripcion: form.value.descripcion?.trim() || null,
    objetivo_general: form.value.objetivo_general?.trim() || null,
    relacion_perfil_egreso: form.value.relacion_perfil_egreso?.trim() || null,
    objetivos_especificos: form.value.objetivos_especificos?.map((item) => item.trim()).filter(Boolean) ?? [],
    resultados_aprendizaje: form.value.resultados_aprendizaje?.map((item) => item.trim()).filter(Boolean) ?? [],
    bibliografia_basica: form.value.bibliografia_basica?.map((item) => item.trim()).filter(Boolean) ?? [],
    bibliografia_complementaria: form.value.bibliografia_complementaria?.map((item) => item.trim()).filter(Boolean) ?? [],
    herramientas_tic: form.value.herramientas_tic?.map((item) => item.trim()).filter(Boolean) ?? [],
    habilidades_blandas: form.value.habilidades_blandas?.map((item) => ({ nombre: item.nombre.trim(), definicion: item.definicion.trim() })) ?? [],
    herramientas_ia: form.value.herramientas_ia?.map((item) => ({ herramienta: item.herramienta.trim(), caracteristica: item.caracteristica.trim() })) ?? [],
  };
  try {
    await saveSubjectProfile(props.subjectId, payload);
    emit('saved');
    close();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar la ficha.';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <FormSheet v-model:open="open" :show-trigger="false" :title="`Ficha de ${subjectName}`" trigger-label="Ficha" description="Datos académicos que heredarán los sílabos nuevos. La bibliografía podrá ajustarla el docente." wide>
    <template #default="{ close }">
      <form class="contents" @submit.prevent="save(close)">
        <FieldGroup>
          <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
          <Alert v-if="disabled"><AlertDescription>La convocatoria activa bloquea los cambios de la ficha. Puede consultarla aquí.</AlertDescription></Alert>
          <p v-if="loading" role="status">Cargando ficha…</p>
          <template v-else>
            <fieldset class="contents" :disabled="disabled">
            <Field><FieldLabel for="ficha-descripcion">Descripción</FieldLabel><Textarea id="ficha-descripcion" :model-value="form.descripcion ?? ''" @update:model-value="form.descripcion = String($event)" placeholder="Ej. Esta asignatura estudia…" /></Field>
            <Field><FieldLabel for="ficha-objetivo">Objetivo general</FieldLabel><Textarea id="ficha-objetivo" :model-value="form.objetivo_general ?? ''" @update:model-value="form.objetivo_general = String($event)" placeholder="Ej. Desarrollar competencias para…" /></Field>
            <template v-for="list in stringLists" :key="list.key">
              <Field><FieldLabel>{{ list.label }}</FieldLabel>
                <div v-for="(item, index) in form[list.key]" :key="index" class="flex items-start gap-2">
                  <Textarea v-model="form[list.key]![index]" :aria-label="`${list.label} ${index + 1}`" :placeholder="list.example" />
                  <Button type="button" variant="outline" :aria-label="`Quitar ${list.label} ${index + 1}`" @click="removeItem(list.key, index)">Quitar</Button>
                </div>
                <Button type="button" variant="outline" class="w-fit" @click="addItem(list.key)">Agregar</Button>
              </Field>
            </template>
            <Field><FieldLabel>Habilidades blandas</FieldLabel>
              <div v-for="(item, index) in form.habilidades_blandas" :key="index" class="flex flex-col gap-2 rounded-md border p-3">
                <Input v-model="item.nombre" :aria-label="`Habilidad ${index + 1}`" placeholder="Ej. Comunicación" />
                <Textarea v-model="item.definicion" :aria-label="`Definición de habilidad ${index + 1}`" placeholder="Ej. Comunica ideas con claridad" />
                <Button type="button" variant="outline" class="w-fit" @click="form.habilidades_blandas?.splice(index, 1)">Quitar habilidad</Button>
              </div>
              <Button type="button" variant="outline" class="w-fit" @click="form.habilidades_blandas?.push({ nombre: '', definicion: '' })">Agregar habilidad</Button>
            </Field>
            <Field><FieldLabel>Herramientas de IA</FieldLabel>
              <div v-for="(item, index) in form.herramientas_ia" :key="index" class="flex flex-col gap-2 rounded-md border p-3">
                <Input v-model="item.herramienta" :aria-label="`Herramienta de IA ${index + 1}`" placeholder="Ej. Asistente de programación" />
                <Textarea v-model="item.caracteristica" :aria-label="`Característica de IA ${index + 1}`" placeholder="Ej. Ayuda a explorar alternativas" />
                <Button type="button" variant="outline" class="w-fit" @click="form.herramientas_ia?.splice(index, 1)">Quitar herramienta</Button>
              </div>
              <Button type="button" variant="outline" class="w-fit" @click="form.herramientas_ia?.push({ herramienta: '', caracteristica: '' })">Agregar herramienta de IA</Button>
            </Field>
            <Field><FieldLabel for="ficha-perfil">Relación con el perfil de egreso</FieldLabel><Textarea id="ficha-perfil" :model-value="form.relacion_perfil_egreso ?? ''" @update:model-value="form.relacion_perfil_egreso = String($event)" placeholder="Ej. Contribuye al perfil mediante…" /></Field>
            </fieldset>
          </template>
          <FormSheetActions :close="close" :processing="saving" :disabled="!canSave" label="Guardar ficha" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
