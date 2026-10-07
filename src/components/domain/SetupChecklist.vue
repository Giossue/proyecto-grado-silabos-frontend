<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RouterLink } from 'vue-router';
import { ArrowRight, Check, Circle, Play, Settings } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { paths } from '@/lib/routes';

export type SetupStep = {
    key: string;
    label: string;
    hint: string;
    done: boolean;
    href?: string;
    action: string | null;
};

export type Setup = {
    title: string;
    intro: string;
    done: number;
    total: number;
    steps: SetupStep[];
};

const props = defineProps<{ setup: Setup }>();
const emit = defineEmits<{ action: [action: string] }>();

const nextKey = computed(
    () => props.setup.steps.find((step) => !step.done)?.key ?? null,
);
</script>

<template>
    <Card v-if="setup.total > 0 && setup.done < setup.total">
        <CardHeader>
            <CardTitle>{{ setup.title }}</CardTitle>
            <CardDescription v-if="setup.intro">{{
                withoutEndPeriod(setup.intro)
            }}</CardDescription>
            <div class="flex items-center gap-3 pt-1">
                <Progress :model-value="setup.done" :max="setup.total" class="flex-1" :aria-label="`${setup.done} de ${setup.total} pasos`" />
                <span class="text-sm text-muted-foreground tabular-nums">
                    {{ setup.done }} de {{ setup.total }}
                </span>
            </div>
        </CardHeader>
        <CardContent>
            <ol class="flex flex-col gap-2">
                <li
                    v-for="(step, index) in setup.steps"
                    :key="step.key"
                    class="flex items-start gap-3 rounded-lg p-2"
                    :class="{
                        'bg-muted/60 ring-1 ring-border': step.key === nextKey,
                    }"
                >
                    <Badge size="step" :variant="step.done ? 'default' : step.key === nextKey ? 'outline' : 'secondary'" class="mt-0.5">
                        <Check v-if="step.done" aria-hidden="true" /><template v-else>{{ index + 1 }}</template>
                    </Badge>
                    <div class="min-w-0 flex-1">
                        <p
                            class="text-sm font-medium"
                            :class="{
                                'text-muted-foreground line-through': step.done,
                            }"
                        >
                            {{ withoutEndPeriod(step.label) }}
                        </p>
                        <p
                            v-if="!step.done"
                            class="text-sm text-muted-foreground"
                        >
                            {{ withoutEndPeriod(step.hint) }}
                        </p>
                    </div>
                    <Button
                        v-if="step.key === nextKey && step.action"
                        type="button"
                        size="sm"
                        class="shrink-0"
                        @click="emit('action', step.action)"
                    >
                        <Play v-if="step.action === 'open_convocation'" data-icon="inline-start" aria-hidden="true" />
                        <Settings v-else data-icon="inline-start" aria-hidden="true" />
                        {{ step.action === 'open_convocation' ? 'Abrir convocatoria' : 'Configurar' }}
                    </Button>
                    <Button
                        v-else-if="step.key === nextKey"
                        as-child
                        size="sm"
                        class="shrink-0"
                    >
                        <RouterLink :to="step.href ?? paths.dashboard">
                            Ir
                            <ArrowRight
                                data-icon="inline-end"
                                aria-hidden="true"
                            />
                        </RouterLink>
                    </Button>
                    <Circle
                        v-else-if="!step.done"
                        class="mt-1 size-3 shrink-0 text-muted-foreground/50"
                        aria-hidden="true"
                    />
                </li>
            </ol>
        </CardContent>
    </Card>
</template>
