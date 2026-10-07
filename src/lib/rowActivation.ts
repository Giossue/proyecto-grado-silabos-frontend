const INTERACTIVE = 'a,button,input,select,textarea,label,[role="menuitem"],[role="combobox"],[data-slot="table-actions"]';

/** Ejecuta la acción principal de una fila salvo que el clic venga de un control interno. */
export const activateRow = (event: Event, action: () => void): void => {
  const target = event.target;
  if (target instanceof Element && target.closest(INTERACTIVE) !== null) return;
  action();
};
