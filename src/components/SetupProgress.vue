<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getDashboard, type SetupChecklist } from '@/api/dashboard';
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
        ? { bar: 'bg-destructive', text: 'text-destructive' }
        : percent.value < 67
          ? { bar: 'bg-amber-500', text: 'text-amber-600' }
          : { bar: 'bg-emerald-600', text: 'text-emerald-700' },
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
            <RouterLink
                to="/dashboard"
                class="flex h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground tabular-nums hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                <span class="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span class="block h-full rounded-full transition-[width]" :class="tone.bar" :style="{ width: `${percent}%` }" />
                </span>
                <span class="font-medium" :class="tone.text">{{ progress.done }}/{{ progress.total }}</span>
                <span class="sr-only">pasos de configuración del sistema completados</span>
            </RouterLink>
        </TooltipTrigger>
        <TooltipContent>Configuración del sistema</TooltipContent>
    </Tooltip>
</template>
