<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  createAcademicRecord,
  deleteAcademicRecord,
  getAcademicGovernance,
  replaceCareerCoordinator,
  setAcademicRecordStatus,
  updateAcademicRecord,
  type AcademicEntity,
  type AcademicGovernance,
} from '@/api/academic';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import FormSheet from '@/components/FormSheet.vue';

type EditableRecord = {
  id: string;
  code: string;
  nombre?: string;
  faculty_id?: string;
  campus_id?: string;
  modality?: string;
  starts_on?: string;
  ends_on?: string;
  teaching_weeks?: number;
};

const router = useRouter();
const data = ref<AcademicGovernance | null>(null);
const section = ref<AcademicEntity>('facultad');
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const createOpen = ref(false);
const editOpen = ref(false);
const coordinatorOpen = ref(false);
const editing = ref<EditableRecord | null>(null);
const selectedCareer = ref<AcademicGovernance['catalogs']['careers'][number] | null>(null);
const coordinatorForm = ref({ incoming_user_id: '', deactivate_outgoing: false });
const form = ref<Record<string, unknown>>({});

const sectionLabel = computed(() => ({
  facultad: 'facultad', campus: 'campus', carrera: 'carrera', periodo: 'período académico',
})[section.value]);

const emptyForm = (entity: AcademicEntity): Record<string, unknown> => entity === 'carrera'
  ? { code: '', nombre: '', faculty_id: '', campus_id: '', modality: 'presencial', curriculum_code: '', cycle_count: 1 }
  : entity === 'periodo'
    ? { code: '', starts_on: '', ends_on: '', teaching_weeks: 16 }
    : { code: '', nombre: '' };

const showError = (reason: unknown, fallback: string): void => {
  error.value = reason instanceof ApiError ? reason.message : fallback;
};

const load = async (): Promise<void> => {
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') { await router.replace('/panel'); return; }
    data.value = await getAcademicGovernance();
  } catch (reason) { showError(reason, 'No se pudo cargar la estructura académica.'); }
};

const select = (value: AcademicEntity): void => { section.value = value; };
const openCreate = (): void => { form.value = emptyForm(section.value); createOpen.value = true; error.value = null; };

const create = async (): Promise<void> => {
  error.value = null;
  try {
    message.value = (await createAcademicRecord(section.value, form.value)).message;
    createOpen.value = false;
    await load();
  } catch (reason) { showError(reason, 'No se pudo crear el registro.'); }
};

const openEdit = (record: EditableRecord): void => {
  editing.value = record;
  form.value = { ...record };
  editOpen.value = true;
  error.value = null;
};

const saveEdit = async (): Promise<void> => {
  if (!editing.value) return;
  error.value = null;
  try {
    message.value = (await updateAcademicRecord(section.value, editing.value.id, form.value)).message;
    editOpen.value = false;
    await load();
  } catch (reason) { showError(reason, 'No se pudo actualizar el registro.'); }
};

const changeStatus = async (entity: Exclude<AcademicEntity, 'periodo'>, id: string, active: boolean): Promise<void> => {
  try { message.value = (await setAcademicRecordStatus(entity, id, active)).message; await load(); }
  catch (reason) { showError(reason, 'No se pudo cambiar el estado.'); }
};

const remove = async (id: string): Promise<void> => {
  if (!window.confirm('¿Eliminar este registro? Esta acción sólo se permite cuando no tiene dependencias.')) return;
  try { message.value = (await deleteAcademicRecord(section.value, id)).message; await load(); }
  catch (reason) { showError(reason, 'No se pudo eliminar el registro.'); }
};

const openCoordinator = (career: AcademicGovernance['catalogs']['careers'][number]): void => {
  selectedCareer.value = career;
  coordinatorForm.value = { incoming_user_id: '', deactivate_outgoing: false };
  coordinatorOpen.value = true;
};

const saveCoordinator = async (): Promise<void> => {
  if (!selectedCareer.value) return;
  try {
    message.value = (await replaceCareerCoordinator(selectedCareer.value.id, coordinatorForm.value.incoming_user_id, coordinatorForm.value.deactivate_outgoing)).message;
    coordinatorOpen.value = false;
    await load();
  } catch (reason) { showError(reason, 'No se pudo asignar la coordinación.'); }
};

onMounted(load);
</script>

