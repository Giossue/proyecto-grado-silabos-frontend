<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps(nodeViewProps);
const objectUrl = ref<string | null>(null);
const loading = ref(false);
const failed = ref(false);
let controller: AbortController | null = null;

const sourceUrl = computed(() => typeof props.node.attrs.src === 'string' ? props.node.attrs.src : '');
const alt = computed(() => typeof props.node.attrs.alt === 'string' ? props.node.attrs.alt : 'Imagen');
const caption = computed(() => ['imagen', 'image'].includes(alt.value.toLocaleLowerCase()) ? '' : alt.value);

const release = (): void => {
    controller?.abort();
    controller = null;
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
};

const load = async (url: string): Promise<void> => {
    release();
    failed.value = false;
    if (!url) {
        failed.value = true;
        return;
    }
    loading.value = true;
    controller = new AbortController();
    try {
        const response = await fetch(url, {
            credentials: 'include',
            headers: { Accept: 'image/*' },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error('El recurso no es una imagen.');
        objectUrl.value = URL.createObjectURL(blob);
    } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) failed.value = true;
    } finally {
        loading.value = false;
    }
};

watch(sourceUrl, (url) => void load(url), { immediate: true });
onBeforeUnmount(release);
</script>

<template>
    <NodeViewWrapper as="figure" data-source-image contenteditable="false" data-drag-handle>
        <img v-if="objectUrl" :src="objectUrl" :alt="alt" :title="node.attrs.title" draggable="false" />
        <p v-else-if="loading" class="text-sm text-muted-foreground">Cargando imagen…</p>
        <p v-else-if="failed" class="text-sm text-destructive">No se pudo cargar esta imagen.</p>
        <figcaption v-if="caption">{{ caption }}</figcaption>
    </NodeViewWrapper>
</template>
