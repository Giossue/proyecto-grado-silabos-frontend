<script setup lang="ts">
import { computed } from 'vue';
import CatalogActions from '@/components/domain/academic/CatalogActions.vue';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import type {
    AcademicStructureProps,
    GovernanceSection,
} from '@/types/academic';

const props = defineProps<
    Pick<AcademicStructureProps, 'catalogs' | 'options' | 'lock_reason'> & {
        section: GovernanceSection;
    }
>();
const emit = defineEmits<{ changed: [message: string] }>();

const facultyNames = computed(
    () =>
        new Map(
            props.catalogs.faculties.map((faculty) => [
                faculty.id,
                faculty.nombre,
            ]),
        ),
);

const careerCount = (facultyId: string): number =>
    props.catalogs.careers.filter((career) => career.faculty_id === facultyId)
        .length;

const facultyName = (facultyId: string): string =>
    facultyNames.value.get(facultyId) ?? 'Facultad no disponible';

const facultyFilter = useClientFilter(
    () => props.catalogs.faculties,
    (item) => [item.nombre, item.campus],
    {
        estado: {
            matches: (item, value) => item.activo === (value === 'active'),
        },
    },
);

const {
    items: facultyPage,
    meta: facultyMeta,
    setPage: setFacultyPage,
} = useClientPagination(() => facultyFilter.items.value);
const careerFilter = useClientFilter(
    () => props.catalogs.careers,
    (item) => [item.name, item.code],
    {
        estado: {
            matches: (item, value) => item.active === (value === 'active'),
        },
    },
);

const {
    items: careerPage,
    meta: careerMeta,
    setPage: setCareerPage,
} = useClientPagination(() => careerFilter.items.value);
const periodFilter = useClientFilter(
    () => props.catalogs.periods,
    (item) => [item.code],
);

const {
    items: periodPage,
    meta: periodMeta,
    setPage: setPeriodPage,
} = useClientPagination(() => periodFilter.items.value);
</script>

