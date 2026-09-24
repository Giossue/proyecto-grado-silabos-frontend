<script setup lang="ts">
import { Download, FileSignature, RefreshCw, ShieldCheck } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { downloadSignaturePdf, getSignatureStatus, submitSignature, type SignatureRole, type SignatureStatus } from '@/api/signatures';
import PasswordInput from '@/components/PasswordInput.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

/**
 * I-139. Tarjeta «Firma electrónica» de una revisión aprobada. La firma se hace en este
 * navegador: el archivo .p12/.pfx y su clave solo se leen en memoria y nunca se envían.
 */
const props = withDefaults(defineProps<{ revisionId: string; fileName?: string }>(), { fileName: 'silabo' });

const status = ref<SignatureStatus | null>(null);
const loadError = ref<string | null>(null);
const loading = ref(true);
const open = ref(false);
const certificate = ref<File | null>(null);
const password = ref('');
const signing = ref(false);
const downloading = ref(false);
const errors = ref<{ certificate?: string; password?: string; general?: string }>({});
const stale = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const roleLabel = (role: SignatureRole): string => role === 'docente' ? 'Docente' : 'Coordinación';
const stateLabel = computed(() => ({
  sin_documento: 'Sin PDF',
  pendiente_docente: 'Pendiente docente',
  pendiente_coordinacion: 'Pendiente coordinación',
  firmado: 'Firmado',
  anulado: 'Anulado',
})[status.value?.state ?? 'sin_documento']);
const description = computed(() => {
  switch (status.value?.state) {
    case 'sin_documento': return 'Genere primero el PDF de la revisión aprobada en «Documentos».';
    case 'pendiente_docente': return status.value.can_sign ? 'Le corresponde firmar el sílabo aprobado.' : 'Primero firma el docente del sílabo.';
    case 'pendiente_coordinacion': return status.value.can_sign ? 'El docente ya firmó. Le corresponde firmar a coordinación.' : 'El docente ya firmó. Falta la firma de coordinación.';
    case 'firmado': return 'El sílabo tiene la firma del docente y de coordinación.';
    case 'anulado': return 'El sílabo fue reabierto: esta revisión ya no se firma. Se firmará la nueva revisión aprobada.';
    default: return 'Estado de la firma de la revisión aprobada.';
  }
});
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const load = async (): Promise<void> => {
  loading.value = true;
  loadError.value = null;
  try { status.value = await getSignatureStatus(props.revisionId); }
  catch (reason) { loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo consultar la firma electrónica.'; }
  finally { loading.value = false; }
};

const resetForm = (): void => {
  certificate.value = null;
  password.value = '';
  errors.value = {};
  stale.value = false;
  if (fileInput.value) fileInput.value.value = '';
};
watch(open, (value) => { if (!value) resetForm(); });

const pickCertificate = (event: Event): void => {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  certificate.value = file;
  errors.value = { ...errors.value, certificate: undefined };
};

const save = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

const download = async (): Promise<void> => {
  downloading.value = true;
  try {
    const signed = (status.value?.signatures.length ?? 0) > 0;
    save(await downloadSignaturePdf(props.revisionId), `${props.fileName}${signed ? '-firmado' : ''}.pdf`);
  } catch (reason) {
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudo descargar el PDF.');
  } finally { downloading.value = false; }
};

const sign = async (): Promise<void> => {
  errors.value = {};
  stale.value = false;
  if (!certificate.value) { errors.value = { certificate: 'Seleccione su archivo de firma .p12 o .pfx.' }; return; }
  if (!password.value) { errors.value = { password: 'Escriba la clave de su firma electrónica.' }; return; }
  const role = status.value?.my_role;
  if (!role) return;
  signing.value = true;
  try {
    // El módulo de firma (node-forge, pdf-lib) se carga solo al firmar.
    const [{ signPdf, sha256Hex }, { SignatureError }] = await Promise.all([import('@/lib/signature/signPdf'), import('@/lib/signature/certificate')]);
    try {
      const p12 = new Uint8Array(await certificate.value.arrayBuffer());
      const pdf = new Uint8Array(await (await downloadSignaturePdf(props.revisionId)).arrayBuffer());
      const base = await sha256Hex(pdf);
      const result = await signPdf({ pdf, p12, password: password.value, stamp: status.value?.stamp ?? null, role });
      const response = await submitSignature(props.revisionId, new Blob([result.pdf as BlobPart], { type: 'application/pdf' }), base);
      open.value = false;
      toast.success(response.message);
      await load();
    } catch (reason) {
      if (reason instanceof SignatureError) {
        if (reason.code === 'wrong_password') errors.value = { password: reason.message };
        else if (['invalid_file', 'no_key', 'expired', 'not_yet_valid'].includes(reason.code)) errors.value = { certificate: reason.message };
        else errors.value = { general: reason.message };
      } else if (reason instanceof ApiError) {
        const message = reason.errors.signed_pdf?.[0] ?? reason.message;
        stale.value = /descárguelo de nuevo|cambió mientras|no parte del documento/i.test(message);
        errors.value = { general: message };
      } else {
        errors.value = { general: 'No se pudo firmar el documento. Intente de nuevo.' };
      }
    }
  } finally {
    signing.value = false;
  }
};

const retryWithFreshDocument = async (): Promise<void> => {
  await load();
  if (status.value?.can_sign) await sign();
  else { open.value = false; toast.info('El estado de la firma cambió. Revise la tarjeta de firma.'); }
};

onMounted(load);
</script>

<template>
  <Card data-testid="document-signature-card">
    <CardHeader>
      <div class="flex items-start justify-between gap-3">
        <CardTitle>Firma electrónica</CardTitle>
        <Badge v-if="status" :variant="status.state === 'firmado' ? 'default' : status.state === 'anulado' ? 'destructive' : 'secondary'">{{ stateLabel }}</Badge>
      </div>
      <CardDescription>{{ loading && !status ? 'Consultando el estado de la firma…' : description }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <Alert v-if="loadError" variant="destructive"><AlertDescription class="flex flex-wrap items-center justify-between gap-3"><span>{{ loadError }}</span><Button size="sm" variant="outline" @click="load">Reintentar</Button></AlertDescription></Alert>
      <template v-if="status">
        <ol v-if="status.signatures.length" class="flex flex-col gap-2">
          <li v-for="item in status.signatures" :key="item.role" class="flex items-start gap-2 rounded-md border p-3 text-sm">
            <ShieldCheck class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div class="min-w-0"><p class="font-medium">{{ roleLabel(item.role) }}: {{ item.certificate_holder }}</p><p class="text-muted-foreground">{{ item.signer }} · {{ formatDate(item.signed_at) }}</p></div>
          </li>
        </ol>
        <div class="flex flex-wrap gap-2">
          <Button v-if="status.can_sign" @click="open = true"><FileSignature data-icon="inline-start" aria-hidden="true" />Firmar electrónicamente</Button>
          <Button v-if="status.artifact_id && status.state !== 'sin_documento'" variant="outline" :disabled="downloading" @click="download"><Spinner v-if="downloading" data-icon="inline-start" /><Download v-else data-icon="inline-start" aria-hidden="true" />{{ status.signatures.length ? 'Descargar PDF firmado' : 'Descargar PDF' }}</Button>
        </div>
      </template>
    </CardContent>
  </Card>

  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Firmar electrónicamente</DialogTitle>
        <DialogDescription>Se firma en este equipo. Su archivo de firma y su clave no se envían ni se guardan: solo se sube el PDF ya firmado.</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="sign">
        <Field :data-invalid="Boolean(errors.certificate)">
          <FieldLabel for="signature-certificate" required>Archivo de firma (.p12 o .pfx)</FieldLabel>
          <input id="signature-certificate" ref="fileInput" type="file" accept=".p12,.pfx,application/x-pkcs12" :aria-invalid="Boolean(errors.certificate)" class="h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-control file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium aria-invalid:border-destructive" @change="pickCertificate" />
          <FieldDescription>El archivo que le entregó la entidad emisora (Banco Central, Security Data u otra).</FieldDescription>
          <FieldError v-if="errors.certificate" :errors="[errors.certificate]" />
        </Field>
        <Field :data-invalid="Boolean(errors.password)">
          <FieldLabel for="signature-password" required>Clave de la firma</FieldLabel>
          <PasswordInput id="signature-password" v-model="password" autocomplete="off" :aria-invalid="Boolean(errors.password)" />
          <FieldError v-if="errors.password" :errors="[errors.password]" />
        </Field>
        <Alert v-if="errors.general" variant="destructive">
          <AlertTitle>No se registró la firma</AlertTitle>
          <AlertDescription class="flex flex-col gap-3"><span>{{ errors.general }}</span><Button v-if="stale" type="button" size="sm" variant="outline" class="self-start" :disabled="signing" @click="retryWithFreshDocument"><RefreshCw data-icon="inline-start" aria-hidden="true" />Volver a descargar y firmar</Button></AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="signing">Cancelar</Button></DialogClose>
          <Button type="submit" :disabled="signing"><Spinner v-if="signing" data-icon="inline-start" /><FileSignature v-else data-icon="inline-start" aria-hidden="true" />{{ signing ? 'Firmando…' : 'Firmar' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
