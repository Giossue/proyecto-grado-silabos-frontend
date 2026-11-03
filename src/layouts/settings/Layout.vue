<script setup lang="ts">
import { ArrowLeft, Bell, Server, Settings, ShieldCheck, UserRound } from '@lucide/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { areaEmailNotices, areaForPath, areaSetting, paths, roleHome } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { sessionState } from '@/state/session';
import { settingsReturn } from '@/state/settingsReturn';

// Ancho de la tarjeta: el encabezado y las pestañas se alinean con ella (en px, igual que el encabezado).
const CONTENT_WIDTH = 576;

const route = useRoute();
const router = useRouter();
const area = computed(() => areaForPath(route.path));
const sidebarNavItems = computed(() => [
    { title: 'Perfil', href: area.value ? areaSetting(area.value, 'profile') : paths.configuration.profile, icon: UserRound },
    { title: 'Seguridad', href: area.value ? areaSetting(area.value, 'security') : paths.configuration.security, icon: ShieldCheck },
    // Avisos por correo: cada persona de Coordinación, Docente y Biblioteca elige los suyos.
    ...(area.value && areaEmailNotices(area.value) ? [{ title: 'Notificaciones', href: areaEmailNotices(area.value) as string, icon: Bell }] : []),
    // Ajustes del sistema (notificaciones, IA, biblioteca): solo Administración.
    ...(area.value === 'admin' ? [{ title: 'Sistema', href: paths.admin.system, icon: Server }] : []),
]);

// Vuelve a la pantalla de la que se vino; si se abrió Configuración directo, al inicio del rol.
const goBack = (): void => {
    void router.push(settingsReturn.value ?? roleHome(sessionState.current.value?.active_role?.code));
};
</script>

<template>
    <PageFrame
        title="Configuración"
        description="Administre su perfil y seguridad"
        size="wide"
        :icon="Settings"
        :header-width="CONTENT_WIDTH"
    >
        <template #eyebrow><Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack"><ArrowLeft aria-hidden="true" />Volver</Button></template>
        <div class="flex min-w-0 flex-col gap-6">
            <nav class="mx-auto flex h-11 w-full items-center justify-start gap-2 border-b" :style="{ maxWidth: `${CONTENT_WIDTH}px` }" aria-label="Configuración">
                <RouterLink
                    v-for="item in sidebarNavItems"
                    :key="item.href"
                    :to="item.href"
                    :class="cn(
                        'text-muted-foreground inline-flex h-full items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] hover:text-foreground focus-visible:ring-ring/50 focus-visible:ring-3 [&_svg]:size-4 [&_svg]:shrink-0',
                        route.path === item.href && 'border-foreground font-semibold text-foreground',
                    )"
                    :aria-current="route.path === item.href ? 'page' : undefined"
                >
                    <component :is="item.icon" aria-hidden="true" />
                    {{ item.title }}
                </RouterLink>
            </nav>

            <Card class="mx-auto w-full min-w-0 gap-12 px-6" :style="{ maxWidth: `${CONTENT_WIDTH}px` }">
                <slot />
            </Card>
        </div>
    </PageFrame>
</template>
