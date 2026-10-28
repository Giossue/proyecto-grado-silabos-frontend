<script setup lang="ts">
import { FileSignature } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import type { SignaturePayload } from '@/api/signatures';
import PasswordInput from '@/components/PasswordInput.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

export type StatementSigner = (statement: string) => SignaturePayload;

const props = defineProps<{
  title: string;
  description: string;
  confirmLabel: string;
  run: (sign: StatementSigner) => Promise<void>;
}>();

const open = defineModel<boolean>('open', { default: false });
const certificate = ref<File | null>(null);
const password = ref('');
const working = ref(false);
const errors = ref<{ certificate?: string; password?: string; general?: string }>({});
const fileInput = ref<InstanceType<typeof Input> | null>(null);

const CERTIFICATE_CODES = ['invalid_file', 'no_key', 'expired', 'not_yet_valid'];

watch(open, (value) => {
  if (value) return;
  certificate.value = null;
  password.value = '';
  errors.value = {};
  fileInput.value?.clear();
});

const pickCertificate = (event: Event): void => {
  certificate.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  errors.value = { ...errors.value, certificate: undefined };
};

const submit = async (): Promise<void> => {
  errors.value = {};
  if (!certificate.value) { errors.value = { certificate: 'Elija su archivo .p12 o .pfx.' }; return; }
  if (!password.value) { errors.value = { password: 'Escriba la clave de su firma.' }; return; }
  working.value = true;
  try {
    const [{ signStatement }, { readCertificate, SignatureError }] = await Promise.all([
      import('@/lib/signature/signStatement'),
      import('@/lib/signature/certificate'),
    ]);
    const p12 = new Uint8Array(await certificate.value.arrayBuffer());
    const key = password.value;
    try {
      readCertificate(p12, key);
      await props.run((statement) => signStatement({ statement, p12, password: key }).signature);
      open.value = false;
    } catch (reason) {
      if (reason instanceof SignatureError) {
        if (reason.code === 'wrong_password') errors.value = { password: reason.message };
        else if (CERTIFICATE_CODES.includes(reason.code)) errors.value = { certificate: reason.message };
        else errors.value = { general: reason.message };
      } else if (reason instanceof ApiError) {
        const signatureError = Object.entries(reason.errors).find(([key]) => key === 'signature' || key.startsWith('signature.'))?.[1][0];
        errors.value = { general: signatureError ?? reason.message };
      } else {
        errors.value = { general: 'No se pudo firmar. Intente de nuevo.' };
      }
    }
  } finally {
    working.value = false;
  }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" data-testid="signature-form" @submit.prevent="submit">
        <Field :data-invalid="Boolean(errors.certificate)">
          <FieldLabel for="signature-certificate" required>Archivo de firma (.p12 o .pfx)</FieldLabel>
          <Input id="signature-certificate" ref="fileInput" type="file" accept=".p12,.pfx,application/x-pkcs12" :aria-invalid="Boolean(errors.certificate)" @change="pickCertificate" />
          <FieldError v-if="errors.certificate" :errors="[errors.certificate]" />
        </Field>
        <Field :data-invalid="Boolean(errors.password)">
          <FieldLabel for="signature-password" required>Clave de la firma</FieldLabel>
          <PasswordInput id="signature-password" v-model="password" autocomplete="off" :aria-invalid="Boolean(errors.password)" />
          <FieldError v-if="errors.password" :errors="[errors.password]" />
        </Field>
        <p class="text-sm text-muted-foreground">Su archivo y su clave no salen de este equipo.</p>
        <Alert v-if="errors.general" variant="destructive" role="alert"><AlertDescription>{{ errors.general }}</AlertDescription></Alert>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="working">Cancelar</Button></DialogClose>
          <Button type="submit" :disabled="working"><Spinner v-if="working" data-icon="inline-start" /><FileSignature v-else data-icon="inline-start" aria-hidden="true" />{{ confirmLabel }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
