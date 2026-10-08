<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { RelationMode } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { CurriculumBuilderSubject } from '@/types/academic';
import { useFocusReturn } from '@/lib/focusReturn';
import { toRoman } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';

const props = defineProps<{ subjects: CurriculumBuilderSubject[] }>();
const emit = defineEmits<{ pick: [connection: { sourceId: string; targetId: string }] }>();
const picker = defineModel<{ subjectId: string; mode: RelationMode } | null>('picker', { required: true });
const chosen = ref('');
useFocusReturn(() => picker.value !== null);

const current = computed(() => props.subjects.find((subject) => subject.id === picker.value?.subjectId) ?? null);
const options = computed(() =>
    props.subjects
        .filter((subject) => subject.id !== picker.value?.subjectId)
        .sort((left, right) => (left.cycle ?? 0) - (right.cycle ?? 0) || left.position - right.position),
);
const question = computed(() => picker.value?.mode === 'requires' ? '¿Qué materia requiere?' : '¿De qué materia es requisito?');

watch(picker, (value) => { if (value) chosen.value = ''; });

const confirm = (): void => {
    const subject = picker.value?.subjectId;
    if (!subject || !chosen.value) return;
    emit('pick', picker.value?.mode === 'requires' ? { sourceId: chosen.value, targetId: subject } : { sourceId: subject, targetId: chosen.value });
    picker.value = null;
};
</script>

<template>
    <Dialog :open="picker !== null" @update:open="(open) => { if (!open) picker = null; }">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nueva relación académica</DialogTitle>
                <DialogDescription>Materia: «{{ current?.name }}». Elija la otra materia y luego el tipo de relación.</DialogDescription>
            </DialogHeader>
            <Field>
                <FieldLabel for="curriculum-relation-subject">{{ question }}</FieldLabel>
                <NativeSelect id="curriculum-relation-subject" v-model="chosen">
                    <NativeSelectOption value="" disabled>Seleccione una materia</NativeSelectOption>
                    <NativeSelectOption v-for="subject in options" :key="subject.id" :value="subject.id">
                        Ciclo {{ subject.cycle ? toRoman(subject.cycle) : '—' }} · {{ subject.code }} · {{ subject.name }}
                    </NativeSelectOption>
                </NativeSelect>
            </Field>
            <DialogFooter>
                <Button type="button" variant="outline" @click="picker = null">Cancelar</Button>
                <Button type="button" :disabled="!chosen" @click="confirm">Continuar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
