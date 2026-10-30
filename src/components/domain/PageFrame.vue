<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
import { Plus, X } from '@lucide/vue';
import type { Component, CSSProperties, VNode } from 'vue';
import {
    computed,
    Fragment,
    onUnmounted,
    ref,
    useSlots,
    watch,
    watchEffect,
} from 'vue';
import { useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveNavItem } from '@/composables/useMainNavItems';
import { useScrollDirection } from '@/composables/useScrollDirection';
import { usePageTitle } from '@/composables/usePageBreadcrumbs';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        title: string;
        description: string;
        size?: 'full' | 'wide' | 'narrow';
        headerWidth?: number;
        headerClass?: string;
        icon?: Component;
        hideIcon?: boolean;
        loading?: boolean;
    }>(),
    {
        size: 'full',
        loading: false,
    },
);

const widthClass = computed(
    () =>
        ({
            full: '',
            wide: 'mx-auto w-full max-w-6xl',
            narrow: 'mx-auto w-full max-w-4xl',
        })[props.size],
);
const headerStyle = computed<CSSProperties | undefined>(() =>
    props.headerWidth
        ? { width: `${props.headerWidth}px`, maxWidth: '100%' }
        : undefined,
);

const pageTitle = usePageTitle();
const navItem = useActiveNavItem();
const headerIcon = computed(() => props.hideIcon ? null : props.icon ?? navItem.value?.icon ?? null);

watchEffect(() => {
    pageTitle.value = props.title;
});

onUnmounted(() => {
    if (pageTitle.value === props.title) pageTitle.value = '';
});

const slots = useSlots();

const countActions = (nodes: VNode[]): number =>
    nodes.reduce((total, node) => {
        if (node.type === Fragment) {
            return total + countActions((node.children ?? []) as VNode[]);
        }

        if (typeof node.type === 'symbol') {
            return total;
        }

        return total + 1;
    }, 0);

const actionCount = computed(() => props.loading ? 0 : countActions(slots.actions?.() ?? []));

const needsTrigger = computed(() => actionCount.value > 1);

const expanded = ref(false);
const { hidden } = useScrollDirection();
const route = useRoute();

watch(() => route.fullPath, () => {
    expanded.value = false;
});

const floatingHidden = computed(() => hidden.value && !expanded.value);
</script>

<template>
    <div class="contents">
    <div v-if="$slots.banner" class="flex flex-col">
        <slot name="banner" />
    </div>
    <div
        v-bind="$attrs"
        :class="
            cn(
                'flex min-w-0 flex-col gap-6 overflow-x-clip p-4 sm:p-6',
                actionCount > 0 &&
                    'max-sm:pb-(--page-mobile-actions-inset)',
                widthClass,
            )
        "
    >
        <header
            :class="cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', headerWidth && 'mx-auto', headerClass)"
            :style="headerStyle"
        >
            <div class="flex min-w-0 flex-1 flex-col gap-2">
                <div v-if="$slots.eyebrow" class="-mt-1">
                    <slot name="eyebrow" />
                </div>

                <div class="flex items-center gap-3">
                    <div
                        v-if="headerIcon && title"
                        class="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"
                        aria-hidden="true"
                    >
                        <component :is="headerIcon" class="size-5" />
                    </div>
                    <div class="flex min-w-0 flex-col gap-1">
                        <h1 v-if="title" class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
                        <Skeleton v-else-if="loading" data-skeleton="page-title" class="h-8 w-72 max-w-full" />
                        <p v-if="description" class="max-w-3xl text-muted-foreground">
                            {{ withoutEndPeriod(description) }}
                        </p>
                        <Skeleton v-else-if="loading" data-skeleton="page-description" class="h-6 w-96 max-w-full" />
                    </div>
                </div>
                <div
                    v-if="$slots.meta"
                    class="flex flex-wrap items-center gap-2 pt-1"
                >
                    <slot name="meta" />
                </div>
            </div>

            <div
                v-if="actionCount > 0"
                :class="
                    cn(
                        'flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end',
                        'max-sm:fixed max-sm:z-40 max-sm:w-auto max-sm:flex-col max-sm:items-end',
                        'max-sm:right-(--page-mobile-actions-right) max-sm:bottom-(--page-mobile-actions-bottom)',
                        'max-sm:transition-all max-sm:duration-200 max-sm:ease-out',
                        floatingHidden &&
                            'max-sm:pointer-events-none max-sm:translate-y-24 max-sm:opacity-0',
                    )
                "
            >
                <div
                    :class="
                        cn(
                            'contents',
                            needsTrigger &&
                                !expanded &&
                                'max-sm:hidden max-sm:[&>*]:hidden',
                            'max-sm:[&>*]:shadow-menu',
                            !needsTrigger &&
                                'max-sm:[&_button]:size-14 max-sm:[&_button]:rounded-full max-sm:[&_button]:gap-0 max-sm:[&_button]:p-0 max-sm:[&_button]:text-[length:0] max-sm:[&_button]:[&_svg]:size-5',
                        )
                    "
                >
                    <slot name="actions" />
                </div>

                <Button
                    v-if="needsTrigger"
                    type="button"
                    class="size-14 rounded-full p-0 shadow-menu sm:hidden"
                    :aria-expanded="expanded"
                    :aria-label="
                        expanded
                            ? 'Cerrar acciones de la pantalla'
                            : `Ver ${actionCount} acciones de la pantalla`
                    "
                    @click="expanded = !expanded"
                >
                    <component :is="expanded ? X : Plus" aria-hidden="true" />
                </Button>
            </div>
        </header>

        <slot />
    </div>
    </div>
</template>
