<script setup lang="ts">
import { ArrowRight, Building2, CheckCircle2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { selectActiveRole } from '@/api/session';
import { sessionState } from '@/state/session';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { roleEntry } from '@/lib/routes';
import { LIBRARY_SCOPE, roleLabel } from '@/lib/roles';

const open = defineModel<boolean>('open', { default: false });
const router = useRouter();
const pendingRoleId = ref<string | null>(null);
const error = ref<string | null>(null);
const roles = computed(() => sessionState.current.value?.available_roles ?? []);
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
const coordinatorCareerCount = computed(() => roles.value.filter((role) => role.code === 'coordinador').length);
const title = computed(() => coordinatorCareerCount.value > 1 ? 'Cambiar carrera' : 'Cambiar ámbito de trabajo');
type Role = (typeof roles.value)[number];
const scopeName = (role: Role): string => role.code === 'bibliotecario' ? 'Biblioteca' : role.career_name ?? roleLabel(role.code);
const scopeDescription = (role: Role): string => {
  if (role.code === 'coordinador') return `Coordinación de ${role.career_name ?? 'la carrera asignada'}`;
  if (role.code === 'bibliotecario') return LIBRARY_SCOPE;
  if (role.career_name) return `${roleLabel(role.code)} · ${role.career_name}`;
  return role.code === 'administrador' ? 'Administración general del sistema' : roleLabel(role.code);
};
const scopeArea = (role: Role): string => role.career_name ?? (role.code === 'bibliotecario' ? 'Toda la universidad' : 'Ámbito institucional sin carrera específica');

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
    <DialogContent class="flex max-h-(--overlay-max-height) flex-col overflow-hidden sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>Elija una carrera o rol vigente. Todo el sistema cambiará al nuevo alcance.</DialogDescription>
      </DialogHeader>
      <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <div class="grid gap-4 sm:grid-cols-2">
          <Card v-for="role in roles" :key="role.id" class="h-full">
            <CardHeader>
              <CardTitle>{{ scopeName(role) }}</CardTitle>
              <CardDescription>{{ scopeDescription(role) }}</CardDescription>
              <CardAction><Badge v-if="activeRole?.id === role.id" variant="secondary"><CheckCircle2 aria-hidden="true" />Actual</Badge><Badge v-else variant="outline">{{ roleLabel(role.code) }}</Badge></CardAction>
            </CardHeader>
            <CardContent><p class="flex items-center gap-2 text-sm text-muted-foreground"><Building2 aria-hidden="true" />{{ scopeArea(role) }}</p></CardContent>
            <CardFooter class="mt-auto"><Button v-if="activeRole?.id === role.id" type="button" variant="secondary" class="w-full" disabled>Carrera o rol actual</Button><Button v-else type="button" class="w-full" :disabled="pendingRoleId !== null" @click="select(role.id)"><Spinner v-if="pendingRoleId === role.id" data-icon="inline-start" /><ArrowRight v-else data-icon="inline-start" aria-hidden="true" />Cambiar a {{ scopeName(role) }}</Button></CardFooter>
          </Card>
        </div>
      </div>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
