<script setup lang="ts">
import { Settings2 } from '@lucide/vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Button } from '@/components/ui/button';
import type { CurriculumBuilderProps } from '@/types/academic';

defineProps<Pick<CurriculumBuilderProps, 'curriculum'>>();
const emit = defineEmits<{ configure: [] }>();
</script>

<template>
    <!-- El span recibe el hover aunque el botón esté desactivado. -->
    <IconTooltip label="Configurar ciclos">
        <span class="inline-flex">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Configurar ciclos"
                :disabled="Boolean(curriculum.lock_reason)"
                @click="emit('configure')"
            >
                <Settings2 aria-hidden="true" />
            </Button>
        </span>
    </IconTooltip>
</template>
