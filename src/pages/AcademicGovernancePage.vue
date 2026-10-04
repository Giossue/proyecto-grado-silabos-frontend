<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAcademicGovernance, type AcademicGovernance, type AcademicEntity } from '@/api/academic';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import CatalogRecordSheet from '@/components/domain/academic/CatalogRecordSheet.vue';
import CatalogSection from '@/components/domain/academic/CatalogSection.vue';
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

type CatalogEntity = Exclude<AcademicEntity, 'periodo'>;
const sectionMap: Record<CatalogEntity, GovernanceSection> = { facultad: 'faculties', carrera: 'careers' };
const routeSections: Array<{ value: CatalogEntity; label: string }> = [
    { value: 'facultad', label: 'Facultades' }, { value: 'carrera', label: 'Carreras' },
];
const routeParamSections: Record<string, CatalogEntity> = { facultades: 'facultad', carreras: 'carrera' };
// Los periodos viven ahora en Convocatorias; las rutas antiguas redirigen allí.
const periodRoute = computed(() => route.query.seccion === 'periodo' || route.params.section === 'periodos-academicos');
const entity = computed<CatalogEntity>(() =>
    typeof route.query.seccion === 'string' && routeSections.some((item) => item.value === route.query.seccion)
        ? route.query.seccion as CatalogEntity
        : routeParamSections[String(route.params.section)] ?? 'facultad',
);
const section = computed(() => sectionMap[entity.value]);
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
        error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la estructura académica.';
    } finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
onMounted(load);
</script>

<template>
    <PageFrame :title="sectionContent.title" :description="sectionContent.description">
        <template #actions>
        <CatalogRecordSheet v-if="data" :entity="entity" :options="data.options" @saved="changed" />
        </template>

    <LoadErrorState v-if="error" :message="error" @retry="load" />
        <LoadingSkeleton v-if="loading && !data" variant="catalog" :columns="entity === 'carrera' ? 7 : 5" />

        <CatalogSection v-if="data" :section="section" :catalogs="data.catalogs" :options="data.options" @changed="changed" />
    </PageFrame>
</template>