<template>
    <Card v-if="section === 'faculties'">
        <CardContent class="flex flex-col gap-4">
            <ClientFilterBar
                :filter="facultyFilter"
                input-id="faculties-search"
                label="Buscar facultad"
                placeholder="Buscar por nombre"
            >
                <template #filters>
                    <Field>
                        <FieldLabel for="faculties-search-state" class="sr-only"
                            >Estado</FieldLabel
                        >
                        <Select v-model="facultyFilter.values.estado.value">
                            <SelectTrigger id="faculties-search-state">
                                <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all"
                                        >Todos los estados</SelectItem
                                    >
                                    <SelectItem value="active"
                                        >Activos</SelectItem
                                    >
                                    <SelectItem value="inactive"
                                        >Inactivos</SelectItem
                                    >
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </template>
            </ClientFilterBar>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead>Carreras relacionadas</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead class="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="facultyPage.length === 0"
                        :colspan="5"
                    >
                        {{ facultyFilter.active.value ? 'Ninguna facultad coincide con los filtros.' : 'No existen facultades registradas.' }}
                    </TableEmpty>
                    <TableRow
                        v-for="faculty in facultyPage"
                        v-else
                        :key="faculty.id"
                    >
                        <TableCell>
                            {{ faculty.nombre }}
                        </TableCell>
                        <TableCell>
                            {{ faculty.campus ?? 'Sin campus' }}
                        </TableCell>
                        <TableCell>
                            {{ careerCount(faculty.id) }}
                        </TableCell>
                        <TableCell>
                            {{ faculty.activo ? 'Activa' : 'Inactiva' }}
                        </TableCell>
                        <TableCell class="text-right">
                            <CatalogActions
                                entity="facultad"
                                :record-id="faculty.id"
                                :record-name="faculty.nombre"
                                :active="faculty.activo"
                                :campus="faculty.campus"
                                :campus-options="options.campusOptions"
                                :logo-url="faculty.logo_url"
                                :faculties="catalogs.faculties"
                                :lock-reason="lock_reason"
                                @changed="emit('changed', $event)"
                            />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <TablePagination
                :meta="facultyMeta"
                mode="client"
                label="Paginación de facultades"
                @update:page="setFacultyPage"
            />
        </CardContent>
    </Card>

    <Card v-else-if="section === 'careers'">
        <CardContent class="flex flex-col gap-4">
            <ClientFilterBar
                :filter="careerFilter"
                input-id="careers-search"
                label="Buscar carrera"
                placeholder="Buscar por nombre o código"
            >
                <template #filters>
                    <Field>
                        <FieldLabel for="careers-search-state" class="sr-only"
                            >Estado</FieldLabel
                        >
                        <Select v-model="careerFilter.values.estado.value">
                            <SelectTrigger id="careers-search-state">
                                <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all"
                                        >Todos los estados</SelectItem
                                    >
                                    <SelectItem value="active"
                                        >Activos</SelectItem
                                    >
                                    <SelectItem value="inactive"
                                        >Inactivos</SelectItem
                                    >
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </template>
            </ClientFilterBar>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Carrera</TableHead>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Modalidad</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead>Código de carrera</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead class="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="careerPage.length === 0"
                        :colspan="7"
                    >
                        {{ careerFilter.active.value ? 'Ninguna carrera coincide con los filtros.' : 'No existen carreras registradas.' }}
                    </TableEmpty>
                    <TableRow
                        v-for="career in careerPage"
                        v-else
                        :key="career.id"
                    >
                        <TableCell>
                            {{ career.name }}
                        </TableCell>
                        <TableCell>
                            {{ facultyName(career.faculty_id) }}
                        </TableCell>
                        <TableCell>
                            {{ career.modality_label ?? 'Sin modalidad' }}
                        </TableCell>
                        <TableCell>
                            {{ career.campus_name ?? 'Sin campus' }}
                        </TableCell>
                        <TableCell>
                            {{ career.code || 'Sin código de carrera' }}
                        </TableCell>
                        <TableCell>
                            {{ career.active ? 'Activa' : 'Inactiva' }}
                        </TableCell>
                        <TableCell class="text-right">
                            <CatalogActions
                                entity="carrera"
                                :record-id="career.id"
                                :record-name="career.name"
                                :record-code="career.code"
                                :active="career.active"
                                :faculty-id="career.faculty_id"
                                :modality="career.modality"
                                :faculties="catalogs.faculties"
                                :campus-options="options.campusOptions"
                                :coordinator="career.coordinator"
                                :coordinator-users="options.coordinatorUsers"
                                :lock-reason="lock_reason"
                                @changed="emit('changed', $event)"
                            />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <TablePagination
                :meta="careerMeta"
                mode="client"
                label="Paginación de carreras"
                @update:page="setCareerPage"
            />
        </CardContent>
    </Card>

    <Card v-else>
        <CardContent class="flex flex-col gap-4">
            <ClientFilterBar
                :filter="periodFilter"
                input-id="periods-search"
                label="Buscar periodo"
                placeholder="Buscar por período"
            />
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead>Fechas</TableHead>
                        <TableHead>Semanas lectivas</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead class="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="periodPage.length === 0"
                        :colspan="5"
                    >
                        {{ periodFilter.active.value ? 'Ningún período coincide con los filtros.' : 'No existen periodos académicos registrados.' }}
                    </TableEmpty>
                    <TableRow
                        v-for="period in periodPage"
                        v-else
                        :key="period.id"
                    >
                        <TableCell>
                            {{ period.code }}
                        </TableCell>
                        <TableCell>
                            <time :datetime="period.starts_on">
                                {{ period.starts_on }}
                            </time>
                            →
                            <time :datetime="period.ends_on">
                                {{ period.ends_on }}
                            </time>
                        </TableCell>
                        <TableCell>{{ period.teaching_weeks }}</TableCell>
                        <TableCell>
                            {{ period.status_label }}
                        </TableCell>
                        <TableCell class="text-right">
                            <CatalogActions
                                entity="periodo"
                                :record-id="period.id"
                                :record-name="period.code"
                                :record-code="period.code"
                                :starts-on="period.starts_on"
                                :ends-on="period.ends_on"
                                :institutional-process="period.institutional_process"
                                :faculties="catalogs.faculties"
                                :campus-options="options.campusOptions"
                                :lock-reason="lock_reason"
                                @changed="emit('changed', $event)"
                            />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <TablePagination
                :meta="periodMeta"
                mode="client"
                label="Paginación de periodos académicos"
                @update:page="setPeriodPage"
            />
        </CardContent>
    </Card>
</template>
