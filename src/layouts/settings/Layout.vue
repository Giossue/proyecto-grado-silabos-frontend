<script setup lang="ts">
import { Palette, ShieldCheck, UserRound } from '@lucide/vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const route = useRoute();
const prefix = computed(() => {
    if (route.path.startsWith('/admin/')) return '/admin';
    if (route.path.startsWith('/coordinacion/')) return '/coordinacion';
    if (route.path.startsWith('/docente/')) return '/docente';
    return '/configuracion';
});
const sidebarNavItems = computed(() => [
    { title: 'Perfil', href: `${prefix.value}/configuracion/perfil`, icon: UserRound },
    { title: 'Seguridad', href: `${prefix.value}/configuracion/seguridad`, icon: ShieldCheck },
    { title: 'Apariencia', href: `${prefix.value}/configuracion/apariencia`, icon: Palette },
]);
</script>

<template>
    <PageFrame
        title="Configuración"
        description="Administre su perfil, seguridad y preferencias visuales."
    >
        <div class="flex flex-col gap-6 lg:flex-row lg:gap-12">
            <aside class="w-full max-w-xl lg:w-48">
                <nav class="flex flex-col gap-1" aria-label="Configuración">
                    <Button
                        v-for="item in sidebarNavItems"
                        :key="item.href"
                        variant="ghost"
                        :class="[
                            'w-full justify-start',
                            { 'bg-muted': route.path === item.href },
                        ]"
                        as-child
                    >
                        <RouterLink :to="item.href">
                            <component :is="item.icon" class="size-4" />
                            {{ item.title }}
                        </RouterLink>
                    </Button>
                </nav>
            </aside>

            <Separator class="my-6 lg:hidden" />

            <div class="flex-1 md:max-w-2xl">
                <section class="flex max-w-xl flex-col gap-12">
                    <slot />
                </section>
            </div>
        </div>
    </PageFrame>
</template>
