<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getConvocation, transitionConvocation, type ConvocationDetail } from '@/api/convocations';
import { getSession } from '@/api/session';

const route = useRoute(); const router = useRouter();
const data = ref<ConvocationDetail | null>(null); const error = ref<string | null>(null); const message = ref<string | null>(null); const pauseReason = ref(''); const processing = ref(false);
const convocationId = () => String(route.params.convocation);
const asDate = (value: string | null) => value?.slice(0, 10) ?? 'No definido';
const stateLabel = (value: string) => ({ sin_iniciar: 'Sin iniciar', preparacion: 'En preparación', abierto: 'Abierto', abierta: 'Abierta', borrador: 'Borrador', en_revision: 'En revisión', correccion_solicitada: 'Corrección solicitada', aprobado: 'Aprobado', pausado: 'Pausado', pausada: 'Pausada', cerrado: 'Cerrado', cerrada: 'Cerrada' }[value] ?? value);
const metricLabel = (value: string) => ({ total: 'Total', not_started: 'Sin iniciar', draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobados' }[value] ?? value);
const load = async () => { try { const session = await getSession(); if (session.active_role?.code !== 'coordinador') { await router.replace('/panel'); return; } data.value = await getConvocation(convocationId()); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la convocatoria.'; } };
const transition = async (action: 'pausar' | 'reanudar') => { if (action === 'pausar' && pauseReason.value.trim().length < 10) { error.value = 'Indique un motivo de al menos 10 caracteres para pausar la convocatoria.'; return; } try { processing.value = true; error.value = null; message.value = (await transitionConvocation(convocationId(), action, action === 'pausar' ? pauseReason.value.trim() : undefined)).message; pauseReason.value = ''; await load(); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el estado.'; } finally { processing.value = false; } };
onMounted(() => { void load(); });
</script>

<template>
  <main class="app-page"><header class="app-header"><div><p class="eyebrow">Coordinación</p><h1>{{ data?.convocation.name ?? 'Convocatoria' }}</h1><p>{{ data?.convocation.period }}</p></div><RouterLink class="back-link" to="/coordinacion/convocatorias">Volver a convocatorias</RouterLink></header>
    <p v-if="message" class="save-status" role="status">{{ message }}</p><p v-if="error" role="alert">{{ error }}</p>
    <template v-if="data"><section class="detail-card"><h2>Estado y calendario</h2><p><span class="role-badge">{{ stateLabel(data.convocation.state) }}</span></p><p>Proceso institucional: <strong>{{ data.convocation.process.name }}</strong> · {{ data.convocation.process.state }}</p><p>Inicio: {{ asDate(data.convocation.start_date) }} · Entrega: {{ asDate(data.convocation.draft_deadline) }}</p><p>Plantilla: {{ data.convocation.template }}</p><p>Fuentes: {{ data.convocation.sources.join(', ') || 'Sin fuentes' }}</p><div v-if="data.convocation.state === 'abierta'" class="process-actions"><input v-model="pauseReason" placeholder="Motivo para pausar" aria-label="Motivo de la pausa" /><button :disabled="processing" @click="transition('pausar')">Pausar convocatoria</button></div><button v-if="data.convocation.state === 'pausada'" :disabled="processing" @click="transition('reanudar')">Reanudar convocatoria</button></section>
      <section class="metrics" aria-label="Estado de los sílabos"><article v-for="(count, key) in data.convocation.counts" :key="key" class="metric-card"><p>{{ metricLabel(key) }}</p><strong>{{ count }}</strong></article></section>
      <section class="detail-card"><h2>Sílabos generados</h2><div class="table-wrap"><table><thead><tr><th>Asignatura</th><th>Paralelo</th><th>Docente</th><th>Estado</th><th>Completitud</th></tr></thead><tbody><tr v-for="syllabus in data.convocation.syllabi" :key="syllabus.id"><td><strong>{{ syllabus.subject }}</strong><small>{{ syllabus.code }}</small></td><td>{{ syllabus.parallels.join(', ') }}</td><td>{{ syllabus.teachers.join(', ') || 'Sin docente asignado' }}</td><td>{{ stateLabel(syllabus.state) }}</td><td>{{ syllabus.completion }}%</td></tr><tr v-if="!data.convocation.syllabi.length"><td colspan="5" class="empty-state">Esta convocatoria todavía no tiene sílabos generados.</td></tr></tbody></table></div></section>
    </template><p v-else-if="!error">Cargando convocatoria…</p>
  </main>
</template>
