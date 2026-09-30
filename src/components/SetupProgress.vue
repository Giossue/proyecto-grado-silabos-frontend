<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { computed, onMounted, ref } from 'vue';
import { getDashboard, type SetupChecklist } from '@/api/dashboard';
import { paths } from '@/lib/routes';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const progress = ref<SetupChecklist | null>(null);
const percent = computed(() =>
    progress.value === null || progress.value.total === 0
        ? 100
        : Math.round((progress.value.done / progress.value.total) * 100),
);
const visible = computed(() =>
    progress.value !== null && progress.value.total > 0 && progress.value.done < progress.value.total,
);
const tone = computed(() =>
    percent.value < 34
        ? { bar: 'destructive' as const, text: 'text-destructive' }
        : percent.value < 67
          ? { bar: 'warning' as const, text: 'text-warning' }
          : { bar: 'success' as const, text: 'text-success' },
);

onMounted(async () => {
    try {
        progress.value = (await getDashboard()).setup;
    } catch {
        progress.value = null;
    }
});
</script>

<template>
    <Tooltip v-if="visible && progress">
        <TooltipTrigger as-child>
            <Button as-child variant="ghost" size="sm"><RouterLink :to="paths.dashboard" class="tabular-nums">
                <Progress :model-value="progress.done" :max="progress.total" :tone="tone.bar" class="h-1.5 w-20" :aria-label="`${progress.done} de ${progress.total} pasos de configuración`" />
                <span class="font-medium" :class="tone.text">{{ progress.done }}/{{ progress.total }}</span>
                <span class="sr-only">pasos de configuración del sistema completados</span>
            </RouterLink></Button>
        </TooltipTrigger>
        <TooltipContent>Configuración del sistema</TooltipContent>
    </Tooltip>
</template>
