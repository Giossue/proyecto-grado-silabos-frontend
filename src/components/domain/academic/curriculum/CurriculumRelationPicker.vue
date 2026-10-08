<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { RelationMode } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        .filter((subject) => {
            const cycle = current.value?.cycle ?? 0;
            return picker.value?.mode === 'requires' ? (subject.cycle ?? 0) <= cycle : (subject.cycle ?? 0) >= cycle;
        })
        .sort((left, right) => (left.cycle ?? 0) - (right.cycle ?? 0) || left.position - right.position),
);
const groups = computed(() => {
    const byCycle = new Map<number, CurriculumBuilderSubject[]>();
    for (const subject of options.value) byCycle.set(subject.cycle ?? 0, [...(byCycle.get(subject.cycle ?? 0) ?? []), subject]);

    return [...byCycle.entries()].map(([cycle, subjects]) => ({ cycle, subjects }));
});
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
                <DialogDescription>Materia: «{{ current?.name }}». Elija la otra materia. Si está en un ciclo anterior será prerrequisito; si está en el mismo ciclo, correquisito.</DialogDescription>
            </DialogHeader>
            <Field>
                <FieldLabel for="curriculum-relation-subject">{{ question }}</FieldLabel>
                <Select v-model="chosen">
                    <SelectTrigger id="curriculum-relation-subject" class="w-full"><SelectValue placeholder="Seleccione una materia" /></SelectTrigger>
                    <SelectContent>
                        <SelectGroup v-for="group in groups" :key="group.cycle">
                            <SelectLabel>Ciclo {{ group.cycle ? toRoman(group.cycle) : '—' }}</SelectLabel>
                            <SelectItem v-for="subject in group.subjects" :key="subject.id" :value="subject.id">{{ subject.code }} · {{ subject.name }}</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </Field>
            <DialogFooter>
                <Button type="button" variant="outline" @click="picker = null">Cancelar</Button>
                <Button type="button" :disabled="!chosen" @click="confirm">Agregar relación</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
