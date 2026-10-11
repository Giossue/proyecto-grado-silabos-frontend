<script setup lang="ts">
import { UserRoundCog } from '@lucide/vue';
import { computed, ref } from 'vue';
import { replaceCareerCoordinator } from '@/api/academic';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Option } from '@/types/academic';

const props = defineProps<{ careerId: string; careerName: string; coordinator: { id: string; name: string } | null; users: Option[] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const incomingUserId = ref('');
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const candidates = computed(() => props.users.filter((user) => user.id !== props.coordinator?.id));
const submit = async (): Promise<void> => {
    processing.value = true; errors.value = {};
    try {
        const result = await replaceCareerCoordinator(props.careerId, incomingUserId.value);
        open.value = false; incomingUserId.value = ''; emit('saved', result.message);
    } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; }
    finally { processing.value = false; }
};
</script>

<template>
    <FormSheet v-model:open="open" :trigger-label="coordinator ? 'Reemplazar coordinador' : 'Asignar coordinador'" :title="coordinator ? `Reemplazar la coordinación de ${careerName}` : `Asignar la coordinación de ${careerName}`" :show-trigger="false">
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.incoming_user_id)"><FieldLabel :for="`coordinator-incoming-${careerId}`" required>Persona entrante</FieldLabel><Select v-model="incomingUserId" required><SelectTrigger :id="`coordinator-incoming-${careerId}`"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="user in candidates" :key="user.id" :value="user.id">{{ user.nombre }} <span class="text-muted-foreground">· {{ user.correo_electronico }}</span></SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.incoming_user_id" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="UserRoundCog" :label="coordinator ? 'Reemplazar coordinación' : 'Asignar coordinación'" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
