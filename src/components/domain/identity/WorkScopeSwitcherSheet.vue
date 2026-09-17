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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';

const open = defineModel<boolean>('open', { default: false });
const router = useRouter();
const pendingRoleId = ref<string | null>(null);
const error = ref<string | null>(null);
const roles = computed(() => sessionState.current.value?.available_roles ?? []);
const activeRole = computed(() => sessionState.current.value?.active_role ?? null);
const coordinatorCareerCount = computed(() => roles.value.filter((role) => role.code === 'coordinador').length);
const title = computed(() => coordinatorCareerCount.value > 1 ? 'Cambiar carrera' : 'Cambiar ámbito de trabajo');
const roleLabel = (code: string): string => ({ administrador: 'Administrador', coordinador: 'Coordinador', docente: 'Docente' })[code] ?? code;
const scopeName = (role: (typeof roles.value)[number]): string => role.career_name ?? roleLabel(role.code);
const scopeDescription = (role: (typeof roles.value)[number]): string => {
  if (role.code === 'coordinador') return `Coordinación de ${role.career_name ?? 'la carrera asignada'}`;
  return role.career_name ? `${roleLabel(role.code)} · ${role.career_name}` : 'Administración general del sistema';
};

const select = async (roleAssignmentId: string): Promise<void> => {
  if (roleAssignmentId === activeRole.value?.id || pendingRoleId.value) return;
  pendingRoleId.value = roleAssignmentId;
  error.value = null;
  try {
    sessionState.replace(await selectActiveRole(roleAssignmentId));
    open.value = false;
    await router.push('/dashboard');
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el ámbito de trabajo.';
  } finally {
    pendingRoleId.value = null;
  }
};
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="flex w-full flex-col sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription>Elija una carrera o rol vigente. Todo el sistema cambiará al nuevo alcance.</SheetDescription>
      </SheetHeader>
      <div class="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <Card v-for="role in roles" :key="role.id">
          <CardHeader>
            <CardTitle>{{ scopeName(role) }}</CardTitle>
            <CardDescription>{{ scopeDescription(role) }}</CardDescription>
            <CardAction><Badge v-if="activeRole?.id === role.id" variant="secondary"><CheckCircle2 aria-hidden="true" />Actual</Badge><Badge v-else variant="outline">{{ roleLabel(role.code) }}</Badge></CardAction>
          </CardHeader>
          <CardContent><p class="flex items-center gap-2 text-sm text-muted-foreground"><Building2 aria-hidden="true" />{{ role.career_name ?? 'Ámbito institucional sin carrera específica' }}</p></CardContent>
          <CardFooter><Button v-if="activeRole?.id === role.id" type="button" variant="secondary" class="w-full" disabled>Carrera o rol actual</Button><Button v-else type="button" class="w-full" :disabled="pendingRoleId !== null" @click="select(role.id)"><Spinner v-if="pendingRoleId === role.id" data-icon="inline-start" /><ArrowRight v-else data-icon="inline-start" aria-hidden="true" />Cambiar a {{ scopeName(role) }}</Button></CardFooter>
        </Card>
      </div>
    </SheetContent>
  </Sheet>
</template>
