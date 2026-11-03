<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { Check, ListFilter, X } from '@lucide/vue';
import { onBeforeUnmount, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { afterDialogExit } from '@/lib/dialogExit';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const open = ref(false);
// Sigue visible mientras se desvanece, igual que los modales.
const shown = ref(false);
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

watch(open, async (isOpen) => {
    if (isOpen) {
        shown.value = true;
        recount();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return;
    }

    window.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    await afterDialogExit();
    if (!open.value) shown.value = false;
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

        <Transition
            enter-active-class="animate-in fade-in-0 duration-200"
            leave-active-class="animate-out fade-out-0 duration-200"
        >
            <div
                v-show="open"
                class="fixed inset-0 z-50 bg-overlay/50"
                aria-hidden="true"
                @click="close"
            />
        </Transition>
    </div>

    <div
        ref="panel"
        :class="
            cn(
                attrs.class as string,
                'max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-50 max-sm:max-h-(--filter-sheet-max-height)',
                'max-sm:flex max-sm:flex-col max-sm:gap-3 max-sm:overflow-hidden',
                'max-sm:rounded-t-xl max-sm:bg-card max-sm:p-4',
                'max-sm:pb-(--safe-footer-inset)',
                'max-sm:shadow-modal max-sm:ring-1 max-sm:ring-surface-ring',
                'max-sm:duration-200 max-sm:data-[state=open]:animate-in max-sm:data-[state=open]:fade-in-0 max-sm:data-[state=open]:slide-in-from-bottom',
                'max-sm:data-[state=closed]:animate-out max-sm:data-[state=closed]:fade-out-0 max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=closed]:fill-mode-forwards',
                !shown && 'max-sm:hidden',
            )
        "
        :data-state="open ? 'open' : 'closed'"
        role="group"
        aria-label="Filtros de la tabla"
        @change="recount"
    >
        <div class="flex items-center justify-between sm:hidden">
            <span class="flex items-center gap-2 font-medium">
                <ListFilter class="size-4" aria-hidden="true" />
                Filtros
            </span>
            <IconTooltip label="Cerrar filtros"><Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Cerrar filtros"
                @click="close"
            >
                <X aria-hidden="true" />
            </Button></IconTooltip>
        </div>

        <div
            class="max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col max-sm:gap-4 max-sm:overflow-y-auto sm:contents"
        >
            <slot />
        </div>

        <div class="-mx-4 shrink-0 border-t px-4 pt-4 sm:hidden">
            <Button type="button" class="w-full" @click="close">
                <Check data-icon="inline-start" aria-hidden="true" />
                Ver resultados
            </Button>
        </div>
    </div>
</template>
