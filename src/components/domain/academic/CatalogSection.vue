<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { useFocusReturn } from '@/lib/focusReturn';
import { Eye } from '@lucide/vue';
import { computed, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import CatalogActions from '@/components/domain/academic/CatalogActions.vue';
import StatusBadge from '@/components/domain/StatusBadge.vue';
import { activateRow } from '@/lib/rowActivation';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import TableCardLine from '@/components/domain/TableCardLine.vue';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import type {
    AcademicStructureProps,
    GovernanceSection,
} from '@/types/academic';

const actionsById = new Map<string, { edit: () => void }>();
const setActions = (id: string, actions: Element | ComponentPublicInstance | null): void => {
    if (actions === null) actionsById.delete(id);
    else actionsById.set(id, actions as unknown as { edit: () => void });
};
const editRecord = (id: string): void => actionsById.get(id)?.edit();
const props = defineProps<
    Pick<AcademicStructureProps, 'catalogs' | 'options'> & {
        section: GovernanceSection;
    }
>();
const emit = defineEmits<{ changed: [message: string] }>();
const logoPreview = ref<{ name: string; url: string } | null>(null);
const logoPreviewOpen = ref(false);
useFocusReturn(() => logoPreviewOpen.value);

const openLogoPreview = (name: string, url: string): void => {
    logoPreview.value = { name, url };
    logoPreviewOpen.value = true;
};

const updateLogoPreviewOpen = (open: boolean): void => {
    logoPreviewOpen.value = open;
};

const facultyNames = computed(
    () =>
        new Map(
            props.catalogs.faculties.map((faculty) => [
                faculty.id,
                faculty.nombre,
            ]),
        ),
);

const facultyName = (facultyId: string): string =>
    facultyNames.value.get(facultyId) ?? 'Facultad no disponible';

const facultyFilter = useClientFilter(
    () => props.catalogs.faculties,
    (item) => [item.nombre],
    {
        campus: {
            matches: (item, value) => item.campus === value,
        },
    },
);

const {
    items: facultyPage,
    meta: facultyMeta,
    setPage: setFacultyPage,
} = useClientPagination(() => facultyFilter.items.value, 20, facultyFilter.criteria);
const careerFilter = useClientFilter(
    () => props.catalogs.careers,
    (item) => [item.name],
    {
        campus: {
            matches: (item, value) => item.campus_name === value,
        },
        modalidad: {
            matches: (item, value) => item.modality === value,
        },
    },
);

const {
    items: careerPage,
    meta: careerMeta,
    setPage: setCareerPage,
} = useClientPagination(() => careerFilter.items.value, 20, careerFilter.criteria);
</script>

<template>
    <div v-if="section === 'faculties'" class="flex flex-col gap-4">
        <Card class="py-3"><CardContent class="px-3">
            <ClientFilterBar
                :filter="facultyFilter"
                input-id="faculties-search"
                label="Buscar facultad"
                placeholder="Buscar por nombre"
            >
                <template #filters>
                    <Field>
                        <FieldLabel for="faculties-search-campus" class="sr-only"
                            >Campus</FieldLabel
                        >
                        <Select v-model="facultyFilter.values.campus.value">
                            <SelectTrigger id="faculties-search-campus">
                                <SelectValue placeholder="Todos los campus" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all"
                                        >Todos los campus</SelectItem
                                    >
                                    <SelectItem
                                        v-for="campus in options.campusOptions"
                                        :key="campus.value"
                                        :value="campus.value"
                                        >{{ campus.label }}</SelectItem
                                    >
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </template>
            </ClientFilterBar>
        </CardContent></Card>
            <Table label="Listado académico">
                <TableHeader>
                    <TableRow>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead class="w-20 text-center">Logo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="facultyPage.length === 0"
                        :colspan="3"
                    >
                        {{ facultyFilter.active.value ? 'Ninguna facultad coincide con los filtros' : 'No existen facultades registradas' }}
                    </TableEmpty>
                    <TableRow
                        v-for="faculty in facultyPage"
                        v-else
                        :key="faculty.id"
                        class="cursor-pointer"
                        tabindex="0"
                        :aria-label="`Editar ${faculty.nombre}`"
                        @click="activateRow($event, () => editRecord(faculty.id))"
                        @keydown.enter.self.prevent="editRecord(faculty.id)" @keydown.space.self.prevent="editRecord(faculty.id)"
                    >
                        <TableCell>
                            {{ faculty.nombre }}
                            <StatusBadge v-if="!faculty.activo" class="ml-2" label="Inactiva" tone="neutral" />
                            <CatalogActions
                                :ref="(actions) => setActions(faculty.id, actions)"
                                entity="facultad"
                                :record-id="faculty.id"
                                :record-name="faculty.nombre"
                                :active="faculty.activo"
                                :campus="faculty.campus"
                                :catalog-libraries="faculty.catalog_libraries ?? []"
                                :campus-options="options.campusOptions" :modality-options="options.modalityOptions"
                                :logo-url="faculty.logo_url"
                                :faculties="catalogs.faculties"
                                :deactivate-blocked-reason="faculty.deactivate_block ?? null"
                                :lock-reason="faculty.lock_reason ?? null"
                                @changed="emit('changed', $event)"
                            />
                        </TableCell>
                        <TableCell>
                            {{ faculty.campus ?? 'Sin campus' }}
                        </TableCell>
                        <TableCell class="text-center">
                            <IconTooltip v-if="faculty.logo_url" :label="`Ver logo de ${faculty.nombre}`"><Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                :aria-label="`Ver logo de ${faculty.nombre}`"
                                @click="openLogoPreview(faculty.nombre, faculty.logo_url)"
                            >
                                <Eye aria-hidden="true" />
                            </Button></IconTooltip>
                            <span v-else class="text-sm text-muted-foreground">Sin logo</span>
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
    </div>

    <div v-else class="flex flex-col gap-4">
        <Card class="py-3"><CardContent class="px-3">
            <ClientFilterBar
                :filter="careerFilter"
                input-id="careers-search"
                label="Buscar carrera"
                placeholder="Buscar por nombre"
            >
                <template #filters>
                    <Field>
                        <FieldLabel for="careers-search-campus" class="sr-only">Campus</FieldLabel>
                        <Select v-model="careerFilter.values.campus.value">
                            <SelectTrigger id="careers-search-campus"><SelectValue placeholder="Todos los campus" /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all">Todos los campus</SelectItem>
                                    <SelectItem v-for="campus in options.campusOptions" :key="campus.value" :value="campus.value">{{ campus.label }}</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel for="careers-search-modality" class="sr-only"
                            >Modalidad</FieldLabel
                        >
                        <Select v-model="careerFilter.values.modalidad.value">
                            <SelectTrigger id="careers-search-modality">
                                <SelectValue placeholder="Todas las modalidades" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="all"
                                        >Todas las modalidades</SelectItem
                                    >
                                    <SelectItem
                                        v-for="modality in options.modalityOptions"
                                        :key="modality.value"
                                        :value="modality.value"
                                        >{{ modality.label }}</SelectItem
                                    >
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </template>
            </ClientFilterBar>
        </CardContent></Card>
            <Table label="Listado académico">
                <TableHeader>
                    <TableRow>
                        <TableHead>Carrera</TableHead>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Modalidad</TableHead>
                        <TableHead>Campus</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="careerPage.length === 0"
                        :colspan="4"
                    >
                        {{ careerFilter.active.value ? 'Ninguna carrera coincide con los filtros' : 'No existen carreras registradas' }}
                    </TableEmpty>
                    <TableRow
                        v-for="career in careerPage"
                        v-else
                        :key="career.id"
                        class="cursor-pointer"
                        tabindex="0"
                        :aria-label="`Editar ${career.name}`"
                        @click="activateRow($event, () => editRecord(career.id))"
                        @keydown.enter.self.prevent="editRecord(career.id)" @keydown.space.self.prevent="editRecord(career.id)"
                    >
                        <TableCell>
                            {{ career.name }}
                            <StatusBadge v-if="!career.active" class="ml-2" label="Inactiva" tone="neutral" />
                            <TableCardLine>{{ career.modality_label ?? 'Sin modalidad' }} · {{ career.campus_name ?? 'Sin campus' }}</TableCardLine>
                            <CatalogActions
                                :ref="(actions) => setActions(career.id, actions)"
                                entity="carrera"
                                :record-id="career.id"
                                :record-name="career.name"
                                :record-code="career.code"
                                :active="career.active"
                                :deactivate-blocked-reason="career.deactivate_block ?? null"
                                :lock-reason="career.lock_reason ?? null"
                                :faculty-id="career.faculty_id"
                                :modality="career.modality"
                                :faculties="catalogs.faculties"
                                :campus-options="options.campusOptions" :modality-options="options.modalityOptions"
                                @changed="emit('changed', $event)"
                            />
                        </TableCell>
                        <TableCell>
                            {{ facultyName(career.faculty_id) }}
                        </TableCell>
                        <TableCell data-card-hide="true">
                            {{ career.modality_label ?? 'Sin modalidad' }}
                        </TableCell>
                        <TableCell data-card-hide="true">
                            {{ career.campus_name ?? 'Sin campus' }}
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
    </div>

    <Dialog :open="logoPreviewOpen" @update:open="updateLogoPreviewOpen">
        <DialogContent class="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Logo de {{ logoPreview?.name }}</DialogTitle>
            </DialogHeader>
            <img
                v-if="logoPreview"
                :src="logoPreview.url"
                :alt="`Logo de ${logoPreview.name}`"
                class="max-h-160 w-full object-contain"
            />
            <DialogFooter>
                <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>

</template>
