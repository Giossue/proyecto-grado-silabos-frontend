<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

type Props = {
    href?: RouteLocationRaw;
    as?: 'button';
    tabindex?: number;
};

const props = defineProps<Props>();
const component = computed(() => props.as === 'button' ? 'button' : 'RouterLink');
</script>

<template>
    <component
        :is="component"
        :to="as === 'button' ? undefined : href"
        :type="as === 'button' ? 'button' : undefined"
        :tabindex="tabindex"
        class="cursor-pointer text-foreground underline decoration-border underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current"
    >
        <slot />
    </component>
</template>
