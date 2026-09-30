<script setup lang="ts">
import AppLogoIcon from '@/components/AppLogoIcon.vue';

defineProps<{
    title?: string;
    description?: string;
}>();
</script>

<template>
    <div
        class="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0"
    >
        <div
            class="relative hidden h-full flex-col border-r border-border bg-brand-surface p-10 text-brand-foreground lg:flex"
        >
            <RouterLink
                to="/"
                class="relative z-20 flex items-center text-lg font-medium"
            >
                <AppLogoIcon class="mr-2 size-8 object-contain" />
                Sílabos UEB
            </RouterLink>
        </div>
        <div class="lg:p-8">
            <div
                class="mx-auto flex w-full flex-col justify-center gap-6 sm:w-87.5"
            >
                <div class="flex flex-col gap-2 text-center">
                    <h1 v-if="title" class="text-xl font-medium tracking-tight">
                        {{ title }}
                    </h1>
                    <p v-if="description" class="text-sm text-muted-foreground">
                        {{ description }}
                    </p>
                </div>
                <slot />
            </div>
        </div>
    </div>
</template>
