<script setup lang="ts">
import { CircleOff, RotateCcw } from '@lucide/vue';
import { computed, ref } from 'vue';
import { setAcademicRecordStatus } from '@/api/academic';
import { setCareerRecordStatus } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

const props = withDefaults(defineProps<{ scope: 'governance' | 'career'; entity: string; recordId: string; active: boolean; display?: 'button' | 'menu' }>(), { display: 'button' });
const emit = defineEmits<{ changed: [message: string] }>();
const processing = ref(false); const error = ref<string | null>(null); const actionLabel = computed(() => props.active ? 'Desactivar' : 'Reactivar');
const submit = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = props.scope === 'governance' ? await setAcademicRecordStatus(props.entity as 'facultad' | 'campus' | 'carrera', props.recordId, !props.active) : await setCareerRecordStatus(props.entity, props.recordId, !props.active); emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el estado.'; } finally { processing.value = false; } };
</script>

<template><DropdownMenuItem v-if="display === 'menu'" :disabled="processing" :variant="active ? 'destructive' : 'default'" @select="submit"><Spinner v-if="processing" /><CircleOff v-else-if="active" aria-hidden="true" /><RotateCcw v-else aria-hidden="true" />{{ actionLabel }}</DropdownMenuItem><Button v-else type="button" size="sm" variant="outline" :disabled="processing" @click="submit"><Spinner v-if="processing" />{{ actionLabel }}</Button><DropdownMenuItem v-if="display === 'menu' && error" disabled variant="destructive">{{ error }}</DropdownMenuItem><p v-else-if="error" class="mt-2 max-w-64 text-sm text-destructive">{{ error }}</p></template>
