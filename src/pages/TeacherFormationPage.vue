<script setup lang="ts">
import { GraduationCap, Save } from '@lucide/vue';
import { computed, watch } from 'vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TeacherFormationField from '@/components/domain/identity/TeacherFormationField.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useTeacherFormation } from '@/composables/useTeacherFormation';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { sessionState } from '@/state/session';

const user = computed(() => sessionState.current.value?.user);
const { formation, saving, error, changed, reset, save } = useTeacherFormation();

watch(user, reset, { immediate: true });
</script>

<template>
    <SettingsLayout :loading="!user">
        <LoadingSkeleton v-if="!user" variant="settings" settings-section="email" :rows="0" />
        <div v-else data-tour="teacher-formation" class="flex flex-col gap-6">
            <div class="flex items-center gap-3">
                <GraduationCap class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div class="flex flex-col gap-0.5">
                    <h2 class="font-medium">Formación y experiencia académica</h2>
                    <p class="text-sm text-muted-foreground">Lo que aparece en sus sílabos como perfil del docente</p>
                </div>
            </div>
            <form class="flex flex-col gap-4" @submit.prevent="save">
                <TeacherFormationField v-model="formation" :error="error" />
                <div>
                    <Button :disabled="saving || !changed" data-test="update-formation-button">
                        <Spinner v-if="saving" data-icon="inline-start" />
                        <Save v-else data-icon="inline-start" aria-hidden="true" />
                        Guardar
                    </Button>
                </div>
            </form>
        </div>
    </SettingsLayout>
</template>
