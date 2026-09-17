<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAcademicGovernance, type AcademicGovernance, type AcademicEntity } from '@/api/academic';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import CatalogRecordSheet from '@/components/domain/academic/CatalogRecordSheet.vue';
import CatalogSection from '@/components/domain/academic/CatalogSection.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GovernanceSection } from '@/types/academic';

const router = useRouter();
const route = useRoute();
const data = ref<AcademicGovernance | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const message = ref<string | null>(null);

const sectionMap: Record<AcademicEntity, GovernanceSection> = {
    facultad: 'faculties', carrera: 'careers', campus: 'campuses', periodo: 'academic-periods',
};
const routeSections: Array<{ value: AcademicEntity; label: string }> = [
    { value: 'facultad', label: 'Facultades' }, { value: 'campus', label: 'Campus' },
    { value: 'carrera', label: 'Carreras' }, { value: 'periodo', label: 'Períodos' },
];
const routeParamSections: Record<string, AcademicEntity> = {
    facultades: 'facultad', campus: 'campus', carreras: 'carrera', 'periodos-academicos': 'periodo',
};
const entity = computed<AcademicEntity>(() =>
    typeof route.query.seccion === 'string' && routeSections.some((item) => item.value === route.query.seccion)
        ? route.query.seccion as AcademicEntity
        : routeParamSections[String(route.params.section)] ?? 'facultad',
);
const section = computed(() => sectionMap[entity.value]);
const sectionContent = computed(() => ({
    facultad: { title: 'Facultades', description: 'Las facultades de la universidad y cuántas carreras tiene cada una.' },
    carrera: { title: 'Carreras', description: 'Las carreras y a qué facultad pertenece cada una.' },
    campus: { title: 'Campus', description: 'Las sedes donde se dictan clases.' },
    periodo: { title: 'Periodos académicos', description: 'Los periodos lectivos y sus fechas. El ciclo de una materia no va aquí, va en la malla.' },
})[entity.value]);

const load = async (): Promise<void> => {
    loading.value = true; error.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'administrador') { await router.replace('/dashboard'); return; }
        data.value = await getAcademicGovernance();
    } catch (reason) {
        error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la estructura académica.';
    } finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => { message.value = notice; await load(); };
watch(() => [route.query.seccion, route.params.section], () => { message.value = null; });
onMounted(load);
</script>

<template>
    <PageFrame :title="sectionContent.title" :description="sectionContent.description">
        <template #actions>
            <CatalogRecordSheet v-if="data && !data.lock_reason" :entity="entity" :options="data.options" @saved="changed" />
        </template>

        <ProcessLockAlert v-if="data?.lock_reason" title="Estructura institucional bloqueada" :reason="data.lock_reason" />
        <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <LoadingSkeleton v-if="loading && !data" variant="academic" />

        <CatalogSection v-if="data" :section="section" :catalogs="data.catalogs" :options="data.options" :lock-reason="data.lock_reason" @changed="changed" />
    </PageFrame>
</template>
