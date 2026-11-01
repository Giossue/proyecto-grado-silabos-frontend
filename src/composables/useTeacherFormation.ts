import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { updateFormation } from '@/api/session';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

export const useTeacherFormation = () => {
    const formation = ref('');
    const saving = ref(false);
    const error = ref<string | undefined>(undefined);
    const saved = computed(() => sessionState.current.value?.user.formation ?? '');
    const changed = computed(() => formation.value.trim() !== saved.value && formation.value.trim() !== '');

    const reset = (): void => {
        formation.value = saved.value;
        error.value = undefined;
    };

    const save = async (): Promise<boolean> => {
        saving.value = true;
        error.value = undefined;
        try {
            sessionState.replace(await updateFormation(formation.value));
            toast.success('Formación y experiencia guardadas');

            return true;
        } catch (reason) {
            error.value = reason instanceof ApiError
                ? reason.errors.formacion_experiencia?.[0] ?? reason.message
                : 'No se pudo guardar la formación y experiencia';
            toast.error(error.value);

            return false;
        } finally {
            saving.value = false;
        }
    };

    return { formation, saving, error, changed, reset, save };
};
