/** Escribe la frase de confirmación en un diálogo (montado en document.body). */
export const typeConfirmation = (id: string, phrase: string): void => {
  const input = document.body.querySelector<HTMLInputElement>(`#${id}`);
  if (!input) throw new Error(`No está el campo de confirmación #${id}`);
  input.value = phrase;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
