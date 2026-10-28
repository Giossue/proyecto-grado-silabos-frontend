<script setup lang="ts">
import StatusBadge, { type StatusTone } from '@/components/domain/StatusBadge.vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { listScreenHelp, type ScreenHelp } from '@/api/screen-help';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import ScreenHelpEditSheet from '@/components/domain/identity/ScreenHelpEditSheet.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { helpScreens, type HelpScreen } from '@/lib/helpScreens';
import { toast } from '@/lib/toast';
import { screenHelpState } from '@/state/screenHelp';

const helps = ref<ScreenHelp[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const selected = ref<HelpScreen | null>(null);
const editing = ref(false);
const byScreen = computed(() => new Map(helps.value.map((help) => [help.screen, help])));
const selectedHelp = computed(() => (selected.value ? byScreen.value.get(selected.value.key) ?? null : null));

// «Listo» solo cuando la ayuda se ve en la pantalla; sin texto u oculta queda «Pendiente».
const isReady = (screen: HelpScreen): boolean => byScreen.value.get(screen.key)?.active === true;
const toneOf = (screen: HelpScreen): StatusTone => (isReady(screen) ? 'success' : 'warning');
const statusOf = (screen: HelpScreen): string => (isReady(screen) ? 'Listo' : 'Pendiente');

const load = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
        helps.value = (await listScreenHelp()).help;
    } catch (reason) {
        error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la ayuda.';
    } finally {
        loading.value = false;
    }
};
const edit = (screen: HelpScreen): void => { selected.value = screen; editing.value = true; };
const saved = async (message: string): Promise<void> => { toast.success(message); await Promise.all([load(), screenHelpState.load()]); };

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Ayuda de pantallas" description="Textos de ayuda que se ven en el botón flotante de cada pantalla." size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading && helps.length === 0" variant="table-body" :columns="3" :actions="false" :pagination="false" />
    <template v-else>
      <Table label="Ayuda de pantallas">
        <TableHeader><TableRow><TableHead>Pantalla</TableHead><TableHead>Rol</TableHead><TableHead class="text-center">Ayuda</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="screen in helpScreens" :key="screen.key" class="cursor-pointer" tabindex="0" :aria-label="`Editar la ayuda de ${screen.label}`" @click="edit(screen)" @keydown.enter.self.prevent="edit(screen)" @keydown.space.self.prevent="edit(screen)">
            <TableCell>{{ screen.label }}</TableCell>
            <TableCell>{{ screen.roleLabel }}</TableCell>
            <TableCell class="text-center"><StatusBadge :label="statusOf(screen)" :tone="toneOf(screen)" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </template>
    <ScreenHelpEditSheet v-if="selected" v-model:open="editing" :screen="selected" :help="selectedHelp" @saved="saved" />
  </PageFrame>
</template>
