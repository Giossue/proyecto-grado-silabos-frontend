<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, CheckCircle2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { selectActiveRole } from '@/api/session';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { roleEntry } from '@/lib/routes';
import { roleLabel, scopeTitle } from '@/lib/roles';

const open = defineModel<boolean>('open', { default: false });
const router = useRouter();
const pendingRoleId = ref<string | null>(null);
const error = ref<string | null>(null);
const roles = computed(() => sessionState.current.value?.available_roles ?? []);
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
const coordinatorCareerCount = computed(() => roles.value.filter((role) => role.code === 'coordinador').length);
const title = computed(() => coordinatorCareerCount.value > 1 ? 'Cambiar carrera' : 'Cambiar ámbito de trabajo');
type Role = (typeof roles.value)[number];
// Título: la función; descripción: dónde se ejerce. Así la carrera no se repite en la tarjeta.
const cardTitle = (role: Role): string => {
  if (role.code === 'docente') return 'Docencia';
  if (role.code === 'coordinador') return 'Coordinación';
  if (role.code === 'bibliotecario') return 'Biblioteca';
  if (role.code === 'administrador') return 'Administración';
  return scopeTitle(role);
};
const scopeDescription = (role: Role): string => {
  if (role.code === 'docente' || role.code === 'coordinador') return role.career_name ?? 'Carrera asignada';
  if (role.code === 'bibliotecario') return 'Bibliografía de todas las carreras';
  if (role.code === 'administrador') return 'Todo el sistema';
  return role.career_name ?? roleLabel(role.code);
};
const actionLabel = (role: Role): string => {
  if (role.code === 'coordinador') return 'Cambiar a esta carrera';
  if (role.code === 'docente') return 'Cambiar a docencia';
  if (role.code === 'bibliotecario') return 'Cambiar a Biblioteca';
  return `Cambiar a ${roleLabel(role.code)}`;
};

const select = async (roleAssignmentId: string): Promise<void> => {
  if (roleAssignmentId === activeRole.value?.id || pendingRoleId.value) return;
  pendingRoleId.value = roleAssignmentId;
  error.value = null;
  try {
    const session = await selectActiveRole(roleAssignmentId);
    sessionState.replace(session);
    open.value = false;
    await router.push(roleEntry(session.active_role?.code));
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el ámbito de trabajo.';
  } finally {
    pendingRoleId.value = null;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent :aria-describedby="undefined" class="flex max-h-(--overlay-max-height) flex-col overflow-hidden sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <ScrollArea class="min-h-0 flex-1">
          <div class="flex flex-col gap-4 p-1">
            <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
            <div class="grid gap-4 sm:grid-cols-2">
              <Card v-for="role in roles" :key="role.id" class="h-full">
                <CardHeader>
                  <CardTitle>{{ cardTitle(role) }}</CardTitle>
                  <CardDescription>{{ scopeDescription(role) }}</CardDescription>
                  <CardAction v-if="activeRole?.id === role.id"><Badge variant="secondary"><CheckCircle2 aria-hidden="true" />Activo</Badge></CardAction>
                </CardHeader>
                <CardFooter class="mt-auto"><Button v-if="activeRole?.id === role.id" type="button" variant="secondary" class="w-full" disabled>Carrera o rol actual</Button><Button v-else type="button" class="w-full" :disabled="pendingRoleId !== null" @click="select(role.id)"><Spinner v-if="pendingRoleId === role.id" data-icon="inline-start" /><ArrowRight v-else data-icon="inline-start" aria-hidden="true" />{{ actionLabel(role) }}</Button></CardFooter>
              </Card>
            </div>
          </div>
      </ScrollArea>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
