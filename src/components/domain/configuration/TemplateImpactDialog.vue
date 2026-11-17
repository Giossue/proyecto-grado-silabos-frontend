<script setup lang="ts">
import { computed } from 'vue';
import { Save } from '@lucide/vue';
import type { TemplateDraftImpact } from '@/api/template';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useShownWhileClosing } from '@/lib/dialogExit';

const props = defineProps<{ impact: TemplateDraftImpact | null }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const shown = useShownWhileClosing(() => props.impact);

const syllabi = (count: number): string => (count === 1 ? '1 sílabo' : `${count} sílabos`);
const lines = computed(() => {
    const impact = shown.value;
    if (!impact || impact.counted === false) return [];
    return [
        impact.keep > 0 ? `${syllabi(impact.keep)} ${impact.keep === 1 ? 'conserva' : 'conservan'} lo escrito` : null,
        impact.lose > 0 ? `${syllabi(impact.lose)} ${impact.lose === 1 ? 'pierde' : 'pierden'} lo escrito en algún campo que cambió` : null,
        impact.back_to_draft > 0 ? `${syllabi(impact.back_to_draft)} ${impact.back_to_draft === 1 ? 'enviado o aprobado vuelve' : 'enviados o aprobados vuelven'} a borrador` : null,
    ].filter((line): line is string => line !== null);
});
const careers = computed(() => (shown.value?.careers.length ?? 0) > 1 ? shown.value!.careers : []);
const counted = computed(() => shown.value?.counted !== false);
</script>

<template>
  <Dialog :open="impact !== null" @update:open="(value: boolean) => { if (!value) emit('cancel') }">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Sílabos afectados</DialogTitle>
        <DialogDescription v-if="counted">Al reanudar la convocatoria en pausa:</DialogDescription>
        <DialogDescription v-else data-impact-unknown>No se pudieron contar los sílabos afectados. Al reanudar una convocatoria en pausa, sus sílabos conservan lo escrito en los campos que siguen igual y los enviados o aprobados vuelven a borrador</DialogDescription>
      </DialogHeader>
      <ul v-if="lines.length" class="list-disc space-y-1 pl-5 text-sm" data-impact-lines>
        <li v-for="line in lines" :key="line">{{ line }}</li>
      </ul>
      <ul v-if="careers.length" class="space-y-1 text-sm text-muted-foreground" data-impact-careers>
        <li v-for="career in careers" :key="career.name">{{ career.name }}: {{ syllabi(career.in_progress) }}</li>
      </ul>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('cancel')">Cancelar</Button>
        <Button type="button" @click="emit('confirm')"><Save data-icon="inline-start" aria-hidden="true" />{{ counted ? 'Guardar' : 'Guardar de todos modos' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