<template>
  <main class="app-page">
    <header class="app-header">
      <div><p class="eyebrow">Administración</p><h1>Estructura académica</h1></div>
      <div class="header-actions"><RouterLink class="back-link" to="/panel">Volver al panel</RouterLink><button class="primary-action" type="button" @click="openCreate">Crear {{ sectionLabel }}</button></div>
    </header>
    <p v-if="data?.lock_reason" class="error-box" role="alert">{{ data.lock_reason }}</p>
    <p v-if="message" class="save-status">{{ message }}</p><p v-if="error" role="alert">{{ error }}</p>

    <nav class="header-actions" aria-label="Catálogos académicos">
      <button :aria-current="section === 'facultad'" @click="select('facultad')">Facultades</button>
      <button :aria-current="section === 'campus'" @click="select('campus')">Campus</button>
      <button :aria-current="section === 'carrera'" @click="select('carrera')">Carreras</button>
      <button :aria-current="section === 'periodo'" @click="select('periodo')">Períodos</button>
    </nav>

    <section v-if="data" class="detail-card"><div class="section-heading"><div><p class="eyebrow">Catálogo</p><h2>{{ sectionLabel }}</h2></div></div>
      <div class="table-wrap"><table><thead><tr><th>Nombre / código</th><th v-if="section === 'carrera'">Contexto</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        <template v-if="section === 'facultad'"><tr v-for="item in data.catalogs.faculties" :key="item.id"><td>{{ item.nombre }}<small>{{ item.codigo_facultad || 'Sin código' }}</small></td><td>{{ item.activo ? 'Activa' : 'Inactiva' }}</td><td class="header-actions"><button @click="openEdit({ id: item.id, code: item.codigo_facultad || '', nombre: item.nombre })">Editar</button><button @click="changeStatus('facultad', item.id, !item.activo)">{{ item.activo ? 'Desactivar' : 'Activar' }}</button><button @click="remove(item.id)">Eliminar</button></td></tr></template>
        <template v-else-if="section === 'campus'"><tr v-for="item in data.catalogs.campuses" :key="item.id"><td>{{ item.nombre }}<small>{{ item.codigo_campus || 'Sin código' }}</small></td><td>{{ item.activo ? 'Activo' : 'Inactivo' }}</td><td class="header-actions"><button @click="openEdit({ id: item.id, code: item.codigo_campus || '', nombre: item.nombre })">Editar</button><button @click="changeStatus('campus', item.id, !item.activo)">{{ item.activo ? 'Desactivar' : 'Activar' }}</button><button @click="remove(item.id)">Eliminar</button></td></tr></template>
        <template v-else-if="section === 'carrera'"><tr v-for="item in data.catalogs.careers" :key="item.id"><td>{{ item.name }}<small>{{ item.code || 'Sin código' }} · {{ item.modality_label || item.modality }}</small></td><td><small>{{ item.campus_name || 'Sin campus' }}</small>{{ item.coordinator?.name || 'Sin coordinación' }}</td><td>{{ item.active ? 'Activa' : 'Inactiva' }}</td><td class="header-actions"><button @click="openEdit({ id: item.id, code: item.code || '', nombre: item.name, faculty_id: item.faculty_id, campus_id: item.campus_id, modality: item.modality })">Editar</button><button @click="openCoordinator(item)">Coordinación</button><button @click="changeStatus('carrera', item.id, !item.active)">{{ item.active ? 'Desactivar' : 'Activar' }}</button><button @click="remove(item.id)">Eliminar</button></td></tr></template>
        <template v-else><tr v-for="item in data.catalogs.periods" :key="item.id"><td>{{ item.code }}<small>{{ item.starts_on }} — {{ item.ends_on }} · {{ item.teaching_weeks }} semanas</small></td><td>{{ item.status_label }}</td><td class="header-actions"><button @click="openEdit({ id: item.id, code: item.code, starts_on: item.starts_on, ends_on: item.ends_on, teaching_weeks: item.teaching_weeks })">Editar</button><button @click="remove(item.id)">Eliminar</button></td></tr></template>
      </tbody></table></div>
    </section>

    <FormSheet :open="createOpen || editOpen" :title="`${editOpen ? 'Editar' : 'Crear'} ${sectionLabel}`" description="Los cambios quedan auditados y se aplican al catálogo institucional." @close="createOpen = false; editOpen = false">
      <form class="editor-form" @submit.prevent="editOpen ? saveEdit() : create()">
        <template v-if="section === 'periodo'"><label>Código<input v-model="form.code" required /></label><label>Inicio<input v-model="form.starts_on" type="date" required /></label><label>Fin<input v-model="form.ends_on" type="date" required /></label><label>Semanas lectivas<input v-model="form.teaching_weeks" type="number" min="1" max="52" required /></label></template>
        <template v-else><label>Código<input v-model="form.code" /></label><label>Nombre<input v-model="form.nombre" required /></label><template v-if="section === 'carrera'"><label>Facultad<select v-model="form.faculty_id" required><option value="">Seleccione</option><option v-for="faculty in data?.options.faculties" :key="faculty.id" :value="faculty.id">{{ faculty.nombre }}</option></select></label><label>Campus<select v-model="form.campus_id" required><option value="">Seleccione</option><option v-for="campus in data?.options.campuses" :key="campus.id" :value="campus.id">{{ campus.nombre }}</option></select></label><label>Modalidad<select v-model="form.modality"><option value="presencial">Presencial</option><option value="semipresencial">Semipresencial</option><option value="en_linea">En línea</option><option value="a_distancia">A distancia</option><option value="hibrida">Híbrida</option></select></label><template v-if="createOpen"><label>Código de malla<input v-model="form.curriculum_code" required /></label><label>Ciclos<input v-model="form.cycle_count" type="number" min="1" max="30" required /></label></template></template></template>
        <div class="form-sheet-actions"><button type="button" @click="createOpen = false; editOpen = false">Cancelar</button><button type="submit">Guardar</button></div>
      </form>
    </FormSheet>

    <FormSheet :open="coordinatorOpen" :title="`Coordinación de ${selectedCareer?.name || ''}`" description="La persona elegida recibirá el rol de coordinación para esta carrera." @close="coordinatorOpen = false">
      <form class="editor-form" @submit.prevent="saveCoordinator"><label>Nueva persona coordinadora<select v-model="coordinatorForm.incoming_user_id" required><option value="">Seleccione</option><option v-for="user in data?.options.coordinatorUsers" :key="user.id" :value="user.id">{{ user.nombre }} · {{ user.correo_electronico }}</option></select></label><label class="checkbox-row"><input v-model="coordinatorForm.deactivate_outgoing" type="checkbox" /> Desactivar la cuenta saliente si ya no conserva otro rol</label><div class="form-sheet-actions"><button type="button" @click="coordinatorOpen = false">Cancelar</button><button type="submit">Asignar coordinación</button></div></form>
    </FormSheet>
  </main>
</template>
