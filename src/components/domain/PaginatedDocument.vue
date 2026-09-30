<script setup lang="ts">
import { DOCUMENT_DEFAULTS } from '@/lib/documentDefaults';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    A4_PAGE,
    createDocumentPaginator,
    LETTER_PAGE,
} from '@/lib/documentPagination';

const props = withDefaults(
    defineProps<{
        orientation?: 'portrait' | 'landscape';
        paperSize?: 'a4' | 'letter';
        marginCm?: number;
        fontFamily?: string;
        fontSize?: number;
        textColor?: string;
        showPageNumbers?: boolean;
        startPage?: number;
    }>(),
    {
        orientation: 'portrait',
        paperSize: 'letter',
        marginCm: DOCUMENT_DEFAULTS.marginCm,
        fontFamily: DOCUMENT_DEFAULTS.fontFamily,
        fontSize: DOCUMENT_DEFAULTS.fontSize,
        textColor: 'var(--document-text)',
        showPageNumbers: true,
        startPage: 1,
    },
);

const emit = defineEmits<{ pages: [count: number] }>();

const page = computed(() => ({
    width:
        props.orientation === 'landscape'
            ? (props.paperSize === 'a4' ? A4_PAGE.height : LETTER_PAGE.height)
            : (props.paperSize === 'a4' ? A4_PAGE.width : LETTER_PAGE.width),
    height:
        props.orientation === 'landscape'
            ? (props.paperSize === 'a4' ? A4_PAGE.width : LETTER_PAGE.width)
            : (props.paperSize === 'a4' ? A4_PAGE.height : LETTER_PAGE.height),
    margin: (props.marginCm * 96) / 2.54,
    gap: (props.paperSize === 'a4' ? A4_PAGE : LETTER_PAGE).gap,
}));

const content = ref<HTMLElement | null>(null);
const pages = ref(1);
let frame = 0;
let rerun = false;
let disposed = false;
let resize: ResizeObserver | undefined;
let mutations: MutationObserver | undefined;
let paginator: ReturnType<typeof createDocumentPaginator> | undefined;
let measuredWidth = 0;
let measuredHeight = 0;

const rememberContentSize = () => {
    const rect = content.value?.getBoundingClientRect();

    if (!rect) {
        return;
    }

    measuredWidth = rect.width;
    measuredHeight = rect.height;
};

const schedule = () => {
    if (disposed) {
        return;
    }

    if (frame) {
        rerun = true;

        return;
    }

    frame = requestAnimationFrame(() => {
        frame = 0;
        mutations?.disconnect();
        pages.value = paginator?.paginate() ?? 1;
        rememberContentSize();
        observeContent();

        if (rerun) {
            rerun = false;
            schedule();
        }
    });
};

const observeContent = () => {
    if (!content.value) {
        return;
    }

    mutations?.observe(content.value, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'src', 'rowspan', 'colspan'],
    });
};

onMounted(() => {
    if (!content.value) {
        return;
    }

    paginator = createDocumentPaginator(content.value, () => page.value);
    mutations = new MutationObserver(() => {
        if (paginator?.hasGeometryChanged() ?? true) {
            schedule();
        }
    });
    observeContent();
    rememberContentSize();
    resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;

        if (
            Math.abs(width - measuredWidth) <= 0.5 &&
            Math.abs(height - measuredHeight) <= 0.5
        ) {
            return;
        }

        measuredWidth = width;
        measuredHeight = height;
        schedule();
    });
    resize.observe(content.value);
    content.value.addEventListener('load', schedule, true);
    const fontSet = document.fonts;
    fontSet?.ready.then(schedule);
    fontSet?.addEventListener('loadingdone', schedule);
    schedule();
});

watch(page, schedule);
watch(pages, (count) => emit('pages', count), { immediate: true });

onBeforeUnmount(() => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize?.disconnect();
    mutations?.disconnect();
    content.value?.removeEventListener('load', schedule, true);
    document.fonts?.removeEventListener('loadingdone', schedule);
    paginator?.reset();
});
</script>

<template>
    <div
        class="paged-document mx-auto"
        :style="{
            '--page-width': `${page.width}px`,
            '--page-height': `${page.height}px`,
            '--page-margin': `${page.margin}px`,
            '--page-gap': `${page.gap}px`,
            width: `${page.width}px`,
            minHeight: `${pages * (page.height + page.gap) - page.gap}px`,
            color: textColor,
            fontFamily,
            fontSize: `${fontSize}pt`,
        }"
    >
        <div class="paged-document-papers" aria-hidden="true">
            <div v-for="page in pages" :key="page" class="paged-document-paper">
                <span v-if="props.showPageNumbers" class="paged-document-number">{{ page + props.startPage - 1 }}</span>
            </div>
        </div>
        <div ref="content" class="paged-document-content">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.paged-document {
    position: relative;
    width: var(--page-width);
    padding: var(--page-margin);
    box-sizing: border-box;
    line-height: var(--document-line-height);
}

.paged-document-papers {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: var(--page-gap);
    pointer-events: none;
}

.paged-document-paper {
    position: relative;
    height: var(--page-height);
    flex-shrink: 0;
    background: var(--document-paper);
    box-shadow: var(--document-paper-shadow);
}

.paged-document-number {
    position: absolute;
    right: var(--page-margin);
    bottom: var(--document-page-number-inset);
    color: var(--document-muted-text);
    font-size: var(--document-page-number-size);
}

.paged-document-content {
    position: relative;
    display: flow-root;
}
</style>
