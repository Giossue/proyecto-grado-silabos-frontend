<script setup lang="ts">
import { ref } from 'vue';
import { ApiError, api } from '@/api/client';
import { requestPurgeConfirmation } from '@/composables/usePurgeConfirmation';

const props = withDefaults(defineProps<{
    action: string;
    method?: string;
    resetOnSuccess?: boolean;
}>(), { method: 'post', resetOnSuccess: false });

const emit = defineEmits<{ success: []; error: [errors: Record<string, string>] }>();
const processing = ref(false);
const errors = ref<Record<string, string>>({});

const send = async (form: HTMLFormElement, confirmed = false): Promise<void> => {
    const data = new FormData(form);
    if (confirmed) data.set('confirm_purge', '1');
    processing.value = true;
    errors.value = {};
    try {
        await api(props.action, { method: props.method.toUpperCase(), body: data });
        if (props.resetOnSuccess) form.reset();
        window.dispatchEvent(new CustomEvent('silabos:template-changed'));
        emit('success');
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(
                Object.entries(reason.errors).map(([key, values]) => [key, values[0] ?? reason.message]),
            );
            if (errors.value.purge_required) {
                requestPurgeConfirmation(
                    errors.value.purge_required,
                    Number(errors.value.purge_count ?? 0),
                    () => send(form, true),
                    undefined,
                    errors.value.purge_mode,
                );
            }
        } else {
            errors.value = { request: 'No se pudo completar la solicitud' };
        }
        emit('error', errors.value);
    } finally {
        processing.value = false;
    }
};

const submit = (event: Event): void => {
    void send(event.currentTarget as HTMLFormElement);
};
</script>

<template>
    <form @submit.prevent="submit">
        <slot :errors="errors" :processing="processing" />
    </form>
</template>
