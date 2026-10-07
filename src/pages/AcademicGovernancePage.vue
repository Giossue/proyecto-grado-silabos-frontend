<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAcademicGovernance, type AcademicGovernance, type AcademicEntity } from '@/api/academic';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import CatalogRecordSheet from '@/components/domain/academic/CatalogRecordSheet.vue';
import CatalogSection from '@/components/domain/academic/CatalogSection.vue';
import { Building2, ChevronDown, GraduationCap, Plus } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import type { GovernanceSection } from '@/types/academic';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const route = useRoute();
const data = ref<AcademicGovernance | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const facultyOpen = ref(false);
const careerOpen = ref(false);

type CatalogEntity = Exclude<AcademicEntity, 'periodo'>;
const sectionMap: Record<CatalogEntity, GovernanceSection> = { facultad: 'faculties', carrera: 'careers' };
const routeSections: Array<{ value: CatalogEntity; label: string }> = [
    { value: 'facultad', label: 'Facultades' }, { value: 'carrera', label: 'Carreras' },
];
const tabIcons = { facultad: Building2, carrera: GraduationCap };
const routeParamSections: Record<string, CatalogEntity> = { facultades: 'facultad', carreras: 'carrera' };
// Los periodos viven ahora en Convocatorias; las rutas antiguas redirigen allí.
const periodRoute = computed(() => route.query.seccion === 'periodo' || route.params.section === 'periodos-academicos');
const entity = computed<CatalogEntity>(() =>
    typeof route.query.seccion === 'string' && routeSections.some((item) => item.value === route.query.seccion)
        ? route.query.seccion as CatalogEntity
        : routeParamSections[String(route.params.section)] ?? 'facultad',
);
const section = computed(() => sectionMap[entity.value]);
const selectTab = (value: string | number): void => {
    void router.replace({ path: paths.admin.academic, query: { seccion: String(value) } });
};
const sectionContent = computed(() => ({
    facultad: { title: 'Facultades', description: 'Las facultades de la universidad y cuántas carreras tiene cada una.' },
    carrera: { title: 'Carreras', description: 'Las carreras y a qué facultad pertenece cada una.' },
})[entity.value]);

const load = async (): Promise<void> => {
    loading.value = true; error.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'administrador') { await router.replace(paths.dashboard); return; }
        if (periodRoute.value) { await router.replace(paths.admin.convocations); return; }
        data.value = await getAcademicGovernance();
    } catch (reason) {
        error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las facultades y carreras.';
    } finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
onMounted(load);
</script>

<template>
    <PageFrame :title="sectionContent.title" :description="sectionContent.description">
        <template #actions>
            <DropdownMenu v-if="data">
                <DropdownMenuTrigger as-child>
                    <Button type="button" class="w-full max-sm:size-14 max-sm:rounded-full max-sm:p-0 sm:w-auto" aria-label="Crear">
                        <Plus data-icon="inline-start" aria-hidden="true" />
                        <span class="max-sm:hidden">Crear</span>
                        <ChevronDown class="max-sm:hidden" data-icon="inline-end" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-max min-w-0">
                    <DropdownMenuGroup>
                        <DropdownMenuItem @select="facultyOpen = true">
                            <Building2 aria-hidden="true" />
                            Facultad
                        </DropdownMenuItem>
                        <DropdownMenuItem @select="careerOpen = true">
                            <GraduationCap aria-hidden="true" />
                            Carrera
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </template>

        <Tabs :model-value="entity" class="mb-4" @update:model-value="selectTab">
            <TabsList class="h-11 w-fit justify-start gap-2 bg-transparent p-0">
                <TabsTrigger
                    v-for="item in routeSections" :key="item.value" :value="item.value"
                    class="h-full flex-none gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:hover:bg-transparent"
                >
                    <component :is="tabIcons[item.value]" />{{ item.label }}
                </TabsTrigger>
            </TabsList>
        </Tabs>

    <LoadErrorState v-if="error" :message="error" @retry="load" />
        <LoadingSkeleton v-if="loading && !data" variant="catalog" :columns="entity === 'carrera' ? 5 : 3" :filters="1" />

        <CatalogSection v-if="data" :section="section" :catalogs="data.catalogs" :options="data.options" @changed="changed" />
    </PageFrame>
    <CatalogRecordSheet v-if="data" v-model:open="facultyOpen" :show-trigger="false" entity="facultad" :options="data.options" @saved="changed" />
    <CatalogRecordSheet v-if="data" v-model:open="careerOpen" :show-trigger="false" entity="carrera" :options="data.options" @saved="changed" />
</template>
