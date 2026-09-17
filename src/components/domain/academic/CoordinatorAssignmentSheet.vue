<script setup lang="ts">
import { UserPlus } from '@lucide/vue';
import { ref } from 'vue';
import { api, ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AcademicStructureProps } from '@/types/academic';

defineProps<Pick<AcademicStructureProps, 'options'>>();
const emit = defineEmits<{ saved: [message: string] }>();
const userId = ref(''); const careerId = ref(''); const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const submit = async (): Promise<void> => { processing.value = true; errors.value = {}; try { const result = await api<{ message: string }>('/admin/academic/asignacion_coordinador', { method: 'POST', body: JSON.stringify({ user_id: userId.value, career_id: careerId.value }) }); userId.value = ''; careerId.value = ''; emit('saved', result.message); } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; } finally { processing.value = false; } };
</script>

<template><FormSheet trigger-label="Asignar coordinación" title="Asignar coordinación de carrera" description="Seleccione la persona y la carrera que coordinará. La asignación anterior se conserva como inactiva."><template #default="{ close }"><form @submit.prevent="submit"><FieldGroup><Field :data-invalid="Boolean(errors.user_id)"><FieldLabel for="coordinator-user" required>Coordinador</FieldLabel><Select v-model="userId" required><SelectTrigger id="coordinator-user"><SelectValue placeholder="Seleccione una cuenta" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.coordinatorUsers" :key="item.id" :value="item.id">{{ item.name ?? item.nombre }} · {{ item.email ?? item.correo_electronico }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.user_id" /></Field><Field :data-invalid="Boolean(errors.career_id)"><FieldLabel for="coordinator-career" required>Carrera</FieldLabel><Select v-model="careerId" required><SelectTrigger id="coordinator-career"><SelectValue placeholder="Seleccione una carrera" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.careers" :key="item.id" :value="item.id">{{ item.nombre ?? item.name }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field><FormSheetActions :close="close" :processing="processing" :icon="UserPlus" label="Asignar coordinación" /></FieldGroup></form></template></FormSheet></template>
