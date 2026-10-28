import { flushPromises } from '@vue/test-utils';
import { vi } from 'vitest';

export const fillSignatureDialog = async (p12: Uint8Array, password: string): Promise<void> => {
  const file = document.querySelector<HTMLInputElement>('#signature-certificate')!;
  Object.defineProperty(file, 'files', { value: [new File([p12 as BlobPart], 'firma.p12')], configurable: true });
  file.dispatchEvent(new Event('change'));
  const secret = document.querySelector<HTMLInputElement>('#signature-password')!;
  secret.value = password;
  secret.dispatchEvent(new Event('input'));
  await flushPromises();
};

const submitButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('[data-testid="signature-form"] button[type="submit"]');

export const confirmSignatureDialog = async (): Promise<void> => {
  document.querySelector<HTMLFormElement>('[data-testid="signature-form"]')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  await vi.waitFor(() => {
    if (submitButton()?.disabled) throw new Error('La firma sigue en curso.');
  }, { timeout: 10_000, interval: 10 });
  await flushPromises();
};
