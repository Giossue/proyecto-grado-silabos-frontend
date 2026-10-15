<script setup lang="ts">
import { Check, ListFilter, X } from '@lucide/vue';
import { onBeforeUnmount, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const open = ref(false);
const activeCount = ref(0);
const panel = useTemplateRef<HTMLElement>('panel');

const recount = (): void => {
    const node = panel.value;

    if (node === null) {
        return;
    }

    activeCount.value = Array.from(
        node.querySelectorAll<HTMLSelectElement | HTMLInputElement>(
            'select, input[type="hidden"]',
        ),
    ).filter((field) => field.value !== '' && field.value !== 'all').length;
};

const close = (): void => {
    open.value = false;
};

const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
        close();
    }
};

watch(open, (isOpen) => {
    if (isOpen) {
        recount();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return;
    }

    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
});
</script>

<template>
    <div class="contents sm:hidden">
        <Button
            type="button"
            variant="outline"
            class="w-full"
            :aria-expanded="open"
            @click="
                open = true;
                recount();
            "
        >
            Filtros
            <Badge v-if="activeCount > 0" variant="secondary" class="ml-1">
                {{ activeCount }}
            </Badge>
        </Button>

        <div
            v-show="open"
            class="fixed inset-0 z-50 bg-overlay/50"
            aria-hidden="true"
            @click="close"
        />
    </div>

    <div
        ref="panel"
        :class="
            cn(
                // El reparto en pantalla ancha lo decide quien usa el componente.
                attrs.class as string,
                // Estrecho: panel que baja desde arriba, sobre el resto.
                'max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:z-50 max-sm:max-h-(--filter-sheet-max-height)',
                'max-sm:flex max-sm:flex-col max-sm:gap-3 max-sm:overflow-hidden',
                'max-sm:rounded-b-xl max-sm:bg-card max-sm:p-4',
                // Por debajo de la barra de estado, no detrás de ella.
                'max-sm:pt-(--safe-header-inset)',
                'max-sm:shadow-modal max-sm:ring-1 max-sm:ring-surface-ring',
                !open && 'max-sm:hidden',
            )
        "
        role="group"
        aria-label="Filtros de la tabla"
        @change="recount"
    >
        <div class="flex items-center justify-between sm:hidden">
            <span class="flex items-center gap-2 font-medium">
                <ListFilter class="size-4" aria-hidden="true" />
                Filtros
            </span>
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar filtros"
                @click="close"
            >
                <X aria-hidden="true" />
            </Button>
        </div>

        <div
            class="max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col max-sm:gap-4 max-sm:overflow-y-auto sm:contents"
        >
            <slot />
        </div>

        <Button
            type="button"
            class="mt-2 w-full shrink-0 sm:hidden"
            @click="close"
        >
            <Check data-icon="inline-start" aria-hidden="true" />
            Ver resultados
        </Button>
    </div>
</template>
