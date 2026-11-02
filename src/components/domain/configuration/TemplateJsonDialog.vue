<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileUp, Save } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getTemplateJson, importTemplateJson } from '@/api/template';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { downloadJson } from '@/lib/downloadJson';

const props = defineProps<{ templateId: string; locked: boolean }>();
const emit = defineEmits<{ imported: [] }>();
const open = defineModel<boolean>('open', { required: true });

const text = ref('');
const loading = ref(false);
const saving = ref(false);
const problems = ref<string[]>([]);
const failure = ref<string | null>(null);
const fileInput = ref<{ $el?: HTMLInputElement } | null>(null);
const canApply = computed(() => !props.locked && !loading.value && !saving.value && text.value.trim() !== '');

const load = async (): Promise<void> => {
    loading.value = true;
    failure.value = null;
    problems.value = [];
    try {
        text.value = JSON.stringify(await getTemplateJson(props.templateId), null, 2);
    } catch (reason) {
        failure.value = reason instanceof ApiError ? reason.message : 'No se pudo leer la plantilla';
    } finally {
        loading.value = false;
    }
};
watch(open, (value) => { if (value) void load(); }, { immediate: true });

const apply = async (): Promise<void> => {
    failure.value = null;
    problems.value = [];
    let parsed: unknown;
    try {
        parsed = JSON.parse(text.value);
    } catch (reason) {
        failure.value = `El JSON no es válido: ${reason instanceof Error ? reason.message : 'error de sintaxis'}`;
        return;
    }
    saving.value = true;
    try {
        await importTemplateJson(props.templateId, parsed);
        open.value = false;
        emit('imported');
    } catch (reason) {
        if (reason instanceof ApiError) {
            problems.value = Object.entries(reason.errors).flatMap(([path, messages]) => messages.map((message) => `${path}: ${message}`));
            failure.value = problems.value.length === 0 ? reason.message : 'La plantilla tiene errores y no se cambió nada';
        } else {
            failure.value = 'No se pudo importar la plantilla';
        }
    } finally {
        saving.value = false;
    }
};

const readFile = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    text.value = await file.text();
    problems.value = [];
    failure.value = null;
    input.value = '';
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent :aria-describedby="undefined" class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Plantilla como JSON</DialogTitle>
      </DialogHeader>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="loading || text.trim() === ''" @click="downloadJson(text, 'plantilla-silabo.json')"><Download data-icon="inline-start" aria-hidden="true" />Descargar</Button>
        <Button type="button" variant="outline" size="sm" :disabled="locked || loading" @click="fileInput?.$el?.click()"><FileUp data-icon="inline-start" aria-hidden="true" />Cargar archivo</Button>
        <Input ref="fileInput" type="file" accept="application/json,.json" class="sr-only" tabindex="-1" aria-label="Archivo JSON de la plantilla" @change="readFile" />
        <span v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Cargando…</span>
      </div>
      <Textarea v-model="text" spellcheck="false" :disabled="locked || loading" aria-label="JSON de la plantilla" class="h-96 font-mono text-xs" />
      <Alert v-if="failure" variant="destructive" role="alert">
        <AlertDescription>
          {{ failure }}
          <ScrollArea v-if="problems.length" class="mt-2 [&>[data-slot=scroll-area-viewport]]:max-h-40">
            <ul class="list-disc pl-5 font-mono text-xs">
              <li v-for="problem in problems" :key="problem">{{ problem }}</li>
            </ul>
          </ScrollArea>
        </AlertDescription>
      </Alert>
      <DialogFooter>
        <Button type="button" variant="outline" :disabled="saving" @click="open = false">Cancelar</Button>
        <Button type="button" :disabled="!canApply" @click="apply"><Spinner v-if="saving" data-icon="inline-start" /><Save v-else data-icon="inline-start" aria-hidden="true" />Aplicar y reemplazar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
