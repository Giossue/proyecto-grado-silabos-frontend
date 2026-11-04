<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAcademicGovernance, type AcademicGovernance, type AcademicEntity } from '@/api/academic';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import ImportSpreadsheetDialog from '@/components/domain/ImportSpreadsheetDialog.vue';
import CatalogRecordSheet from '@/components/domain/academic/CatalogRecordSheet.vue';
import CatalogSection from '@/components/domain/academic/CatalogSection.vue';
import { Building2, GraduationCap, Plus, TriangleAlert } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageFrame from '@/components/domain/PageFrame.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
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
    facultad: { title: 'Facultades', description: 'Las facultades de la universidad' },
    carrera: { title: 'Carreras', description: 'Las carreras y a qué facultad pertenece cada una' },
})[entity.value]);
const createLabel = computed(() => entity.value === 'facultad' ? 'Crear facultad' : 'Crear carrera');
const openCreationSheet = (): void => {
    if (entity.value === 'facultad') facultyOpen.value = true;
    else careerOpen.value = true;
};

const load = async (): Promise<void> => {
    loading.value = true; error.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'administrador') { await router.replace(paths.dashboard); return; }
        if (periodRoute.value) { await router.replace(paths.admin.convocations); return; }
        data.value = await getAcademicGovernance();
    } catch (reason) {
        error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las facultades y carreras';
    } finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
onMounted(load);
</script>

<template>
    <PageFrame :title="sectionContent.title" :description="sectionContent.description" :icon="tabIcons[entity]" size="wide" :loading="!data && !error" :actions-skeleton="loading && !data ? (entity === 'carrera' ? ['w-44', 'w-34'] : ['w-36']) : []">
        <template v-if="data?.convocation_in_progress" #banner><ProcessLockAlert banner hide-action :icon="TriangleAlert" title="Hay una convocatoria en curso" message="Si cambia una facultad o carrera, sus sílabos enviados o aprobados vuelven a Borrador" why="Los sílabos llevan datos de la facultad y de la carrera, como el logo, el nombre, el código y la modalidad. Si alguno cambia, los sílabos enviados o aprobados vuelven a Borrador para actualizarse con los datos nuevos." /></template>
        <template #actions>
            <ImportSpreadsheetDialog
                v-if="data && entity === 'carrera'"
                title="Importar carreras"
                kind="careers"
                template-name="plantilla-carreras.xlsx"
                :columns="[{ key: 'facultad', label: 'Facultad' }, { key: 'modalidad', label: 'Modalidad' }, { key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Nombre' }, { key: 'ciclos', label: 'Ciclos' }]"
                @imported="changed"
            />
            <Button
                v-if="data"
                type="button"
                class="w-full max-sm:size-14 max-sm:rounded-full max-sm:p-0 sm:w-auto"
                :aria-label="createLabel"
                @click="openCreationSheet"
            >
                <Plus data-icon="inline-start" aria-hidden="true" />
                <span class="max-sm:hidden">{{ createLabel }}</span>
            </Button>
        </template>

        <Tabs v-if="data || error" :model-value="entity" class="-mb-3" @update:model-value="selectTab">
            <TabsList class="h-11 justify-start">
                <TabsTrigger
                    v-for="item in routeSections" :key="item.value" :value="item.value"
                    class="flex-none gap-2 px-4 data-[state=active]:font-semibold"
                >
                    <component :is="tabIcons[item.value]" />{{ item.label }}
                </TabsTrigger>
            </TabsList>
        </Tabs>

    <LoadErrorState v-if="error" :message="error" @retry="load" />
        <LoadingSkeleton v-if="loading && !data && !error" variant="catalog" :tabs="2" :columns="entity === 'carrera' ? 4 : 3" :filters="entity === 'carrera' ? 2 : 1" :actions="false" filter-width="lg:w-44" :widths="entity === 'facultad' ? ['minmax(0, 2fr)', 'minmax(0, 1fr)', '5rem'] : undefined" />

        <CatalogSection v-if="data" :section="section" :catalogs="data.catalogs" :options="data.options" @changed="changed" />
    </PageFrame>
    <CatalogRecordSheet v-if="data" v-model:open="facultyOpen" :show-trigger="false" entity="facultad" :options="data.options" @saved="changed" />
    <CatalogRecordSheet v-if="data" v-model:open="careerOpen" :show-trigger="false" entity="carrera" :options="data.options" @saved="changed" />
</template>
