<script setup lang="ts">
import { Link2, ListTree, Plus, Workflow } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { type Curriculum } from "@/api/career-academics";
import CurriculumActions from "@/components/domain/academic/CurriculumActions.vue";
import CurriculumCanvas from "@/components/domain/academic/curriculum/CurriculumCanvas.vue";
import CurriculumConfigurationSheet from "@/components/domain/academic/curriculum/CurriculumConfigurationSheet.vue";
import CurriculumFormView from "@/components/domain/academic/curriculum/CurriculumFormView.vue";
import CurriculumRequirementSheet from "@/components/domain/academic/curriculum/CurriculumRequirementSheet.vue";
import CurriculumSubjectSheet from "@/components/domain/academic/curriculum/CurriculumSubjectSheet.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const props = defineProps<{ data: Curriculum }>();
const emit = defineEmits<{ changed: [message: string]; failed: [message: string] }>();
const modeFromUrl = () => new URL(window.location.href).searchParams.get("modo") === "desglose" ? "breakdown" : "builder";
const activeMode = ref<"breakdown" | "builder">(modeFromUrl());
const subjectOpen = ref(false);
const requirementOpen = ref(false);
const configurationOpen = ref(false);
const selectedSubject = ref<Curriculum["subjects"][number] | null>(null);
const organizationUnits = computed(() => Array.from(new Set(props.data.subjects.map((item) => item.organization_unit?.trim()).filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b, "es")));
watch(activeMode, (mode) => {
  const url = new URL(window.location.href);
  if (mode === "breakdown") url.searchParams.set("modo", "desglose");
  else url.searchParams.delete("modo");
  window.history.replaceState(window.history.state, "", url);
});
const openNewSubject = () => { selectedSubject.value = null; subjectOpen.value = true; };
const openSubject = (subject: Curriculum["subjects"][number]) => { selectedSubject.value = subject; subjectOpen.value = true; };
</script>

<template>
  <Alert v-if="data.curriculum.lock_reason"><AlertDescription>{{ data.curriculum.lock_reason }}</AlertDescription></Alert>
  <Tabs v-model="activeMode" class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <TabsList aria-label="Modo de trabajo de la malla"><TabsTrigger value="builder"><Workflow aria-hidden="true" />Interactivo</TabsTrigger><TabsTrigger value="breakdown"><ListTree aria-hidden="true" />Desglose académico</TabsTrigger></TabsList>
      <div class="flex flex-wrap gap-2">
        <Button v-if="activeMode === 'breakdown' && data.curriculum.editable && data.subjects.length > 1" type="button" variant="outline" @click="requirementOpen = true"><Link2 data-icon="inline-start" aria-hidden="true" />Agregar relación</Button>
        <Button v-if="activeMode === 'breakdown' && data.curriculum.editable" type="button" @click="openNewSubject"><Plus data-icon="inline-start" aria-hidden="true" />Agregar materia</Button>
        <CurriculumActions :curriculum="data.curriculum" @configure="configurationOpen = true" />
      </div>
    </div>
    <TabsContent value="breakdown"><CurriculumFormView :data="data" @edit="openSubject" @changed="emit('changed', $event)" @failed="emit('failed', $event)" /></TabsContent>
    <TabsContent value="builder"><CurriculumCanvas :career="data.career" :modality-options="data.modalityOptions" :curriculum="data.curriculum" :fixed-fields="data.fixedFields" :fixed-field-totals="data.fixedFieldTotals" :subjects="data.subjects" :requirements="data.requirements" :organization-units="organizationUnits" @changed="emit('changed', $event)" /></TabsContent>
  </Tabs>
  <CurriculumSubjectSheet v-model:open="subjectOpen" :career="data.career" :curriculum="data.curriculum" :fixed-fields="data.fixedFields" :subject="selectedSubject" :organization-units="organizationUnits" :modality-options="data.modalityOptions" @saved="emit('changed', $event)" />
  <CurriculumRequirementSheet v-model:open="requirementOpen" :curriculum="data.curriculum" :subjects="data.subjects" @saved="emit('changed', $event)" />
  <CurriculumConfigurationSheet v-model:open="configurationOpen" :curriculum="data.curriculum" @saved="emit('changed', $event)" />
</template>
