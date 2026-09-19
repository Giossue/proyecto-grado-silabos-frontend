<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSource, updateSourceContent, type SourceDetail } from '@/api/sources';
import { getSession } from '@/api/session';
import MarkdownEditor from '@/components/domain/MarkdownEditor.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import AcademicSourceEditSheet from '@/components/domain/configuration/AcademicSourceEditSheet.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const data = ref<SourceDetail | null>(null);
const loading = ref(true);
const content = ref('');
const savedContent = ref('');
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const fieldErrors = ref<Record<string, string[]>>({});
const message = ref<string | null>(null);
const saving = ref(false);
const id = (): string => String(route.params.source);
const isDirty = computed(() => content.value !== savedContent.value);

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    data.value = await getSource(id());
    content.value = data.value.source.content ?? '';
    savedContent.value = content.value;
  } catch (reason) {
    loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la fuente.';
  } finally { loading.value = false; }
};
const saveContent = async (): Promise<void> => {
  saving.value = true;
  actionError.value = null;
  fieldErrors.value = {};
  try {
    message.value = (await updateSourceContent(id(), content.value)).message;
    savedContent.value = content.value;
  } catch (reason) {
    if (reason instanceof ApiError) {
      fieldErrors.value = reason.errors;
      actionError.value = reason.message;
    } else actionError.value = 'No se pudo guardar la fuente.';
  } finally { saving.value = false; }
};
const metadataSaved = async (value: string): Promise<void> => {
  message.value = value;
  await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame :title="data?.source.name ?? 'Fuente académica'" description="Redáctelo con la cinta de opciones, como en un procesador de textos. El formato se ve directamente mientras escribe.">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.coordination.sources">← Volver a fuentes</RouterLink></Button></template>
    <template #actions><AcademicSourceEditSheet v-if="data" :source="data.source" :disabled="Boolean(data.processLock)" @saved="metadataSaved" /></template>
    <div class="flex flex-col gap-4">
      <ProcessLockAlert v-if="data?.processLock" />
      <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
      <Alert v-if="actionError && Object.keys(fieldErrors).length === 0" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
      <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
      <LoadingSkeleton v-else-if="loading && !data" variant="source" />
      <section v-else-if="data" class="flex flex-col gap-3">
        <div class="flex items-center justify-end gap-3">
          <span v-if="isDirty" class="text-sm text-muted-foreground">Cambios sin guardar</span>
          <Button type="button" :disabled="saving || !isDirty || Boolean(data.processLock)" @click="saveContent"><Spinner v-if="saving" /><Check v-else data-icon="inline-start" aria-hidden="true" />Guardar contenido</Button>
        </div>
        <FieldError :errors="fieldErrors.content" />
        <MarkdownEditor v-model="content" :document-title="data.source.name" label="Contenido del documento" :disabled="Boolean(data.processLock)" />
      </section>
    </div>
  </PageFrame>
</template>
