<script setup lang="ts">
import { X } from '@lucide/vue';
import { computed, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import CatalogActions from '@/components/domain/academic/CatalogActions.vue';
import { activateRow } from '@/lib/rowActivation';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
</script>

<template>
    <Card v-if="section === 'faculties'">
        <CardContent class="flex flex-col gap-4">
            <ClientFilterBar
                :filter="facultyFilter"
                input-id="faculties-search"
                label="Buscar facultad"
                placeholder="Buscar por nombre o campus"
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
            <Table label="Listado académico">
                <TableHeader>
                    <TableRow>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead class="w-36">Logo</TableHead>
                        <TableHead class="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="facultyPage.length === 0"
                        :colspan="4"
                    >
                        {{ facultyFilter.active.value ? 'Ninguna facultad coincide con los filtros.' : 'No existen facultades registradas.' }}
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
                        </TableCell>
                        <TableCell>
                            {{ faculty.campus ?? 'Sin campus' }}
                        </TableCell>
                        <TableCell>
                            <Button
                                v-if="faculty.logo_url"
                                type="button"
                                variant="outline"
                                class="h-12 w-28 p-1"
                                :aria-label="`Ver logo de ${faculty.nombre}`"
                                @click="openLogoPreview(faculty.nombre, faculty.logo_url)"
                            >
                                <img :src="faculty.logo_url" alt="" class="size-full object-contain" />
                            </Button>
                            <span v-else class="text-sm text-muted-foreground">Sin logo</span>
                        </TableCell>
                        <TableCell class="text-right">
                            <CatalogActions
                                :ref="(actions) => setActions(faculty.id, actions)"
                                entity="facultad"
                                :record-id="faculty.id"
                                :record-name="faculty.nombre"
                                :active="faculty.activo"
                                :campus="faculty.campus"
                                :campus-options="options.campusOptions" :modality-options="options.modalityOptions"
                                :logo-url="faculty.logo_url"
                                :faculties="catalogs.faculties"
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

    <Card v-else>
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
            <Table label="Listado académico">
                <TableHeader>
                    <TableRow>
                        <TableHead>Carrera</TableHead>
                        <TableHead>Facultad</TableHead>
                        <TableHead>Modalidad</TableHead>
                        <TableHead>Campus</TableHead>
                        <TableHead class="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableEmpty
                        v-if="careerPage.length === 0"
                        :colspan="5"
                    >
                        {{ careerFilter.active.value ? 'Ninguna carrera coincide con los filtros.' : 'No existen carreras registradas.' }}
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
                        <TableCell class="text-right">
                            <CatalogActions
                                :ref="(actions) => setActions(career.id, actions)"
                                entity="carrera"
                                :record-id="career.id"
                                :record-name="career.name"
                                :record-code="career.code"
                                :active="career.active"
                                :faculty-id="career.faculty_id"
                                :modality="career.modality"
                                :faculties="catalogs.faculties"
                                :campus-options="options.campusOptions" :modality-options="options.modalityOptions"
                                :coordinator="career.coordinator"
                                :coordinator-users="options.coordinatorUsers"
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

    <Dialog :open="logoPreviewOpen" @update:open="updateLogoPreviewOpen">
        <DialogContent class="pr-14 sm:max-w-3xl">
            <DialogClose as-child>
                <Button type="button" variant="ghost" size="icon-sm" class="absolute top-4 right-4" aria-label="Cerrar vista del logo">
                    <X aria-hidden="true" />
                </Button>
            </DialogClose>
            <DialogHeader>
                <DialogTitle>Logo de {{ logoPreview?.name }}</DialogTitle>
            </DialogHeader>
            <img
                v-if="logoPreview"
                :src="logoPreview.url"
                :alt="`Logo de ${logoPreview.name}`"
                class="max-h-160 w-full object-contain"
            />
        </DialogContent>
    </Dialog>

</template>
