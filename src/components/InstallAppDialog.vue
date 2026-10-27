<script setup lang="ts">
import { Download, Share } from '@lucide/vue';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';
import { installAppState } from '@/state/installApp';

const open = defineModel<boolean>('open', { required: true });
const { canPrompt } = installAppState;
const platform = installAppState.platform();
const installing = ref(false);

const install = async (): Promise<void> => {
  installing.value = true;
  try {
    if (await installAppState.install()) {
      open.value = false;
      toast.success('Sílabos UEB quedó instalado.');
    }
  } finally {
    installing.value = false;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Instalar Sílabos UEB</DialogTitle>
        <DialogDescription>Agregue el sistema a su celular o computadora para abrirlo como una aplicación, con su propio ícono y sin la barra del navegador. Necesita internet para trabajar.</DialogDescription>
      </DialogHeader>
      <p v-if="canPrompt" class="text-sm">Pulse «Instalar» y confirme en el aviso del navegador.</p>
      <ol v-else-if="platform === 'ios'" class="flex list-decimal flex-col gap-2 pl-5 text-sm">
        <li>Abra el sistema en Safari.</li>
        <li>Pulse el botón Compartir <Share class="inline size-4 align-text-bottom" aria-label="Compartir" />.</li>
        <li>Elija «Agregar a pantalla de inicio» y pulse «Agregar».</li>
      </ol>
      <div v-else class="flex flex-col gap-2 text-sm">
        <p>Este navegador no ofrece la instalación desde aquí.</p>
        <ul class="flex list-disc flex-col gap-2 pl-5">
          <li>En Chrome o Edge, use «Instalar» en la barra de direcciones o en el menú ⋮.</li>
          <li>En Safari de Mac, use Archivo → «Agregar al Dock».</li>
        </ul>
      </div>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
        <Button v-if="canPrompt" type="button" :disabled="installing" @click="install"><Spinner v-if="installing" data-icon="inline-start" /><Download v-else data-icon="inline-start" aria-hidden="true" />Instalar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
