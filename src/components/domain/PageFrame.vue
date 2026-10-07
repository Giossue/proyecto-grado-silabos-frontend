<script setup lang="ts">
import { Plus, X } from '@lucide/vue';
import type { CSSProperties, VNode } from 'vue';
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
import { useActiveNavItem } from '@/composables/useMainNavItems';
import { useScrollDirection } from '@/composables/useScrollDirection';
import { usePageTitle } from '@/composables/usePageBreadcrumbs';
import { cn } from '@/lib/utils';

const props = withDefaults(
    defineProps<{
        title: string;
        description: string;
        size?: 'full' | 'wide' | 'narrow';
        headerWidth?: number;
    }>(),
    {
        size: 'full',
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

const actionCount = computed(() => countActions(slots.actions?.() ?? []));

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
    <div
        :class="
            cn(
                'flex min-w-0 flex-col gap-6 overflow-x-clip p-4 sm:p-6',
                // Sitio para que el botón flotante no tape la última fila de una tabla.
                actionCount > 0 &&
                    'max-sm:pb-(--page-mobile-actions-inset)',
                widthClass,
            )
        "
    >
        <header
            :class="cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', headerWidth && 'mx-auto')"
            :style="headerStyle"
        >
            <div class="flex min-w-0 flex-1 flex-col gap-2">
                <div v-if="$slots.eyebrow" class="-mt-1">
                    <slot name="eyebrow" />
                </div>

                <div class="flex items-start gap-3">
                    <div
                        v-if="navItem?.icon"
                        class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                        aria-hidden="true"
                    >
                        <component :is="navItem.icon" class="size-5" />
                    </div>
                    <div class="flex min-w-0 flex-col gap-1">
                        <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
                        <p v-if="description" class="max-w-3xl text-muted-foreground">
                            {{ description }}
                        </p>
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
                        // Columna normal, no invertida: el disparador es el último del DOM y así queda
                        // abajo, al alcance del pulgar, con las opciones desplegándose hacia arriba.
                        // Separado del borde por la franja del sistema —la barra de
                        // gestos, la rayita del inicio— además de su propio margen. Hoy
                        // esa franja mide cero porque la página no se dibuja debajo de
                        // ella; el día que alguien lo permita, el botón no queda tapado.
                        'max-sm:fixed max-sm:z-40 max-sm:w-auto max-sm:flex-col max-sm:items-end',
                        'max-sm:right-(--page-mobile-actions-right) max-sm:bottom-(--safe-footer-inset)',
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
                            // Las acciones se apilan sobre el disparador y solo existen
                            // cuando está desplegado.
                            needsTrigger &&
                                !expanded &&
                                'max-sm:hidden max-sm:[&>*]:hidden',
                            'max-sm:[&>*]:shadow-menu',
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
</template>
