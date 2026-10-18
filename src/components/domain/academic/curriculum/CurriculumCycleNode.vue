<script setup lang="ts">
import { formatNumericDisplay } from '@/lib/numberDisplay';

defineProps<{
    data: {
        cycle: number;
        level: string;
        subjectCount: number;
        totalHours: number;
    };
}>();
</script>

<template>
    <section
        class="size-full cursor-grab overflow-hidden rounded-md ring-1 ring-surface-ring bg-[var(--curriculum-lane)] active:cursor-grabbing"
        :aria-label="`Nivel ${data.level}`"
    >
        <div class="flex h-full">
            <header
                class="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-r bg-[var(--curriculum-cycle-chrome)] p-3 text-center"
            >
                <span class="text-xs text-muted-foreground uppercase">
                    Nivel
                </span>
                <strong class="text-lg">{{ data.level }}</strong>
            </header>
            <div class="flex-1"></div>
            <div
                class="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-l bg-[var(--curriculum-cycle-chrome)] p-3 text-center"
            >
                <span class="text-xs text-muted-foreground">Asignaturas</span>
                <strong class="text-sm">{{ data.subjectCount }}</strong>
            </div>
            <div
                class="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-l bg-[var(--curriculum-cycle-chrome)] p-3 text-center"
            >
                <span class="text-xs text-muted-foreground">Total</span>
                <strong class="text-sm">
                    {{ formatNumericDisplay(data.totalHours) }}
                </strong>
            </div>
        </div>
    </section>
</template>
