<script setup lang="ts">
import { RotateCcw } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { resetSyllabus, type ReviewDetail } from '@/api/reviews';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCountdown } from '@/composables/useCountdown';

const props = defineProps<{ syllabusId: string; subject: string; impact: ReviewDetail['reset'] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const remaining = useCountdown(open);
const reason = ref('');
const typedName = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const needsName = computed(() => props.impact.erases_history === true);
const ready = computed(() => remaining.value === 0 && reason.value.trim().length >= 5 && (!needsName.value || typedName.value.trim() === props.subject.trim()));
const losses = computed(() => {
  const items = ['Lo escrito por el docente'];
  if ((props.impact.signatures ?? 0) > 0) items.push(`${props.impact.signatures} firma(s)`);
  if (props.impact.erases_history) items.push(`${props.impact.revisions ?? 0} revisión(es), la aprobación y el PDF`);

  return items;
});

watch(open, (value) => {
  if (!value) return;
  reason.value = '';
  typedName.value = '';
  errors.value = {};
});

const submit = async (): Promise<void> => {
  if (!ready.value) return;
  processing.value = true;
  errors.value = {};
  try {
    const result = await resetSyllabus(props.syllabusId, reason.value.trim());
    open.value = false;
    emit('saved', result.message);
  } catch (failure) {
    if (failure instanceof ApiError) errors.value = failure.errors;
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reiniciar «{{ subject }}»</DialogTitle>
        <DialogDescription>El docente empieza de cero con la malla y la plantilla actuales. Esto se borra:</DialogDescription>
      </DialogHeader>
      <ul class="flex list-disc flex-col gap-1 pl-5 text-sm">
        <li v-for="item in losses" :key="item">{{ item }}</li>
        <li v-if="!impact.erases_history" class="list-none text-muted-foreground">Las revisiones enviadas se conservan como historial</li>
      </ul>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <Field :data-invalid="Boolean(errors.reason)">
          <FieldLabel for="restart-reason" required>Motivo (lo verá el docente)</FieldLabel>
          <Textarea id="restart-reason" v-model="reason" rows="3" maxlength="500" required />
          <FieldError :errors="errors.reason" />
        </Field>
        <Field v-if="needsName">
          <FieldLabel for="restart-name" required>Escriba «{{ subject }}» para confirmar</FieldLabel>
          <Input id="restart-name" v-model="typedName" autocomplete="off" />
        </Field>
        <FieldError :errors="errors.syllabus" />
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
          <Button type="submit" variant="destructive" :disabled="processing || !ready">
            <Spinner v-if="processing" data-icon="inline-start" />
            <RotateCcw v-else data-icon="inline-start" aria-hidden="true" />
            {{ remaining > 0 ? `Reiniciar (${remaining})` : 'Reiniciar' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
